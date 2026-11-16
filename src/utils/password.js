import argon2 from 'argon2';
import { prisma } from '../config/prisma.js';
import { ApiError } from './ApiError.js';

// Проверка текущего пароля перед чувствительными действиями (смена почты, пароля, отключение 2FA).
// Ошибка — 400, а не 401: 401 клиент воспринимает как «сессия истекла» и выходит из аккаунта.
export async function assertPassword(userId, password) {
  const { passwordHash } = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!password || !(await argon2.verify(passwordHash, password))) {
    throw ApiError.badRequest('Неверный текущий пароль', [
      { location: 'body', field: 'currentPassword', message: 'Неверный текущий пароль' },
    ]);
  }
}
