import { PrismaClient } from '@prisma/client';

// Один экземпляр PrismaClient на всё приложение.
export const prisma = new PrismaClient();
