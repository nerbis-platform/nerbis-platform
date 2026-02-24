// frontend/src/components/reviews/ReviewForm.tsx

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { StarRating } from '@/components/common/StarRating';
import { toast } from 'sonner';
import { Loader2, Upload, X } from 'lucide-react';
import Image from 'next/image';

const reviewSchema = z.object({
  rating: z.number().min(1, 'Debes seleccionar una calificación').max(5),
  title: z.string().max(200).optional().or(z.literal('')),
  comment: z.string().min(10, 'El comentario debe tener al menos 10 caracteres'),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  itemId: number;
  itemType: 'product' | 'service';
  itemName: string;
  onSubmit: (data: ReviewFormValues & { images?: File[] }) => Promise<void>;
  onCancel?: () => void;
}

export function ReviewForm({ itemName, onSubmit, onCancel }: ReviewFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      title: '',
      comment: '',
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (selectedImages.length + files.length > 5) {
      toast.error('Máximo 5 imágenes');
      return;
    }

    setSelectedImages([...selectedImages, ...files]);
    
    // Crear URLs de preview
    const newUrls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls([...previewUrls, ...newUrls]);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
    setPreviewUrls(previewUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (data: ReviewFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...data,
        images: selectedImages.length > 0 ? selectedImages : undefined,
      });
      toast.success('¡Review enviada! Será revisada antes de publicarse.');
      form.reset();
      setSelectedImages([]);
      setPreviewUrls([]);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Error al enviar review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Escribe tu opinión sobre {itemName}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Rating */}
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Calificación *</FormLabel>
                  <FormControl>
                    <div>
                      <StarRating
                        rating={field.value}
                        size="lg"
                        interactive
                        onRatingChange={field.onChange}
                      />
                      {field.value > 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {field.value} de 5 estrellas
                        </p>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title (opcional) */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: ¡Excelente producto!"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Comment */}
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentario *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Cuéntanos tu experiencia..."
                      rows={5}
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Images */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Imágenes (opcional, máximo 5)
              </label>
              
              {previewUrls.length > 0 && (
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative aspect-square">
                      <Image
                        src={url}
                        alt={`Preview ${index + 1}`}
                        fill
                        className="object-cover rounded-lg"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedImages.length < 5 && (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                    id="review-images"
                    disabled={isSubmitting}
                  />
                  <label
                    htmlFor="review-images"
                    className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted transition-colors"
                  >
                    <Upload className="h-5 w-5" />
                    <span className="text-sm">Subir imágenes</span>
                  </label>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Review'
                )}
              </Button>
              
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}