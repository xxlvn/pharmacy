import { Router } from 'express';
import * as ctrl from '../controllers/category.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { idParams, categoryCreateBody, categoryUpdateBody } from '../validators/schemas.js';

const router = Router();
const adminOnly = [requireAuth, requireRole('ADMIN')];

router.get('/', ctrl.list);
router.get('/:id', validate({ params: idParams }), ctrl.getById);
router.post('/', ...adminOnly, validate({ body: categoryCreateBody }), ctrl.create);
router.patch('/:id', ...adminOnly, validate({ params: idParams, body: categoryUpdateBody }), ctrl.update);
router.delete('/:id', ...adminOnly, validate({ params: idParams }), ctrl.remove);

export default router;
