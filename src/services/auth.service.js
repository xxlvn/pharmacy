import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { publicUserSelect, toPublicUser } from '../utils/publicUser.js';
import * as uploadService from './upload.service.js';
import * as twofa from './twofa.service.js';
import { sendMail, resetPasswordEmail } from './mail.service.js';
import { assertPassword } from '../utils/password.js';
import { sha256 } from '../utils/secretBox.js';
import { randomBytes } from 'node:crypto';

// Параметры Argon2id (рекомендации OWASP: 19 MiB памяти, 2 итерации).
const HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

// Хеш-«пустышка»: проверяем пароль даже для несуществующего email,
// чтобы по времени ответа нельзя было понять, зарегистрирован ли адрес.
const dummyHashPromise = argon2.hash('dummy-password-for-timing', HASH_OPTIONS);

export function hashPassword(password) {
  return argon2.hash(password, HASH_OPTIONS);
}

function signToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, env.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: env.jwtExpiresIn,
  });
}

export async function register({ email, name, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw ApiError.conflict('Пользователь с таким email уже зарегистрирован');
  }

  const passwordHash = await hashPassword(password);

  // Роль всегда USER: публичная регистрация не может создать администратора.
  const user = await prisma.user.create({
    data: { email, name, passwordHash, role: 'USER' },
    select: publicUserSelect,
  });

  return { user, accessToken: signToken(user) };
}

// Смена имени и/или почты текущего пользователя.
export async function updateProfile(userId, { name, email, currentPassword }) {
  const current = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  const data = {};
  if (name !== undefined) data.name = name;
  if (email !== undefined && email !== current.email) {
    // Почта — это логин, поэтому её смена требует подтверждения паролем
    await assertPassword(userId, currentPassword);
    const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (taken) throw ApiError.conflict('Пользователь с таким email уже зарегистрирован');
    data.email = email;
  }
  return prisma.user.update({ where: { id: userId }, data, select: publicUserSelect });
}

// Смена пароля. Все токены, выданные раньше, перестают действовать (см. requireAuth),
// а текущей сессии выдаётся новый токен, чтобы она не прервалась.
export async function changePassword(userId, { currentPassword, newPassword }) {
  await assertPassword(userId, currentPassword);
  if (currentPassword === newPassword) {
    throw ApiError.badRequest('Новый пароль совпадает с текущим', [
      { location: 'body', field: 'newPassword', message: 'Новый пароль совпадает с текущим' },
    ]);
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword), passwordChangedAt: nowSeconds() },
    select: publicUserSelect,
  });
  return { user, accessToken: signToken(user) };
}

// Секунды, без миллисекунд: в JWT время выдачи (iat) тоже в секундах
const nowSeconds = () => new Date(Math.floor(Date.now() / 1000) * 1000);

// ---------- Восстановление пароля по почте ----------

const RESET_TTL_MS = 30 * 60 * 1000;

// Отвечаем одинаково, есть такая почта или нет: по ответу нельзя узнать, кто зарегистрирован.
// В базе хранится только SHA-256 токена; сам токен есть лишь в письме.
export async function forgotPassword(email, { origin, lang }) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
  if (!user) return;
  const token = randomBytes(32).toString('base64url');
  await prisma.user.update({
    where: { id: user.id },
    data: { resetTokenHash: sha256(token), resetTokenExpires: new Date(Date.now() + RESET_TTL_MS) },
  });
  const link = `${env.appUrl || origin}/#/reset-password?token=${token}`;
  await sendMail({ to: user.email, ...resetPasswordEmail({ name: user.name, link, lang }) });
}

export async function resetPassword({ token, newPassword }) {
  const user = await prisma.user.findFirst({
    where: { resetTokenHash: sha256(token), resetTokenExpires: { gt: new Date() } },
    select: { id: true },
  });
  if (!user) throw ApiError.badRequest('Ссылка для сброса пароля недействительна или устарела. Запросите новую');
  // Токен одноразовый; все прежние сессии отключаются, как при обычной смене пароля
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      passwordChangedAt: nowSeconds(),
      resetTokenHash: null,
      resetTokenExpires: null,
    },
  });
}

// ---------- Вход в два шага при включённой 2FA ----------

// Короткий «пропуск» на второй шаг входа: 5 минут, годится только для /login/2fa
function signChallenge(user) {
  return jwt.sign({ sub: String(user.id), purpose: '2fa' }, env.jwtSecret, { algorithm: 'HS256', expiresIn: '5m' });
}

export async function loginTwoFactor({ challengeToken, code }) {
  let payload;
  try {
    payload = jwt.verify(challengeToken, env.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    throw ApiError.unauthorized('Время на ввод кода истекло, войдите снова');
  }
  if (payload.purpose !== '2fa') throw ApiError.unauthorized('Недействительный токен');
  const userId = Number(payload.sub);
  if (!(await twofa.verifyUserCode(userId, code))) throw ApiError.unauthorized('Неверный код');
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  return { user, accessToken: signToken(user) };
}

// Аватарка: файл сохраняется так же, как фото товаров (таблица uploads),
// а прежний файл пользователя удаляется, чтобы не копить мусор в базе.
export async function setAvatar(userId, buffer, declaredType) {
  const upload = await uploadService.create(buffer, declaredType);
  const before = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: upload.url },
    select: publicUserSelect,
  });
  if (before?.avatarUrl && before.avatarUrl !== upload.url) await uploadService.removeByUrl(before.avatarUrl);
  return user;
}

export async function removeAvatar(userId) {
  const before = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: null },
    select: publicUserSelect,
  });
  if (before?.avatarUrl) await uploadService.removeByUrl(before.avatarUrl);
  return user;
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });

  const hash = user?.passwordHash ?? (await dummyHashPromise);
  const valid = await argon2.verify(hash, password);

  if (!user || !valid) {
    // Одинаковое сообщение для неверного email и неверного пароля.
    throw ApiError.unauthorized('Неверный email или пароль');
  }

  // Включена 2FA: полноценный токен выдаётся только после кода из приложения
  if (user.totpEnabled) {
    return { twoFactorRequired: true, challengeToken: signChallenge(user) };
  }

  return { user: toPublicUser(user), accessToken: signToken(user) };
}
