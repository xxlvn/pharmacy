import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

// Допустимые переходы статусов заказа.
const TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

const orderInclude = {
  items: {
    orderBy: { id: 'asc' },
    include: {
      product: { select: { id: true, name: true, form: true, dosage: true, requiresPrescription: true } },
    },
  },
  user: { select: { id: true, name: true, email: true } },
};

// Создание заказа. Владелец — всегда req.user.id (userId из тела не принимается).
// Всё выполняется в одной транзакции: проверка наличия, списание остатков, создание заказа.
export async function create(userId, { items, address, phone, comment }) {
  return prisma.$transaction(async (tx) => {
    const ids = items.map((i) => i.productId);
    const products = await tx.product.findMany({ where: { id: { in: ids } } });
    const byId = new Map(products.map((p) => [p.id, p]));

    const missing = ids.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      throw ApiError.notFound(`Товары не найдены: id ${missing.join(', ')}`);
    }

    let total = 0;
    for (const item of items) {
      const product = byId.get(item.productId);

      // Условное списание: сработает только если остатка хватает.
      // Защищает от «гонки», когда два покупателя берут последний товар одновременно.
      const { count } = await tx.product.updateMany({
        where: { id: product.id, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (count === 0) {
        throw ApiError.conflict(
          `Недостаточно товара «${product.name}»: в наличии ${product.stock}, запрошено ${item.quantity}`,
        );
      }
      total += product.price * item.quantity;
    }

    return tx.order.create({
      data: {
        userId,
        address,
        phone,
        comment: comment || null,
        total,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            price: byId.get(i.productId).price,
          })),
        },
      },
      include: orderInclude,
    });
  });
}

// Пользователь видит только свои заказы, администратор — все.
export async function list(user, { status, page, limit }) {
  const where = {};
  if (user.role !== 'ADMIN') where.userId = user.id;
  if (status) where.status = status;

  const [total, data] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: orderInclude,
    }),
  ]);

  return { data, meta: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) } };
}

export async function getById(user, id) {
  const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
  if (!order) throw ApiError.notFound('Заказ не найден');
  assertCanAccess(user, order);
  return order;
}

// Отмена заказа владельцем: только пока он не подтверждён.
export async function cancel(user, id) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw ApiError.notFound('Заказ не найден');
  assertCanAccess(user, order);

  if (order.status !== 'PENDING' && user.role !== 'ADMIN') {
    throw ApiError.conflict('Отменить можно только заказ в статусе PENDING');
  }
  return changeStatus(order, 'CANCELLED');
}

// Смена статуса администратором.
export async function updateStatus(id, status) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw ApiError.notFound('Заказ не найден');
  return changeStatus(order, status);
}

async function changeStatus(order, nextStatus) {
  if (order.status === nextStatus) {
    throw ApiError.conflict(`Заказ уже в статусе ${nextStatus}`);
  }
  if (!TRANSITIONS[order.status].includes(nextStatus)) {
    throw ApiError.conflict(`Нельзя перевести заказ из ${order.status} в ${nextStatus}`);
  }

  return prisma.$transaction(async (tx) => {
    // При отмене возвращаем товары на склад.
    if (nextStatus === 'CANCELLED') {
      const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }
    return tx.order.update({ where: { id: order.id }, data: { status: nextStatus }, include: orderInclude });
  });
}

function assertCanAccess(user, order) {
  if (user.role !== 'ADMIN' && order.userId !== user.id) {
    throw ApiError.forbidden('Нет доступа к чужому заказу');
  }
}
