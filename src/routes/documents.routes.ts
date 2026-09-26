import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import {
  getDocumentsHandler,
  getDocumentByIdHandler,
  createDocumentHandler,
  updateDocumentHandler,
  deleteDocumentHandler,
} from '../controllers/document.controller.js';

// ============================================================
// DOCUMENTS ROUTER — trámites notariales
// ============================================================
// GET público; POST/PUT autenticado (PUT exige dueño o admin, verificado
// en el service); DELETE solo admin (authorize('admin') en la ruta, igual
// que semana 08).
// ============================================================

export const documentsRouter = Router();

documentsRouter.get('/', getDocumentsHandler);
documentsRouter.get('/:id', getDocumentByIdHandler);
documentsRouter.post('/', authenticate, createDocumentHandler);
documentsRouter.put('/:id', authenticate, updateDocumentHandler);
documentsRouter.delete('/:id', authenticate, authorize('admin'), deleteDocumentHandler);
