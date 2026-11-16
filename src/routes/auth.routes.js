import express, { Router } from 'express';
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES } from '../services/upload.service.js';
import rateLimit from 'express-rate-limit';
import * as ctrl from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import {
  registerBody,
  loginBody,
  profileBody,
  passwordBody,
  forgotBody,
  resetBody,
  twoFactorLoginBody,
  codeBody,
  disableTwoFactorBody,
} from '../validators/schemas.js';
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

// Письма о сбросе пароля: строже, чтобы через форму нельзя было засыпать чужой ящик
const mailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => isTest,
  handler: (req, res, next) => next(new ApiError(429, 'Слишком много запросов. Повторите через час')),
});

router.post('/register', authLimiter, validate({ body: registerBody }), ctrl.register);
router.post('/login', authLimiter, validate({ body: loginBody }), ctrl.login);
// Второй шаг входа, если включена 2FA: код из приложения или резервный код
router.post('/login/2fa', authLimiter, validate({ body: twoFactorLoginBody }), ctrl.loginTwoFactor);
router.get('/me', requireAuth, ctrl.me);

// Восстановление пароля по почте
router.post('/password/forgot', mailLimiter, validate({ body: forgotBody }), ctrl.forgotPassword);
router.post('/password/reset', authLimiter, validate({ body: resetBody }), ctrl.resetPassword);

// Смена имени/почты и пароля: под тем же ограничением попыток, что и вход,
// чтобы текущий пароль нельзя было подобрать через эти маршруты
router.patch('/me', requireAuth, authLimiter, validate({ body: profileBody }), ctrl.updateProfile);
router.patch('/me/password', requireAuth, authLimiter, validate({ body: passwordBody }), ctrl.changePassword);

// Аватарка текущего пользователя: тело запроса — сам файл (JPEG, PNG или WebP до 2 МБ)
router.put('/me/avatar', requireAuth, express.raw({ type: ALLOWED_TYPES, limit: MAX_UPLOAD_BYTES }), ctrl.setAvatar);
router.delete('/me/avatar', requireAuth, ctrl.removeAvatar);

// Двухфакторная защита (TOTP)
router.get('/2fa', requireAuth, ctrl.twoFactorStatus);
router.post('/2fa/setup', requireAuth, ctrl.twoFactorSetup);
router.post('/2fa/enable', requireAuth, authLimiter, validate({ body: codeBody }), ctrl.twoFactorEnable);
router.post('/2fa/disable', requireAuth, authLimiter, validate({ body: disableTwoFactorBody }), ctrl.twoFactorDisable);
router.post('/2fa/recovery-codes', requireAuth, authLimiter, validate({ body: codeBody }), ctrl.twoFactorRecovery);

export default router;
