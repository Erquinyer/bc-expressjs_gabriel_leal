import express from 'express';
import type { Application } from 'express';
import { documentsRouter } from './routes/documents.routes.js';
import { logger } from './middlewares/logger.js';
import { notFoundHandler } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';

export function createApp(): Application {
  const app = express();

  // 1. Parseo de body
  app.use(express.json());

  // 2. Logger personalizado
  app.use(logger);

  // 3. Health check
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // 4. Rutas del recurso principal
  app.use('/api/v1/documents', documentsRouter);

  // 5. Handler para rutas no encontradas
  app.use(notFoundHandler);

  // 6. Error handler global — siempre el último app.use()
  app.use(errorHandler);

  return app;
}
