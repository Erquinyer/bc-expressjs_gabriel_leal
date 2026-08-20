// ============================================
// APP — configuración de Express (sin arrancar el server)
// ============================================
import express from 'express';
import { morganMiddleware } from './config/logger';
import documentsRouter from './routes/documents.routes';
import { notFound } from './middlewares/notFound';
import { errorHandler } from './middlewares/errorHandler';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(morganMiddleware);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', week: '04', project: 'validacion-error-handling' });
  });

  app.use('/api/v1/documents', documentsRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
