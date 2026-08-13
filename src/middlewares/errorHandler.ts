import type { NextFunction, Request, Response } from 'express';
import type { ErrorResponse } from '../types.js';

// Error handler global — siempre debe ser el último app.use() y tener 4 parámetros
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error(err);
  const error: ErrorResponse = { error: 'Internal Server Error', message: err.message };
  res.status(500).json(error);
}
