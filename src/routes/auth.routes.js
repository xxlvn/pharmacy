import express, { Router } from 'express';
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES } from '../services/upload.service.js';
import rateLimit from 'express-rate-limit';
import * as ctrl from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { registerBody, loginBody, profileBody, passwordBody } from '../validators/schemas.js';
import { isTest } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const router = Router();

// Ограничение попыток входа/регистрации: защита от подбора паролей.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => isTest,
  handler: (req, res, next) => next(new ApiError(429, 'Слишком много попыток. Повторите через 15 минут')),
});

router.post('/register', authLimiter, validate({ body: registerBody }), ctrl.register);
router.post('/login', authLimiter, validate({ body: loginBody }), ctrl.login);
router.get('/me', requireAuth, ctrl.me);

// Смена имени/почты и пароля: под тем же ограничением попыток, что и вход,
// чтобы текущий пароль нельзя было подобрать через эти маршруты
router.patch('/me', requireAuth, authLimiter, validate({ body: profileBody }), ctrl.updateProfile);
router.patch('/me/password', requireAuth, authLimiter, validate({ body: passwordBody }), ctrl.changePassword);

// Аватарка текущего пользователя: тело запроса — сам файл (JPEG, PNG или WebP до 2 МБ)
router.put('/me/avatar', requireAuth, express.raw({ type: ALLOWED_TYPES, limit: MAX_UPLOAD_BYTES }), ctrl.setAvatar);
router.delete('/me/avatar', requireAuth, ctrl.removeAvatar);

export default router;
