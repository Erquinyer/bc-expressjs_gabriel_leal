// ============================================
// CONTROLLER — delgado, maneja req/res, llama service
// ============================================
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as service from '../services/documents.service';
import {
  createDocumentSchema,
  updateDocumentSchema,
  CreateDocumentDto,
  UpdateDocumentDto,
} from '../schemas/document.schema';
import { SingleResponse, PaginatedResponse } from '../types';

const idSchema = z.coerce.number().int().positive({
  message: 'El id debe ser un número entero positivo',
});

function formatIssues(error: z.ZodError): Array<{ field: string; message: string }> {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'id',
    message: issue.message,
  }));
}

export async function getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Number(req.query['page']) || 1;
    const limit = Number(req.query['limit']) || 10;
    const result = await service.findAll({ page, limit });
    res.json(result satisfies PaginatedResponse<(typeof result.data)[number]>);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = idSchema.safeParse(req.params['id']);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Parámetro inválido',
        issues: formatIssues(parsed.error),
      });
      return;
    }
    const document = await service.findById(parsed.data);
    res.json({ data: document } satisfies SingleResponse<typeof document>);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = createDocumentSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Datos de entrada inválidos',
        issues: formatIssues(result.error),
      });
      return;
    }
    const dto: CreateDocumentDto = result.data;
    const document = await service.create(dto);
    res.status(201).json({ data: document } satisfies SingleResponse<typeof document>);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedId = idSchema.safeParse(req.params['id']);
    if (!parsedId.success) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Parámetro inválido',
        issues: formatIssues(parsedId.error),
      });
      return;
    }
    const result = updateDocumentSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Datos de entrada inválidos',
        issues: formatIssues(result.error),
      });
      return;
    }
    const dto: UpdateDocumentDto = result.data;
    const document = await service.update(parsedId.data, dto);
    res.json({ data: document } satisfies SingleResponse<typeof document>);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = idSchema.safeParse(req.params['id']);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Parámetro inválido',
        issues: formatIssues(parsed.error),
      });
      return;
    }
    await service.remove(parsed.data);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
