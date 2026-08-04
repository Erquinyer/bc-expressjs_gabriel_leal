import { Router } from 'express';
import * as store from '../store.js';
import type { CreateDocumentDto, UpdateDocumentDto } from '../types.js';
import { validateDocumentPayload } from '../validation.js';

export const documentsRouter = Router();

// GET /api/v1/documents — Listar todos los trámites
documentsRouter.get('/', (_req, res) => {
  res.status(200).json(store.getAll());
});

// GET /api/v1/documents/:id — Obtener un trámite por ID
documentsRouter.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const document = store.getById(id);
  if (!document) {
    res.status(404).json({ error: `Trámite con id ${id} no encontrado` });
    return;
  }
  res.status(200).json(document);
});

// POST /api/v1/documents — Crear un nuevo trámite
documentsRouter.post('/', (req, res) => {
  const errors = validateDocumentPayload(req.body);
  if (errors.length > 0) {
    res.status(400).json({ error: 'Datos inválidos', details: errors });
    return;
  }
  const created = store.create(req.body as CreateDocumentDto);
  res.status(201).json(created);
});

// PUT /api/v1/documents/:id — Actualizar un trámite completo
documentsRouter.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const errors = validateDocumentPayload(req.body);
  if (errors.length > 0) {
    res.status(400).json({ error: 'Datos inválidos', details: errors });
    return;
  }
  const updated = store.update(id, req.body as UpdateDocumentDto);
  if (!updated) {
    res.status(404).json({ error: `Trámite con id ${id} no encontrado` });
    return;
  }
  res.status(200).json(updated);
});

// DELETE /api/v1/documents/:id — Eliminar un trámite
documentsRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const removed = store.remove(id);
  if (!removed) {
    res.status(404).json({ error: `Trámite con id ${id} no encontrado` });
    return;
  }
  res.status(204).send();
});
