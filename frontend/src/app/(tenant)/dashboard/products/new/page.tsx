'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useModule } from '@/contexts/TenantContext';
import { useRouter } from 'next/navigation';
import { createProduct, uploadProductImage } from '@/lib/api/products';
import { ProductForm, type ProductFormSubmitData } from '@/components/products/ProductForm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, PackageX } from 'lucide-react';
import Link from 'next/link';

export default function NewProductPage() {
  const { user } = useAuth();
  const hasShop = useModule('shop');
  const router = useRouter();
  const queryClient = useQueryClient();

  // Role guard
  if (user?.role !== 'admin' && user?.role !== 'staff') {
    router.push('/dashboard');
    return null;
  }

  // Module guard
  if (!hasShop) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <PackageX className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Módulo de Tienda no disponible</h2>
        </CardContent>
      </Card>
    );
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const mutation = useMutation({
    mutationFn: async (data: ProductFormSubmitData) => {
      // 1. Crear producto (sin imágenes)
      const { newImages, removedImageIds, ...productData } = data;
      const product = await createProduct(productData);

      // 2. Subir imágenes
      if (newImages.length > 0) {
        await Promise.all(
          newImages.map((file, i) => uploadProductImage(product.id, file, i === 0, i)),
        );
      }

      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Producto creado exitosamente');
      router.push('/dashboard/products');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al crear el producto');
    },
  });

  const handleSubmit = async (data: ProductFormSubmitData) => {
    await mutation.mutateAsync(data);
  };

  return (
    <>
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard/products">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a productos
          </Link>
        </Button>
        <h1 className="text-3xl font-bold mb-2">Nuevo Producto</h1>
        <p className="text-muted-foreground">Agrega un nuevo producto a tu catálogo</p>
      </div>

      <ProductForm onSubmit={handleSubmit} isSubmitting={mutation.isPending} />
    </>
  );
}
