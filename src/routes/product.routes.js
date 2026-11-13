import { Router } from 'express';
import * as ctrl from '../controllers/product.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { idParams, productCreateBody, productUpdateBody, productListQuery } from '../validators/schemas.js';

const router = Router();
const adminOnly = [requireAuth, requireRole('ADMIN')];

router.get('/', validate({ query: productListQuery }), ctrl.list);
router.get('/:id', validate({ params: idParams }), ctrl.getById);
router.post('/', ...adminOnly, validate({ body: productCreateBody }), ctrl.create);
router.patch('/:id', ...adminOnly, validate({ params: idParams, body: productUpdateBody }), ctrl.update);
router.delete('/:id', ...adminOnly, validate({ params: idParams }), ctrl.remove);

export default router;
