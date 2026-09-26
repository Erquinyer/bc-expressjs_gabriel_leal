import { z } from 'zod';
import { documentCategories } from '../models/document.model.js';

// ============================================
// SCHEMA ZOD: Document (trámite notarial)
// ============================================
// Zod valida y sanitiza: la regex /^[^<>]*$/ previene XSS al rechazar
// caracteres de marcado HTML en campos de texto libre.

const noHtml = /^[^<>]*$/;

export const createDocumentSchema = z.object({
  body: z.object({
    code: z.string().min(1, 'code es requerido').max(30).regex(noHtml, 'code no debe contener caracteres HTML'),
    name: z
      .string()
      .min(2, 'name debe tener al menos 2 caracteres')
      .max(150)
      .regex(noHtml, 'name no debe contener caracteres HTML'),
    category: z.enum(documentCategories, {
      error: `category es obligatoria y debe ser una de: ${documentCategories.join(', ')}`,
    }),
    fee: z.number().positive('fee debe ser mayor a 0'),
    availableSlots: z.number().int().nonnegative().default(0),
    active: z.boolean().default(true),
  }),
});

// No se deriva con createDocumentSchema.shape.body.partial(): en Zod,
// .partial() marca los campos como opcionales pero NO elimina sus
// .default(...) — un PATCH que omite availableSlots/active los resetearía
// silenciosamente a 0/true en vez de dejarlos intactos (comprobado:
// z.object({ n: z.number().default(0) }).partial().parse({}) sigue
// devolviendo { n: 0 }). Por eso se redeclara sin defaults.
export const updateDocumentSchema = z.object({
  body: z.object({
    code: z.string().min(1).max(30).regex(noHtml, 'code no debe contener caracteres HTML').optional(),
    name: z.string().min(2).max(150).regex(noHtml, 'name no debe contener caracteres HTML').optional(),
    category: z.enum(documentCategories).optional(),
    fee: z.number().positive('fee debe ser mayor a 0').optional(),
    availableSlots: z.number().int().nonnegative().optional(),
    active: z.boolean().optional(),
  }),
});

export type CreateDocumentDto = z.infer<typeof createDocumentSchema>['body'];
export type UpdateDocumentDto = z.infer<typeof updateDocumentSchema>['body'];
