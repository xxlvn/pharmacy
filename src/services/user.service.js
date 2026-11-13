import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { publicUserSelect } from '../utils/publicUser.js';

export function list() {
  return prisma.user.findMany({
    orderBy: { id: 'asc' },
    select: { ...publicUserSelect, _count: { select: { orders: true } } },
  });
}

export async function changeRole(currentUser, id, role) {
  if (currentUser.id === id) {
    throw ApiError.conflict('Нельзя изменить собственную роль');
  }
  await ensureExists(id);
  return prisma.user.update({ where: { id }, data: { role }, select: publicUserSelect });
}

export async function remove(currentUser, id) {
  if (currentUser.id === id) {
    throw ApiError.conflict('Нельзя удалить собственную учётную запись');
  }
  await ensureExists(id);
  await prisma.user.delete({ where: { id } });
}

async function ensureExists(id) {
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) throw ApiError.notFound('Пользователь не найден');
}
