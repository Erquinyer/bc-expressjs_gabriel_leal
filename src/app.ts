// ============================================
// app.ts — Configuración de Express
// ============================================
import express from 'express';
import notariesRouter from './routes/notaries.routes';
import documentsRouter from './routes/documents.routes';
import { errorHandler } from './middlewares/errorHandler';
import { notFound } from './middlewares/notFound';

export const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', week: '06', project: 'mongodb-mongoose' });
});

app.use('/api/v1/notaries', notariesRouter);
app.use('/api/v1/documents', documentsRouter);

app.use(notFound);
app.use(errorHandler);
