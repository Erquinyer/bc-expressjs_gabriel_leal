import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Fix sobre el starter: authController usa schema.parse() (no safeParse),
  // así que un body inválido en /register o /login llega aquí como ZodError.
  // Sin esta rama, caía al 500 genérico de abajo — comprobado con curl real.
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Datos de entrada inválidos',
      issues: err.issues.map((issue) => ({
        field: issue.path.join('.') || 'root',
        message: issue.message,
      })),
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}
