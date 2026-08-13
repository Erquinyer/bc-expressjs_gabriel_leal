// ============================================
// ROUTES — Mapeo de URLs a controllers
// ============================================
// Solo conecta: URL + método HTTP → función del controller.

import { Router } from 'express';
import * as controller from '../controllers/documents.controller.js';

export const documentsRouter = Router();

documentsRouter.get('/', controller.getAll);
documentsRouter.get('/:id', controller.getById);
documentsRouter.post('/', controller.create);
documentsRouter.put('/:id', controller.update);
documentsRouter.delete('/:id', controller.remove);
