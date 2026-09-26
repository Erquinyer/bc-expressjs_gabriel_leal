import { Request, Response, NextFunction } from 'express';
import * as documentService from '../services/document.service.js';
import { createDocumentSchema, updateDocumentSchema } from '../schemas/document.schema.js';
import { AppError } from '../errors/AppError.js';

// ============================================
// CONTROLLER: Document (trámite notarial)
// ============================================

export async function getDocuments(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const documents = await documentService.findAll();
    res.json({ data: documents, total: documents.length });
  } catch (err) {
    next(err);
  }
}

export async function getDocumentById(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const document = await documentService.findById(req.params.id);
    if (!document) throw new AppError(404, 'Document not found');
    res.json({ data: document });
  } catch (err) {
    next(err);
  }
}

export async function createDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const { body } = createDocumentSchema.parse({ body: req.body });
    const document = await documentService.create(body, req.user.sub);
    res.status(201).json({ message: 'Document created', data: document });
  } catch (err) {
    next(err);
  }
}

export async function updateDocument(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const { body } = updateDocumentSchema.parse({ body: req.body });
    const document = await documentService.update(
      req.params.id,
      body,
      req.user.sub,
      req.user.role as string
    );

    if (!document) throw new AppError(404, 'Document not found');
    res.json({ message: 'Document updated', data: document });
  } catch (err) {
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      return next(new AppError(403, 'You can only update your own resources'));
    }
    next(err);
  }
}

export async function deleteDocument(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const document = await documentService.remove(req.params.id);
    if (!document) throw new AppError(404, 'Document not found');
    res.json({ message: 'Document deleted' });
  } catch (err) {
    next(err);
  }
}
