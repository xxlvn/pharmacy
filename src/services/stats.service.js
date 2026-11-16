import { prisma } from '../config/prisma.js';

const DAY = 24 * 60 * 60 * 1000;
const TZ = 'Asia/Almaty';
const dayKey = (date) => date.toLocaleDateString('sv-SE', { timeZone: TZ }); // YYYY-MM-DD

// Сводка для панели администратора за последние `days` дней
// в сравнении с предыдущим периодом такой же длины.
export async function dashboard(days = 30) {
  const now = new Date();
  const periodStart = new Date(now.getTime() - days * DAY);
  const prevStart = new Date(now.getTime() - 2 * days * DAY);

  const [orders, statusGroups, topGroups, lowStock, productsTotal, outOfStock, usersTotal] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: prevStart } },
      select: { total: true, status: true, createdAt: true, email: true },
    }),
    prisma.order.groupBy({
      by: ['status'],
      where: { createdAt: { gte: periodStart } },
      _count: { _all: true },
    }),
    prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { createdAt: { gte: periodStart }, status: { not: 'CANCELLED' } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 6,
    }),
    prisma.product.findMany({
      where: { stock: { lte: 5 } },
      orderBy: [{ stock: 'asc' }, { name: 'asc' }],
      take: 8,
      select: { id: true, name: true, dosage: true, stock: true, imageUrl: true, form: true },
    }),
    prisma.product.count(),
    prisma.product.count({ where: { stock: 0 } }),
    prisma.user.count(),
  ]);

  // Выручка и заказы: текущий и предыдущий период (отменённые не считаем)
  const summarize = (list) => {
    const paid = list.filter((o) => o.status !== 'CANCELLED');
    const revenue = paid.reduce((s, o) => s + o.total, 0);
    return {
      revenue,
      orders: paid.length,
      avgCheck: paid.length ? Math.round(revenue / paid.length) : 0,
      customers: new Set(paid.map((o) => o.email)).size, // гостевые заказы считаются по почте
    };
  };
  const current = summarize(orders.filter((o) => o.createdAt >= periodStart));
  const previous = summarize(orders.filter((o) => o.createdAt < periodStart));

  // Выручка по дням для графика
  const byDay = new Map();
  for (let i = days - 1; i >= 0; i--) {
    byDay.set(dayKey(new Date(now.getTime() - i * DAY)), { date: null, revenue: 0, orders: 0 });
  }
  for (const o of orders) {
    if (o.createdAt < periodStart || o.status === 'CANCELLED') continue;
    const bucket = byDay.get(dayKey(o.createdAt));
    if (bucket) {
      bucket.revenue += o.total;
      bucket.orders += 1;
    }
  }
  const daily = [...byDay.entries()].map(([date, v]) => ({ date, revenue: v.revenue, orders: v.orders }));

  // Самые продаваемые товары
  const topIds = topGroups.map((g) => g.productId);
  const topProducts = await prisma.product.findMany({
    where: { id: { in: topIds } },
    select: { id: true, name: true, dosage: true, price: true },
  });
  const byId = new Map(topProducts.map((p) => [p.id, p]));
  const top = topGroups.map((g) => ({ ...byId.get(g.productId), sold: g._sum.quantity ?? 0 }));

  const statuses = Object.fromEntries(
    ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((s) => [s, 0]),
  );
  for (const g of statusGroups) statuses[g.status] = g._count._all;

  return {
    periodDays: days,
    current,
    previous,
    daily,
    statuses,
    topProducts: top,
    lowStock,
    catalog: { products: productsTotal, outOfStock, users: usersTotal },
  };
}
