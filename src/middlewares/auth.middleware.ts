import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';
import { verifyAccessToken } from '../utils/jwt.js';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Authentication required'));
  }
  try {
    const payload = verifyAccessToken(authHeader.slice(7));
    res.locals['user'] = payload;
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
}

export function authorize(...roles: string[]) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const user = res.locals['user'] as { role: string } | undefined;
    if (!user || !roles.includes(user.role)) {
      return next(new AppError(403, 'Insufficient permissions'));
    }
    next();
  };
}
