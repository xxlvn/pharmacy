import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as statsService from '../services/stats.service.js';

const router = Router();

const dashboardQuery = z.object({
  days: z.coerce.number().int().refine((d) => [7, 30, 90].includes(d), 'days: 7, 30 или 90').default(30),
});

// Сводка для панели администратора. Доступ: только admin.
router.get('/dashboard', requireAuth, requireRole('ADMIN'), validate({ query: dashboardQuery }), async (req, res) => {
  res.json({ data: await statsService.dashboard(req.validated.query.days) });
});

export default router;
