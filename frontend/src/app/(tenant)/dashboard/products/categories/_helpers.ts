import { z } from 'zod';

// ─── Schema ─────────────────────────────────────────────────

export const categorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200),
  description: z.string().optional().or(z.literal('')),
  is_active: z.boolean(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
