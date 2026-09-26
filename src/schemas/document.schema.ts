import { z } from 'zod';
import { documentCategories } from '../models/document.model';

// ============================================
// SCHEMA ZOD: Document (trámite notarial)
// ============================================

export const createDocumentSchema = z.object({
  code: z.string().min(1, 'code es requerido').max(30),
  name: z.string().min(1, 'El nombre es requerido').max(150),
  category: z.enum(documentCategories, {
    error: `category es obligatoria y debe ser una de: ${documentCategories.join(', ')}`,
  }),
  fee: z.number().positive('fee debe ser mayor a 0'),
  availableSlots: z.number().int().nonnegative().default(0),
  active: z.boolean().default(true),
});

export const updateDocumentSchema = createDocumentSchema.partial();

export type CreateDocumentDto = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentDto = z.infer<typeof updateDocumentSchema>;
