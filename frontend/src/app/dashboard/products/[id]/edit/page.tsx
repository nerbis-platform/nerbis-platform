'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useModule } from '@/contexts/TenantContext';
import { useRouter, useParams } from 'next/navigation';
import {
  getProduct,
  updateProduct,
  updateStock,
  uploadProductImage,
  deleteProductImage,
} from '@/lib/api/products';
import { ProductForm, type ProductFormSubmitData } from '@/components/products/ProductForm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Package, PackageX } from 'lucide-react';
import Link from 'next/link';

export default function EditProductPage() {
  const params = useParams();
  const productId = Number(params.id);
  const { user } = useAuth();
  const hasShop = useModule('shop');
  const router = useRouter();
  const queryClient = useQueryClient();

  const [stockDialog, setStockDialog] = useState(false);
  const [stockAction, setStockAction] = useState<'increase' | 'decrease'>('increase');
  const [stockQuantity, setStockQuantity] = useState('');

  // Role guard
  if (user?.role !== 'admin' && user?.role !== 'staff') {
    router.push('/dashboard');
    return null;
  }

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
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProduct(productId),
    enabled: !!productId,
  });

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const updateMutation = useMutation({
    mutationFn: async (data: ProductFormSubmitData) => {
      const { newImages, removedImageIds, ...productData } = data;

      // 1. Actualizar campos del producto
      await updateProduct(productId, productData);

      // 2. Eliminar imágenes removidas
      if (removedImageIds.length > 0) {
        await Promise.all(
          removedImageIds.map((imgId) => deleteProductImage(productId, imgId)),
        );
      }

      // 3. Subir nuevas imágenes
      if (newImages.length > 0) {
        await Promise.all(
          newImages.map((file, i) => uploadProductImage(productId, file, false, i + 10)),
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Producto actualizado');
      router.push('/dashboard/products');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar el producto');
    },
  });

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const stockMutation = useMutation({
    mutationFn: () => updateStock(productId, stockAction, Number(stockQuantity)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      toast.success('Stock actualizado');
      setStockDialog(false);
      setStockQuantity('');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar el stock');
    },
  });

  const handleSubmit = async (data: ProductFormSubmitData) => {
    await updateMutation.mutateAsync(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!product) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Producto no encontrado</h2>
          <Button asChild className="mt-4">
            <Link href="/dashboard/products">Volver a productos</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentStock = product.inventory?.stock || 0;
  const qty = Number(stockQuantity || 0);
  const newStock = stockAction === 'increase' ? currentStock + qty : currentStock - qty;

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/dashboard/products">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a productos
            </Link>
          </Button>
          <h1 className="text-3xl font-bold mb-2">Editar Producto</h1>
          <p className="text-muted-foreground">{product.name}</p>
        </div>
        {product.inventory && (
          <Button variant="outline" onClick={() => setStockDialog(true)}>
            <Package className="h-4 w-4 mr-2" />
            Ajustar Stock
          </Button>
        )}
      </div>

      <ProductForm product={product} onSubmit={handleSubmit} isSubmitting={updateMutation.isPending} />

      {/* Stock Dialog */}
      <Dialog open={stockDialog} onOpenChange={setStockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Stock</DialogTitle>
            <DialogDescription>Stock actual: {currentStock} unidades</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Acción</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant={stockAction === 'increase' ? 'default' : 'outline'}
                  onClick={() => setStockAction('increase')}
                  className="flex-1"
                  type="button"
                >
                  Aumentar
                </Button>
                <Button
                  variant={stockAction === 'decrease' ? 'default' : 'outline'}
                  onClick={() => setStockAction('decrease')}
                  className="flex-1"
                  type="button"
                >
                  Disminuir
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="stock-qty">Cantidad</Label>
              <Input
                id="stock-qty"
                type="number"
                min="1"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                Nuevo stock: <strong>{newStock >= 0 ? newStock : 0}</strong>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStockDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => stockMutation.mutate()}
              disabled={!stockQuantity || qty < 1 || stockMutation.isPending}
            >
              {stockMutation.isPending ? 'Actualizando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
