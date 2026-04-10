'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useModule } from '@/contexts/TenantContext';
import {
  getAdminProducts,
  getProductCategories,
  deleteProduct,
  updateProduct,
} from '@/lib/api/products';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatPrice } from '@/lib/utils';
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  Package,
  PackageX,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';
import type { Product, ProductFilters } from '@/types';

export default function ProductsPage() {
  const { user } = useAuth();
  const hasShop = useModule('shop');
  const router = useRouter();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<ProductFilters>({
    page: 1,
    page_size: 20,
    ordering: '-created_at',
  });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    product: Product | null;
  }>({ open: false, product: null });

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
          <p className="text-muted-foreground">
            Activa el módulo de tienda para gestionar productos.
          </p>
        </CardContent>
      </Card>
    );
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['admin-products', filters],
    queryFn: () => getAdminProducts(filters),
  });

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { data: categories } = useQuery({
    queryKey: ['product-categories'],
    queryFn: getProductCategories,
  });

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Producto eliminado');
      setDeleteDialog({ open: false, product: null });
    },
    onError: () => toast.error('Error al eliminar el producto'),
  });

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const toggleActiveMutation = useMutation({
    mutationFn: async (product: Product) =>
      updateProduct(product.id, { is_active: !product.is_active }),
    onSuccess: (_, product) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(product.is_active ? 'Producto desactivado' : 'Producto activado');
    },
    onError: () => toast.error('Error al actualizar el producto'),
  });

  const products = productsData?.results || [];

  return (
    <>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Productos</h1>
          <p className="text-muted-foreground">Gestiona tu catálogo de productos</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/products/new">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Producto
          </Link>
        </Button>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, SKU o descripción..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                className="pl-9"
              />
            </div>

            <Select
              value={filters.category?.toString() || 'all'}
              onValueChange={(v) =>
                setFilters({
                  ...filters,
                  category: v === 'all' ? undefined : Number(v),
                  page: 1,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.ordering || '-created_at'}
              onValueChange={(v) => setFilters({ ...filters, ordering: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-created_at">Más recientes</SelectItem>
                <SelectItem value="created_at">Más antiguos</SelectItem>
                <SelectItem value="name">Nombre (A-Z)</SelectItem>
                <SelectItem value="-name">Nombre (Z-A)</SelectItem>
                <SelectItem value="price">Precio (menor)</SelectItem>
                <SelectItem value="-price">Precio (mayor)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-lg" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No hay productos</h2>
            <p className="text-muted-foreground mb-4">Comienza agregando tu primer producto</p>
            <Button asChild>
              <Link href="/dashboard/products/new">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Producto
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden group">
                {/* Imagen */}
                <div className="relative aspect-square bg-muted">
                  {product.main_image ? (
                    <Image
                      src={product.main_image}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                  {!product.is_active && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Badge variant="destructive">Inactivo</Badge>
                    </div>
                  )}
                  {product.is_featured && product.is_active && (
                    <Badge className="absolute top-2 left-2">Destacado</Badge>
                  )}
                </div>

                {/* Info */}
                <CardContent className="p-4">
                  <div className="mb-2">
                    <h3 className="font-semibold truncate">{product.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {product.category_name || (typeof product.category !== 'number' ? product.category?.name : '')}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xl font-bold">{formatPrice(product.price)}</p>
                      {product.inventory && (
                        <p
                          className={`text-xs ${
                            product.inventory.stock <= 0
                              ? 'text-destructive'
                              : product.inventory.stock <= product.inventory.low_stock_threshold
                              ? 'text-orange-500'
                              : 'text-muted-foreground'
                          }`}
                        >
                          Stock: {product.inventory.stock}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link href={`/dashboard/products/${product.id}/edit`}>
                        <Pencil className="h-3 w-3 mr-1" />
                        Editar
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/products/${product.slug}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver en tienda
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleActiveMutation.mutate(product)}>
                          {product.is_active ? 'Desactivar' : 'Activar'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteDialog({ open: true, product })}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Paginación */}
          {productsData && productsData.count > (filters.page_size || 20) && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                disabled={!productsData.previous}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {filters.page || 1} de{' '}
                {Math.ceil(productsData.count / (filters.page_size || 20))}
              </span>
              <Button
                variant="outline"
                onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                disabled={!productsData.next}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}

      {/* Delete Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El producto{' '}
              <strong>{deleteDialog.product?.name}</strong> será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog.product && deleteMutation.mutate(deleteDialog.product.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
