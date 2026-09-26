import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  // Fix sobre el starter (mismo hallazgo de semana 07): auth.controller.ts y
  // document.controller.ts usan schema.parse() (no safeParse), así que un
  // body inválido llega aquí como ZodError. Sin esta rama caía al 500
  // genérico de abajo, exponiendo un error interno por un simple 400 de
  // validación — comprobado con curl real.
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      issues: err.issues.map((issue) => ({
        field: issue.path.join('.').replace(/^body\./, '') || 'root',
        message: issue.message,
      })),
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Nunca se expone err.stack ni err.message del error genérico al cliente
  // — solo se loguea en el servidor. Cumple "mensajes de error seguros" de
  // la rúbrica de esta semana.
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
