import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { publicUserSelect } from '../utils/publicUser.js';

// Проверяет заголовок Authorization: Bearer <accessToken>.
// При успехе кладёт подтверждённого пользователя в req.user.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw ApiError.unauthorized('Требуется авторизация: передайте заголовок Authorization: Bearer <token>');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Срок действия токена истёк, войдите снова');
    }
    throw ApiError.unauthorized('Недействительный токен');
  }

  // Роль и само существование пользователя берём из БД, а не из токена:
  // если админ понизил роль или удалил пользователя, старый токен перестанет давать права.
  const user = await prisma.user.findUnique({
    where: { id: Number(payload.sub) },
    select: publicUserSelect,
  });

  if (!user) {
    throw ApiError.unauthorized('Пользователь не найден');
  }

  req.user = user;
  next();
}

// Пропускает только пользователей с одной из перечисленных ролей.
// Используется после requireAuth.
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized();
    }
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden('Доступ только для администратора');
    }
    next();
  };
}
