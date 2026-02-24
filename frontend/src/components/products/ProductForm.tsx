'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { getProductCategories } from '@/lib/api/products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2, X, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import type { Product, ProductImage as ProductImageType } from '@/types';

// ─── Zod Schema ─────────────────────────────────────────────
const productSchema = z.object({
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

type ProductFormValues = z.infer<typeof productSchema>;

// ─── Props ──────────────────────────────────────────────────
export interface ProductFormSubmitData extends ProductFormValues {
  newImages: File[];
  removedImageIds: number[];
}

interface ProductFormProps {
  product?: Product;
  onSubmit: (data: ProductFormSubmitData) => Promise<void>;
  isSubmitting: boolean;
}

export function ProductForm({ product, onSubmit, isSubmitting }: ProductFormProps) {
  const [newImages, setNewImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<ProductImageType[]>(
    product?.images || [],
  );
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['product-categories'],
    queryFn: getProductCategories,
  });

  const categoryId =
    typeof product?.category === 'number'
      ? product.category
      : product?.category?.id;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      category: categoryId,
      price: product?.price || '',
      compare_at_price: product?.compare_at_price || '',
      cost_price: '',
      brand: '',
      short_description: product?.short_description || '',
      description: product?.description || '',
      is_active: product?.is_active ?? true,
      is_featured: product?.is_featured ?? false,
      requires_shipping: true,
    },
  });

  // ─── Image handlers ─────────────────────────────────────
  const totalImages = existingImages.length + newImages.length;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - totalImages;
    const toAdd = files.slice(0, remaining);

    setNewImages((prev) => [...prev, ...toAdd]);
    setPreviewUrls((prev) => [
      ...prev,
      ...toAdd.map((f) => URL.createObjectURL(f)),
    ]);

    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const removeNewImage = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setNewImages((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (img: ProductImageType) => {
    setExistingImages((prev) => prev.filter((i) => i.id !== img.id));
    setRemovedImageIds((prev) => [...prev, img.id]);
  };

  // ─── Submit ──────────────────────────────────────────────
  const handleSubmit = async (values: ProductFormValues) => {
    await onSubmit({
      ...values,
      newImages,
      removedImageIds,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* ── Información Básica ── */}
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del producto *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Proteína Whey 2kg" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría *</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(Number(v))}
                      value={field.value?.toString()}
                      disabled={isSubmitting || categoriesLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Nike" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="short_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción corta</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Resumen breve (aparece en listados)"
                      rows={2}
                      maxLength={500}
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>{field.value?.length || 0}/500 caracteres</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción completa</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripción detallada del producto"
                      rows={6}
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ── Precios ── */}
        <Card>
          <CardHeader>
            <CardTitle>Precios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio de venta *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0.01" placeholder="0.00" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="compare_at_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio regular</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormDescription>Precio antes de descuento</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cost_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormDescription>Tu costo de adquisición</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Imágenes ── */}
        <Card>
          <CardHeader>
            <CardTitle>Imágenes del producto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Imágenes existentes */}
            {existingImages.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Imágenes actuales</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {existingImages.map((img) => (
                    <div key={img.id} className="relative aspect-square group rounded-lg overflow-hidden border">
                      <Image
                        src={img.image_url || img.image}
                        alt={img.alt_text || 'Producto'}
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(img)}
                        className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <Separator className="my-4" />
              </div>
            )}

            {/* Previews de nuevas imágenes */}
            {previewUrls.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Nuevas imágenes</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
                  {previewUrls.map((url, index) => (
                    <div key={url} className="relative aspect-square group rounded-lg overflow-hidden border">
                      <Image src={url} alt={`Preview ${index + 1}`} fill className="object-cover" unoptimized />
                      <button
                        type="button"
                        onClick={() => removeNewImage(index)}
                        className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload */}
            {totalImages < 5 && (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                  id="product-images"
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="product-images"
                  className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-8 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm font-medium">Subir imágenes</span>
                  <span className="text-xs text-muted-foreground">
                    Máximo 5 imágenes. JPG, PNG o WebP.
                  </span>
                </label>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Configuración ── */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Producto activo</FormLabel>
                    <FormDescription>Los productos activos aparecen en la tienda</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_featured"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Producto destacado</FormLabel>
                    <FormDescription>Aparece en la sección de productos destacados</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requires_shipping"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Requiere envío</FormLabel>
                    <FormDescription>Desactiva para productos digitales</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ── Inventario (solo en edit) ── */}
        {product?.inventory && (
          <Card>
            <CardHeader>
              <CardTitle>Inventario</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">SKU</p>
                  <p className="text-lg font-semibold">{product.inventory.sku}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stock actual</p>
                  <p className="text-lg font-semibold">{product.inventory.stock}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Seguimiento</p>
                  <p className="text-lg font-semibold">{product.inventory.track_inventory ? 'Sí' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Umbral bajo</p>
                  <p className="text-lg font-semibold">{product.inventory.low_stock_threshold}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Para ajustar el stock, usa el botón &quot;Ajustar Stock&quot; en la parte superior de esta página.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Botones ── */}
        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : product ? (
              'Actualizar Producto'
            ) : (
              'Crear Producto'
            )}
          </Button>
          <Button type="button" variant="outline" onClick={() => window.history.back()} disabled={isSubmitting}>
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}
