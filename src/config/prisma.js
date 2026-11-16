import { PrismaClient } from '@prisma/client';

// Один экземпляр PrismaClient на всё приложение.
// Хеш ключа доступа к заказу никогда не попадает в ответы API:
// он скрыт глобально и читается только явно (omit: { accessHash: false }).
export const prisma = new PrismaClient({
  omit: { order: { accessHash: true } },
});
