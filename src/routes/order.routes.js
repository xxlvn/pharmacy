import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as ctrl from '../controllers/order.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import {
  idParams,
  orderCreateBody,
  orderPayBody,
  orderStatusBody,
  orderListQuery,
  receiptQuery,
} from '../validators/schemas.js';
import { isTest } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const router = Router();

// Заказы без регистрации: не больше 15 за 15 минут с одного адреса, чтобы склад нельзя было «выкупить» ботом
const guestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => isTest || Boolean(req.user),
  handler: (req, res, next) => next(new ApiError(429, 'Слишком много заказов. Повторите через 15 минут')),
});

// --- Доступно и гостю, и вошедшему пользователю ---
// Гость подтверждает доступ к своему заказу ключом из ответа на создание:
// заголовок X-Order-Key или параметр ?key= (ссылка на квитанцию в письме).
router.post('/', optionalAuth, guestLimiter, validate({ body: orderCreateBody }), ctrl.create);
// Оплата картой: в теле только платёжная система и последние 4 цифры
router.post('/:id/pay', optionalAuth, validate({ params: idParams, body: orderPayBody }), ctrl.pay);
// PDF-квитанция оплаченного заказа
router.get('/:id/receipt', optionalAuth, validate({ params: idParams, query: receiptQuery }), ctrl.receipt);

// --- Только после входа ---
router.use(requireAuth);

router.get('/', validate({ query: orderListQuery }), ctrl.list);
router.get('/:id', validate({ params: idParams }), ctrl.getById);
router.patch('/:id/cancel', validate({ params: idParams }), ctrl.cancel);
router.patch('/:id/status', requireRole('ADMIN'), validate({ params: idParams, body: orderStatusBody }), ctrl.updateStatus);

export default router;
