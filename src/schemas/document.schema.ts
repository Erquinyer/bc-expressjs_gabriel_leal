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

// No se usa createDocumentSchema.partial(): en Zod, .partial() marca los
// campos como opcionales pero NO elimina sus .default(...) — un PATCH/PUT
// que omite availableSlots/active los resetearía silenciosamente a 0/true
// en la base de datos en vez de dejarlos intactos (comprobado:
// z.object({ n: z.number().default(0) }).partial().parse({}) sigue
// devolviendo { n: 0 }, no {}). Por eso se redeclara a mano sin defaults.
export const updateDocumentSchema = z.object({
  code: z
    .string()
    .min(1, 'code no puede estar vacío')
    .trim()
    .optional(),
  name: z
    .string()
    .min(1, 'name no puede estar vacío')
    .trim()
    .optional(),
  category: z
    .enum(documentCategories, {
      error: `category debe ser uno de: ${documentCategories.join(', ')}`,
    })
    .optional(),
  fee: z
    .number()
    .int('fee debe ser un número entero')
    .positive('fee debe ser mayor a 0')
    .optional(),
  availableSlots: z
    .number()
    .int('availableSlots debe ser entero')
    .nonnegative('availableSlots no puede ser negativo')
    .optional(),
  active: z.boolean().optional(),
  notaryId: z
    .number()
    .int('notaryId debe ser un número entero')
    .positive('notaryId debe ser un número positivo')
    .optional(),
});

// Tipos inferidos desde los schemas — single source of truth
export type CreateDocumentDto = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentDto = z.infer<typeof updateDocumentSchema>;
