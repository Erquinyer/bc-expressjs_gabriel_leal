// ============================================
// SCHEMAS — Document (trámite notarial)
// ============================================
import { z } from 'zod';

export const documentCategories = [
  'escrituras',
  'poderes',
  'testamentos',
  'autenticaciones',
  'actas',
] as const;

export const createDocumentSchema = z.object({
  code: z
    .string({ error: 'code es obligatorio' })
    .min(1, 'code no puede estar vacío')
    .trim(),
  name: z
    .string({ error: 'name es obligatorio' })
    .min(1, 'name no puede estar vacío')
    .trim(),
  category: z.enum(documentCategories, {
    error: `category es obligatorio y debe ser uno de: ${documentCategories.join(', ')}`,
  }),
  fee: z
    .number({ error: 'fee es obligatorio' })
    .int('fee debe ser un número entero')
    .positive('fee debe ser mayor a 0'),
  availableSlots: z
    .number()
    .int('availableSlots debe ser entero')
    .nonnegative('availableSlots no puede ser negativo')
    .default(0),
  active: z.boolean().default(true),
  notaryId: z
    .number()
    .int('notaryId debe ser un número entero')
    .positive('notaryId debe ser un número positivo')
    .optional(),
});

// Reutiliza createDocumentSchema con .partial() para actualizaciones parciales
export const updateDocumentSchema = createDocumentSchema.partial();

// Tipos inferidos desde los schemas — single source of truth
export type CreateDocumentDto = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentDto = z.infer<typeof updateDocumentSchema>;
