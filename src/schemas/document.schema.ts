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

// No se usa createDocumentSchema.partial(): en Zod, .partial() marca los
// campos como opcionales pero NO elimina sus .default(...) — un PATCH
// parcial que omitía availableSlots/active los resetearía silenciosamente a
// 0/true (comprobado: z.object({ n: z.number().default(0) }).partial()
// .parse({}) sigue devolviendo { n: 0 }, no {}). Se redeclara a mano sin
// defaults.
export const updateDocumentSchema = z.object({
  code: z.string().min(1, 'code es requerido').max(30).optional(),
  name: z.string().min(1, 'El nombre es requerido').max(150).optional(),
  category: z.enum(documentCategories).optional(),
  fee: z.number().positive('fee debe ser mayor a 0').optional(),
  availableSlots: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
});

export type CreateDocumentDto = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentDto = z.infer<typeof updateDocumentSchema>;
