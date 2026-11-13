import { Router } from 'express';
import * as ctrl from '../controllers/order.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { idParams, orderCreateBody, orderStatusBody, orderListQuery } from '../validators/schemas.js';

const router = Router();

// Все маршруты заказов требуют авторизации.
router.use(requireAuth);

router.get('/', validate({ query: orderListQuery }), ctrl.list);
router.get('/:id', validate({ params: idParams }), ctrl.getById);
router.post('/', validate({ body: orderCreateBody }), ctrl.create);
router.patch('/:id/cancel', validate({ params: idParams }), ctrl.cancel);
router.patch('/:id/status', requireRole('ADMIN'), validate({ params: idParams, body: orderStatusBody }), ctrl.updateStatus);

export default router;
