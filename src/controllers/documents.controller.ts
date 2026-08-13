// ============================================
// CONTROLLER — Interfaz HTTP
// ============================================
// Thin controller: extraer → llamar service → responder.
// Sin lógica de negocio. Los errores siempre se pasan a next(err).

import type { Request, Response, NextFunction } from 'express';
import * as service from '../services/documents.service.js';
import { validateDocumentPayload } from '../validation.js';
import type { CreateDocumentDto, UpdateDocumentDto, ErrorResponse } from '../types.js';

export async function getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const result = await service.findAll({ page, limit });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const document = await service.findById(id);
    if (!document) {
      const error: ErrorResponse = { error: 'Not Found', message: `Trámite con id ${id} no encontrado` };
      res.status(404).json(error);
      return;
    }
    res.status(200).json({ data: document });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validateDocumentPayload(req.body);
    if (errors.length > 0) {
      const error: ErrorResponse = { error: 'Bad Request', message: errors.join('; ') };
      res.status(400).json(error);
      return;
    }
    const dto = req.body as CreateDocumentDto;
    const document = await service.create(dto);
    res.status(201).json({ data: document });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const errors = validateDocumentPayload(req.body);
    if (errors.length > 0) {
      const error: ErrorResponse = { error: 'Bad Request', message: errors.join('; ') };
      res.status(400).json(error);
      return;
    }
    const dto = req.body as UpdateDocumentDto;
    const document = await service.update(id, dto);
    if (!document) {
      const error: ErrorResponse = { error: 'Not Found', message: `Trámite con id ${id} no encontrado` };
      res.status(404).json(error);
      return;
    }
    res.status(200).json({ data: document });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const removed = await service.remove(id);
    if (!removed) {
      const error: ErrorResponse = { error: 'Not Found', message: `Trámite con id ${id} no encontrado` };
      res.status(404).json(error);
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
