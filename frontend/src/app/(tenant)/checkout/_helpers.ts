import { z } from 'zod';

// ─── Zod Schema ─────────────────────────────────────────────

export const checkoutSchema = z.object({
  billing_name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  billing_email: z.string().email('Email invalido'),
  billing_phone: z.string().optional(),
  billing_address: z.string().optional(),
  billing_city: z.string().optional(),
  billing_postal_code: z.string().optional(),
  accept_terms: z.literal(true, { error: 'Debes aceptar los terminos y condiciones' }),
  marketing_consent: z.boolean().optional(),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;
