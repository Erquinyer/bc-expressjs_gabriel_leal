import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import * as documentService from '../services/document.service.js';
import { createDocumentSchema, updateDocumentSchema, documentIdSchema } from '../validators/document.schema.js';

export async function getDocumentsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const documents = await documentService.getAll();
    res.status(200).json({ data: documents, total: documents.length });
  } catch (err) {
    next(err);
  }
}

export async function getDocumentByIdHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { params } = documentIdSchema.parse({ params: req.params });
    const document = await documentService.getById(params.id);
    res.status(200).json({ data: document });
  } catch (err) {
    if (err instanceof ZodError) return next(err);
    next(err);
  }
}

export async function createDocumentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { body } = createDocumentSchema.parse({ body: req.body });
    const user = res.locals['user'] as { sub: string };
    const document = await documentService.create(body, user.sub);
    res.status(201).json({ data: document });
  } catch (err) {
    if (err instanceof ZodError) return next(err);
    next(err);
  }
}

export async function updateDocumentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { params } = documentIdSchema.parse({ params: req.params });
    const { body } = updateDocumentSchema.parse({ body: req.body });
    const user = res.locals['user'] as { sub: string; role: string };
    const document = await documentService.update(params.id, body, user.sub, user.role);
    res.status(200).json({ data: document });
  } catch (err) {
    if (err instanceof ZodError) return next(err);
    next(err);
  }
}

export async function deleteDocumentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { params } = documentIdSchema.parse({ params: req.params });
    await documentService.remove(params.id);
    res.status(204).send();
  } catch (err) {
    if (err instanceof ZodError) return next(err);
    next(err);
  }
}
