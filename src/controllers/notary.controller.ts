// ============================================
// CONTROLLER: Notary
// ============================================
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as service from '../services/notary.service';
import { createNotarySchema, updateNotarySchema } from '../schemas/notary.schema';
import { objectIdSchema } from '../schemas/document.schema';

function formatIssues(error: z.ZodError): Array<{ field: string; message: string }> {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'root',
    message: issue.message,
  }));
}

export async function getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const items = await service.getAll();
    res.json(items);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedId = objectIdSchema.safeParse(req.params['id']);
    if (!parsedId.success) {
      res.status(400).json({ message: 'ID inválido', issues: formatIssues(parsedId.error) });
      return;
    }
    const item = await service.getById(parsedId.data);
    res.json(item);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = createNotarySchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ message: 'Datos de entrada inválidos', issues: formatIssues(result.error) });
      return;
    }
    const item = await service.createNotary(result.data);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedId = objectIdSchema.safeParse(req.params['id']);
    if (!parsedId.success) {
      res.status(400).json({ message: 'ID inválido', issues: formatIssues(parsedId.error) });
      return;
    }
    const result = updateNotarySchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ message: 'Datos de entrada inválidos', issues: formatIssues(result.error) });
      return;
    }
    const item = await service.updateNotary(parsedId.data, result.data);
    res.json(item);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedId = objectIdSchema.safeParse(req.params['id']);
    if (!parsedId.success) {
      res.status(400).json({ message: 'ID inválido', issues: formatIssues(parsedId.error) });
      return;
    }
    await service.deleteNotary(parsedId.data);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
