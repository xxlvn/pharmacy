import * as uploadService from '../services/upload.service.js';

export async function create(req, res) {
  const declared = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  const upload = await uploadService.create(req.body, declared);
  res.status(201).json({ data: upload });
}

export async function getById(req, res) {
  const upload = await uploadService.getById(req.validated.params.id);
  // Загруженный файл никогда не меняется (новое фото получает новый id), поэтому кешируем надолго.
  res
    .set('Content-Type', upload.mimeType)
    .set('Content-Length', String(upload.size))
    .set('Cache-Control', 'public, max-age=31536000, immutable')
    .set('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'")
    .send(Buffer.from(upload.data)); // Prisma 6 отдаёт Bytes как Uint8Array
}
