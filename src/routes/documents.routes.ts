import { Router } from 'express';
import * as documentController from '../controllers/document.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

// ============================================
// RUTAS: Document — todas protegidas con authMiddleware
// ============================================

const router: Router = Router();

router.use(authMiddleware);

router.get('/', documentController.getAll);
router.get('/:id', documentController.getById);
router.post('/', documentController.create);
router.patch('/:id', documentController.update);
router.delete('/:id', documentController.remove);

export default router;
