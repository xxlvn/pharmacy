import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as ctrl from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { registerBody, loginBody } from '../validators/schemas.js';
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

export default router;
