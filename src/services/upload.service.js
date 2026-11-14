import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 МБ
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Определяем формат по «магическим» первым байтам файла, а не по заголовку Content-Type:
// заголовок задаёт клиент, и ему нельзя доверять.
function sniff(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

export async function create(buffer, declaredType) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ApiError(415, `Загрузите изображение: ${ALLOWED_TYPES.join(', ')}`);
  }
  const actual = sniff(buffer);
  if (!actual) {
    throw new ApiError(415, 'Файл не похож на изображение JPEG, PNG или WebP');
  }
  if (actual !== declaredType) {
    throw ApiError.badRequest(`Тип файла (${actual}) не совпадает с заголовком Content-Type (${declaredType})`);
  }

  const upload = await prisma.upload.create({
    data: { mimeType: actual, size: buffer.length, data: buffer },
    select: { id: true, mimeType: true, size: true, createdAt: true },
  });
  return { ...upload, url: `/api/uploads/${upload.id}` };
}

export async function getById(id) {
  const upload = await prisma.upload.findUnique({ where: { id } });
  if (!upload) throw ApiError.notFound('Изображение не найдено');
  return upload;
}
