import type { Request, Response } from 'express';
import type { ErrorResponse } from '../types.js';

export function notFoundHandler(_req: Request, res: Response): void {
  const error: ErrorResponse = { error: 'Not Found', message: 'Ruta no encontrada' };
  res.status(404).json(error);
}
