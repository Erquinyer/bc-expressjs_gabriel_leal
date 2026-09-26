import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.routes';
import documentsRouter from './routes/documents.routes';
import { errorHandler } from './middlewares/errorHandler';
import { notFound } from './middlewares/notFound';

export const app: Express = express();

app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', week: '07', project: 'autenticacion-jwt' });
});

// Rutas de autenticación
app.use('/api/v1/auth', authRouter);

// Recurso principal del dominio Notaría (trámite notarial), protegido por JWT
app.use('/api/v1/documents', documentsRouter);

// Middlewares de errores (siempre al final)
app.use(notFound);
app.use(errorHandler);
