import type { NextFunction, Request, Response } from 'express';

// Error handler global — siempre debe ser el último app.use() y tener 4 parámetros
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor', message: err.message });
}
