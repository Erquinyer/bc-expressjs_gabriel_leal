import { z } from 'zod';
import { documentCategories } from '../models/document.model.js';

// ============================================================
// SCHEMAS ZOD — Document (trámite notarial)
// ============================================================

export const createDocumentSchema = z.object({
  body: z.object({
    code: z.string().min(1).max(30),
    name: z.string().min(2).max(200),
    category: z.enum(documentCategories),
    fee: z.number().positive(),
    availableSlots: z.number().int().nonnegative().default(0),
    active: z.boolean().default(true),
  }),
});

// No se deriva con createDocumentSchema.shape.body.partial(): en Zod,
// .partial() marca los campos como opcionales pero NO elimina sus
// .default(...) — un PUT que omite availableSlots/active los resetearía
// silenciosamente a 0/true (hallazgo real de semana 08, backporteado a
// semanas 05-07). Por eso se redeclara sin defaults.
export const updateDocumentSchema = z.object({
  body: z.object({
    code: z.string().min(1).max(30).optional(),
    name: z.string().min(2).max(200).optional(),
    category: z.enum(documentCategories).optional(),
    fee: z.number().positive().optional(),
    availableSlots: z.number().int().nonnegative().optional(),
    active: z.boolean().optional(),
  }),
});

export const documentIdSchema = z.object({
  params: z.object({
    id: z.string().length(24, 'Invalid MongoDB ID'),
  }),
});
