import { Router } from 'express';
import {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
} from '../controllers/document.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/requireRole.js';

const router: Router = Router();

// ============================================
// Política de acceso — dominio Notaría
// ============================================
// GET /, GET /:id: públicos. El catálogo de trámites (nombre, categoría,
// tarifa, cupos disponibles) es información pública, equivalente a la
// lista de precios que una notaría exhibe al público — no requiere cuenta.
// POST: requiere autenticación (cualquier usuario logueado puede registrar
// un trámite, que queda asociado a su cuenta vía createdBy).
// PATCH: autenticado + dueño del trámite O admin (verificado en el service).
// DELETE: solo admin.

router.get('/', getDocuments);
router.get('/:id', getDocumentById);

router.post('/', authMiddleware, createDocument);
router.patch('/:id', authMiddleware, updateDocument);
router.delete('/:id', authMiddleware, requireRole('admin'), deleteDocument);

export default router;
