// ============================================
// MIDDLEWARES — errorHandler (4 parámetros, siempre el último)
// ============================================
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';
import { logger } from '../config/logger';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isProduction = process.env['NODE_ENV'] === 'production';

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Datos de entrada inválidos',
      issues: err.issues.map((issue) => ({
        field: issue.path.join('.') || 'root',
        message: issue.message,
      })),
    });
    return;
  }

  if (err instanceof AppError) {
    logger.warn(`${err.statusCode} - ${err.message}`);
    res.status(err.statusCode).json({
      error: 'Application Error',
      message: err.message,
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Error desconocido';
  const stack = err instanceof Error ? err.stack : undefined;
  logger.error(message);

  res.status(500).json({
    error: 'Internal Server Error',
    message: isProduction ? 'Ha ocurrido un error inesperado' : message,
    ...(isProduction ? {} : { stack }),
  });
}
