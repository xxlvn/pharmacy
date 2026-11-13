import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { createApp } from './app.js';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`API запущен: http://localhost:${env.port}/api`);
  console.log(`Сайт:        http://localhost:${env.port}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
