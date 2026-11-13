import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

export function list() {
  return prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });
}

// Связанный запрос: категория вместе со списком её товаров (Prisma include).
export async function getById(id) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      products: {
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          form: true,
          dosage: true,
          price: true,
          stock: true,
          requiresPrescription: true,
        },
      },
    },
  });
  if (!category) throw ApiError.notFound('Категория не найдена');
  return category;
}

export function create(data) {
  return prisma.category.create({ data });
}

export async function update(id, data) {
  await getExisting(id);
  return prisma.category.update({ where: { id }, data });
}

export async function remove(id) {
  await getExisting(id);
  const productsCount = await prisma.product.count({ where: { categoryId: id } });
  if (productsCount > 0) {
    throw ApiError.conflict(
      `Нельзя удалить категорию: в ней ${productsCount} товар(ов). Сначала перенесите или удалите их`,
    );
  }
  await prisma.category.delete({ where: { id } });
}

async function getExisting(id) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw ApiError.notFound('Категория не найдена');
  return category;
}
