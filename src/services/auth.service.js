import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { publicUserSelect, toPublicUser } from '../utils/publicUser.js';
import * as uploadService from './upload.service.js';

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

// Проверка текущего пароля перед чувствительными изменениями.
// Ошибка — 400, а не 401: 401 клиент воспринимает как «сессия истекла» и выходит из аккаунта.
async function assertPassword(userId, password) {
  const { passwordHash } = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!password || !(await argon2.verify(passwordHash, password))) {
    throw ApiError.badRequest('Неверный текущий пароль', [
      { location: 'body', field: 'currentPassword', message: 'Неверный текущий пароль' },
    ]);
  }
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
  // Секунды, без миллисекунд: в JWT время выдачи (iat) тоже в секундах
  const changedAt = new Date(Math.floor(Date.now() / 1000) * 1000);
  const user = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword), passwordChangedAt: changedAt },
    select: publicUserSelect,
  });
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

  return { user: toPublicUser(user), accessToken: signToken(user) };
}
