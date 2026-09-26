import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as documentService from '../services/document.service';
import { createDocumentSchema, updateDocumentSchema } from '../schemas/document.schema';

// ============================================
// CONTROLADOR: Document
// ============================================
// Usa safeParse (no .parse()) para responder 400 con detalle de Zod:
// el errorHandler de esta semana (dado) solo distingue AppError / 500,
// no tiene una rama para ZodError.
// ============================================

function formatIssues(error: z.ZodError): Array<{ field: string; message: string }> {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'root',
    message: issue.message,
  }));
}

export async function getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const documents = await documentService.getAll();
    res.status(200).json(documents);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const document = await documentService.getById(req.params.id as string);
    res.status(200).json(document);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = createDocumentSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Datos de entrada inválidos', issues: formatIssues(result.error) });
      return;
    }
    const userId = req.user!.sub;
    const document = await documentService.create(result.data, userId);
    res.status(201).json(document);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = updateDocumentSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Datos de entrada inválidos', issues: formatIssues(result.error) });
      return;
    }
    const document = await documentService.update(req.params.id as string, result.data);
    res.status(200).json(document);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await documentService.remove(req.params.id as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
