import { Router } from 'express';
import * as ctrl from '../controllers/user.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { idParams, userRoleBody } from '../validators/schemas.js';

const router = Router();

// Управление пользователями — только администратор.
router.use(requireAuth, requireRole('ADMIN'));

router.get('/', ctrl.list);
router.patch('/:id/role', validate({ params: idParams, body: userRoleBody }), ctrl.changeRole);
router.delete('/:id', validate({ params: idParams }), ctrl.remove);

export default router;
