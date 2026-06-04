import { z } from 'zod';
import type { Product } from '@/types';

// ─── Zod Schema ─────────────────────────────────────────────

export const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(300, 'Máximo 300 caracteres'),
  category: z.number({ message: 'Selecciona una categoría' }),
  price: z
    .string()
    .min(1, 'El precio es requerido')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0.01, {
      message: 'Precio mínimo: 0.01',
    }),
  compare_at_price: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
      message: 'Precio inválido',
    }),
  cost_price: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
      message: 'Costo inválido',
    }),
  brand: z.string().max(200).optional().or(z.literal('')),
  short_description: z.string().max(500).optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  requires_shipping: z.boolean(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

// ─── Props ──────────────────────────────────────────────────

export interface ProductFormSubmitData extends ProductFormValues {
  newImages: File[];
  removedImageIds: number[];
}

export interface ProductFormProps {
  product?: Product;
  onSubmit: (data: ProductFormSubmitData) => Promise<void>;
  isSubmitting: boolean;
}
