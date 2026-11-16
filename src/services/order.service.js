import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { sha256 } from '../utils/secretBox.js';

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
      product: { select: { id: true, name: true, form: true, dosage: true, imageUrl: true, requiresPrescription: true } },
    },
  },
  user: { select: { id: true, name: true, email: true } },
};

// Создание заказа. Владелец — всегда req.user.id (userId из тела не принимается);
// без входа заказ оформляется как гостевой (userId = null) на указанную почту.
// Всё выполняется в одной транзакции: проверка наличия, списание остатков, создание заказа.
// Возвращает заказ и ключ доступа к нему (показывается один раз, в базе — только хеш).
export async function create(user, { items, address, phone, comment, email }) {
  const contactEmail = email || user?.email;
  if (!contactEmail) {
    throw ApiError.badRequest('Укажите почту: на неё придёт чек об оплате', [
      { location: 'body', field: 'email', message: 'Укажите почту' },
    ]);
  }
  const accessKey = randomBytes(24).toString('base64url');
  const order = await prisma.$transaction(async (tx) => {
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
        userId: user?.id ?? null,
        email: contactEmail,
        accessHash: sha256(accessKey),
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
  return { order, accessKey };
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

  if (user.role !== 'ADMIN') {
    if (order.paidAt) throw ApiError.conflict('Оплаченный заказ отменить нельзя. Обратитесь в поддержку');
    if (order.status !== 'PENDING') throw ApiError.conflict('Отменить можно только заказ в статусе PENDING');
  }
  return changeStatus(order, 'CANCELLED');
}

// Доступ к заказу без входа в аккаунт: по ключу, который выдаётся при оформлении.
// В базе хранится только SHA-256 ключа.
export async function findByAccessKey(id, key) {
  if (!key) return null;
  const order = await prisma.order.findUnique({ where: { id }, include: orderInclude, omit: { accessHash: false } });
  if (!order?.accessHash || !safeEqual(order.accessHash, sha256(String(key)))) return null;
  const { accessHash, ...rest } = order;
  return rest;
}

// Кто может оплатить заказ и скачать квитанцию: владелец (по токену),
// администратор (только квитанцию) или гость с ключом заказа.
export async function getForBuyer({ user, accessKey }, id, { allowAdmin = false } = {}) {
  const byKey = await findByAccessKey(id, accessKey);
  if (byKey) return byKey;
  if (!user) {
    throw accessKey ? ApiError.forbidden('Нет доступа к этому заказу') : ApiError.unauthorized();
  }
  const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
  if (!order) throw ApiError.notFound('Заказ не найден');
  if (order.userId !== user.id && !(allowAdmin && user.role === 'ADMIN')) {
    throw ApiError.forbidden('Нет доступа к этому заказу');
  }
  return order;
}

// Оплата заказа картой. Платить может только покупатель, один раз,
// пока заказ не отменён и не передан в доставку.
// Номер карты, срок и CVC проверяются в браузере и сюда не приходят.
export async function pay(buyer, id, { cardBrand, cardLast4 }) {
  const order = await getForBuyer(buyer, id);
  if (order.paidAt) throw ApiError.conflict('Заказ уже оплачен');
  if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
    throw ApiError.conflict('Этот заказ уже нельзя оплатить');
  }
  const paymentRef = `MT-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
  // Условие paidAt: null защищает от двойной оплаты при одновременных запросах
  const { count } = await prisma.order.updateMany({
    where: { id, paidAt: null },
    data: { paidAt: new Date(), cardBrand, cardLast4, paymentRef },
  });
  if (count === 0) throw ApiError.conflict('Заказ уже оплачен');
  return prisma.order.findUnique({ where: { id }, include: orderInclude });
}

// Квитанция есть только у оплаченного заказа
export async function getReceiptOrder(buyer, id) {
  const order = await getForBuyer(buyer, id, { allowAdmin: true });
  if (!order.paidAt) throw ApiError.conflict('Квитанция появится после оплаты заказа');
  return order;
}

const safeEqual = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

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
