import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { publicUserSelect, toPublicUser } from '../utils/publicUser.js';

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
