import { ApiError } from '../utils/ApiError.js';

// Проверяет body / query / params по Zod-схемам.
// Очищенные и приведённые к нужным типам данные кладёт в req.validated.
export function validate(schemas) {
  return (req, res, next) => {
    req.validated = {};
    const errors = [];

    for (const part of ['params', 'query', 'body']) {
      const schema = schemas[part];
      if (!schema) continue;

      const result = schema.safeParse(req[part] ?? {});
      if (result.success) {
        req.validated[part] = result.data;
      } else {
        for (const issue of result.error.issues) {
          errors.push({
            location: part,
            field: issue.path.join('.') || part,
            message: issue.message,
          });
        }
      }
    }

    if (errors.length > 0) {
      throw ApiError.badRequest('Ошибка валидации данных', errors);
    }
    next();
  };
}
