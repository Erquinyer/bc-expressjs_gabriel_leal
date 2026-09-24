// ============================================
// SCHEMA ZOD: Document (con ref a Notary)
// ============================================
import { z } from 'zod';
import { documentCategories } from '../models/document.model';

// ObjectId: 24 caracteres hexadecimales
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const objectIdSchema = z.string().regex(objectIdRegex, 'ID inválido');

export const createDocumentSchema = z.object({
  code: z.string().min(1, 'code es requerido').max(30),
  name: z.string().min(1, 'El nombre es requerido').max(150),
  category: z.enum(documentCategories, {
    error: `category es obligatoria y debe ser una de: ${documentCategories.join(', ')}`,
  }),
  fee: z.number().positive('fee debe ser mayor a 0'),
  availableSlots: z.number().int().nonnegative().default(0),
  active: z.boolean().default(true),
  notary: z.string().regex(objectIdRegex, 'ID de notaría inválido'),
});

export const updateDocumentSchema = createDocumentSchema.partial();

export type CreateDocumentDto = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentDto = z.infer<typeof updateDocumentSchema>;
