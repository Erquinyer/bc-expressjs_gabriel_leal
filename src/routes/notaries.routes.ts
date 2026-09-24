// ============================================
// ROUTES — recurso secundario Notary (solo lectura)
// ============================================
import { Router } from 'express';
import * as controller from '../controllers/notaries.controller';

const router = Router();

router.get('/', controller.getAll);
router.get('/:id', controller.getById);

export default router;
