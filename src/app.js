import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import apiRoutes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { isProduction } from './config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // На хостинге (Render) запросы приходят через прокси: берём IP клиента из X-Forwarded-For,
  // иначе ограничение попыток входа считало бы всех посетителей одним адресом.
  if (isProduction) app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          // фото препаратов с Wikimedia Commons (свободные лицензии)
          imgSrc: ["'self'", 'data:', 'https://upload.wikimedia.org', 'https://thumb.wikimedia.org'],
          scriptSrc: ["'self'"],
        },
      },
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  // REST API
  app.use('/api', apiRoutes);
  app.use('/api', notFound);

  // Веб-интерфейс (дополнительно к API): статические файлы из /public
  app.use(express.static(publicDir));
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(publicDir, 'index.html')));

  app.use(errorHandler);
  return app;
}
