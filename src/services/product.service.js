import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

const categorySelect = { select: { id: true, name: true, slug: true } };

const SORTS = {
  name: { name: 'asc' },
  price_asc: { price: 'asc' },
  price_desc: { price: 'desc' },
  newest: { createdAt: 'desc' },
};

export async function list(query) {
  const { search, categoryId, inStock, prescription, minPrice, maxPrice, sort, page, limit } = query;

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw ApiError.badRequest('minPrice не может быть больше maxPrice');
  }

  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { manufacturer: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;
  if (inStock === true) where.stock = { gt: 0 };
  if (inStock === false) where.stock = 0;
  if (prescription !== undefined) where.requiresPrescription = prescription;
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) where.price.gte = minPrice;
    if (maxPrice !== undefined) where.price.lte = maxPrice;
  }

  const [total, items] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [SORTS[sort], { id: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: { category: categorySelect },
    }),
  ]);

  return {
    data: items,
    meta: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

// Связанный запрос: товар вместе с категорией (Prisma include).
export async function getById(id) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: categorySelect },
  });
  if (!product) throw ApiError.notFound('Товар не найден');
  return product;
}

export async function create(data) {
  await ensureCategory(data.categoryId);
  return prisma.product.create({ data, include: { category: categorySelect } });
}

export async function update(id, data) {
  await getById(id);
  if (data.categoryId !== undefined) await ensureCategory(data.categoryId);
  return prisma.product.update({ where: { id }, data, include: { category: categorySelect } });
}

export async function remove(id) {
  await getById(id);
  const ordered = await prisma.orderItem.count({ where: { productId: id } });
  if (ordered > 0) {
    throw ApiError.conflict(
      'Нельзя удалить товар: он есть в оформленных заказах. Обнулите остаток, чтобы снять его с продажи',
    );
  }
  await prisma.product.delete({ where: { id } });
}

async function ensureCategory(categoryId) {
  const exists = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!exists) throw ApiError.badRequest(`Категория с id=${categoryId} не существует`);
}
