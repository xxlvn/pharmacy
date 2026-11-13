import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError.js';
import { isProduction, isTest } from '../config/env.js';

// 404 для неизвестных маршрутов API.
export function notFound(req, res, next) {
  next(ApiError.notFound(`Маршрут ${req.method} ${req.originalUrl} не найден`));
}

// Централизованный обработчик ошибок.
// Все ответы об ошибках имеют единый формат: { error: { status, message, details? } }
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let error = err;

  // Некорректный JSON в теле запроса
  if (err.type === 'entity.parse.failed') {
    error = ApiError.badRequest('Тело запроса содержит некорректный JSON');
  } else if (err.type === 'entity.too.large') {
    error = new ApiError(413, 'Тело запроса слишком большое');
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    error = mapPrismaError(err);
  }

  if (!(error instanceof ApiError)) {
    // Непредвиденная ошибка: подробности пишем в лог сервера, клиенту — общий текст.
    if (!isTest) console.error(err);
    error = new ApiError(500, 'Внутренняя ошибка сервера');
  }

  const body = { error: { status: error.status, message: error.message } };
  if (error.details) body.error.details = error.details;
  if (!isProduction && error.status === 500 && err.message) body.error.debug = err.message;

  res.status(error.status).json(body);
}

function mapPrismaError(err) {
  switch (err.code) {
    case 'P2002': {
      const fields = [].concat(err.meta?.target ?? []).join(', ');
      return ApiError.conflict(`Запись с таким значением уже существует${fields ? ` (${fields})` : ''}`);
    }
    case 'P2003':
      return ApiError.conflict('Операция нарушает связь между записями (внешний ключ)');
    case 'P2025':
      return ApiError.notFound('Запись не найдена');
    default:
      return err;
  }
}
