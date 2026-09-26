import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import * as authService from '../services/auth.service.js';
import { registerSchema, loginSchema } from '../validators/auth.schema.js';

export async function registerHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { body } = registerSchema.parse({ body: req.body });
    const user = await authService.register(body);
    res.status(201).json({ data: user });
  } catch (err) {
    if (err instanceof ZodError) return next(err);
    next(err);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { body } = loginSchema.parse({ body: req.body });
    const tokens = await authService.login(body);
    res.status(200).json(tokens);
  } catch (err) {
    if (err instanceof ZodError) return next(err);
    next(err);
  }
}

export async function meHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = res.locals['user'] as { sub: string };
    const data = await authService.getMe(user.sub);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}
