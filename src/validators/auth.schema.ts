import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name:     z.string().min(2).max(100),
    email:    z.string().email(),
    password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email:    z.string().email(),
    password: z.string().min(1),
  }),
});
