import 'dotenv/config';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import documentsRoutes from './routes/documents.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import { globalLimiter, corsOptions } from './config/security.js';

const app: Express = express();

// Security layers — order matters
app.use(helmet());
app.use(globalLimiter);
// Fix sobre el starter: Express 5.1 usa path-to-regexp v8, que ya no acepta
// el comodín '*' suelto como string ("Missing parameter name" al arrancar,
// comprobado en runtime real) — se necesita un patrón con nombre (p. ej.
// '/*splat') o, más simple y estable entre versiones, un RegExp literal.
app.options(/.*/, cors(corsOptions)); // preflight
app.use(cors(corsOptions));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Sanitize inputs AFTER parsing, BEFORE routes
//
// Fix sobre el starter: mongoSanitize() como middleware reasigna
// req.body/req.query completos (req.query = target), pero en Express 5
// `req.query` es una propiedad de solo lectura (getter) — lanzaba
// "Cannot set property query of ... which has only a getter" en TODA
// petición (comprobado con curl real: /health devolvía 500 siempre).
// Fix: usar sanitize() de la misma librería, que muta el objeto en su
// lugar (delete/set de claves) en vez de reemplazar la referencia
// completa — compatible con el getter de Express 5.
app.use((req, _res, next) => {
  mongoSanitize.sanitize(req.body);
  mongoSanitize.sanitize(req.params);
  mongoSanitize.sanitize(req.query);
  next();
});

// Health check
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/documents', documentsRoutes);

// Error handling (always last)
app.use(notFound);
app.use(errorHandler);

export { app };
