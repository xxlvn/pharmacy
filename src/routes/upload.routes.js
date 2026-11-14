import express, { Router } from 'express';
import * as ctrl from '../controllers/upload.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { idParams } from '../validators/schemas.js';
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES } from '../services/upload.service.js';

const router = Router();

// Загрузка фото товара: тело запроса — сам файл (не JSON), Content-Type: image/jpeg | image/png | image/webp.
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  express.raw({ type: ALLOWED_TYPES, limit: MAX_UPLOAD_BYTES }),
  ctrl.create,
);

// Отдача фото: публично, чтобы картинки были видны в каталоге всем посетителям.
router.get('/:id', validate({ params: idParams }), ctrl.getById);

export default router;
