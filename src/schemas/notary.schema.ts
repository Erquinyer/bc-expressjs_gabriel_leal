// ============================================
// SCHEMA ZOD: Notary
// ============================================
import { z } from 'zod';

export const createNotarySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(150),
  licenseNumber: z.string().min(1, 'licenseNumber es requerido').max(30),
  city: z.string().min(1, 'city es requerida').max(100),
});

export const updateNotarySchema = createNotarySchema.partial();

export type CreateNotaryDto = z.infer<typeof createNotarySchema>;
export type UpdateNotaryDto = z.infer<typeof updateNotarySchema>;
