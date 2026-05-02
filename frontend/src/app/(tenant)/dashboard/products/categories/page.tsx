'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useModule } from '@/contexts/TenantContext';
import { useRouter } from 'next/navigation';
import {
  getProductCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/lib/api/products';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Folder,
  FolderOpen,
  ArrowLeft,
  PackageX,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import type { ProductCategory } from '@/types';
import { PipeBubble } from '@/components/pipe';

// ─── Schema ─────────────────────────────────────────────────
const categorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200),
  description: z.string().optional().or(z.literal('')),
  is_active: z.boolean(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function CategoriesPage() {
  const { user } = useAuth();
  const hasShop = useModule('shop');
  const router = useRouter();
  const queryClient = useQueryClient();

  const [dialog, setDialog] = useState<{
    open: boolean;
    category: ProductCategory | null;
  }>({ open: false, category: null });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    category: ProductCategory | null;
  }>({ open: false, category: null });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Role guard — solo admin puede gestionar categorías
  if (user?.role !== 'admin') {
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
  const { data: categories, isLoading } = useQuery({
    queryKey: ['product-categories'],
    queryFn: getProductCategories,
  });

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', description: '', is_active: true },
  });

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const createMutation = useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      const formData = new FormData();
      formData.append('name', values.name);
      if (values.description) formData.append('description', values.description);
      formData.append('is_active', values.is_active.toString());
      if (imageFile) formData.append('image', imageFile);
      return createCategory(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast.success('Categoría creada');
      handleCloseDialog();
    },
    onError: (error: Error) => toast.error(error.message || 'Error al crear la categoría'),
  });

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: CategoryFormValues }) => {
      const formData = new FormData();
      formData.append('name', values.name);
      if (values.description) formData.append('description', values.description);
      formData.append('is_active', values.is_active.toString());
      if (imageFile) formData.append('image', imageFile);
      return updateCategory(id, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast.success('Categoría actualizada');
      handleCloseDialog();
    },
    onError: (error: Error) => toast.error(error.message || 'Error al actualizar'),
  });

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast.success('Categoría eliminada');
      setDeleteDialog({ open: false, category: null });
    },
    onError: (error: Error) => toast.error(error.message || 'Error al eliminar'),
  });

  // ─── Dialog handlers ──────────────────────────────────────
  const handleOpenDialog = (category?: ProductCategory) => {
    if (category) {
      form.reset({
        name: category.name,
        description: category.description || '',
        is_active: category.is_active,
      });
      setImagePreview(category.image || null);
    } else {
      form.reset({ name: '', description: '', is_active: true });
      setImagePreview(null);
    }
    setImageFile(null);
    setDialog({ open: true, category: category || null });
  };

  const handleCloseDialog = () => {
    setDialog({ open: false, category: null });
    form.reset();
    setImageFile(null);
    setImagePreview(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (values: CategoryFormValues) => {
    if (dialog.category) {
      updateMutation.mutate({ id: dialog.category.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;

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
          <h1 className="text-3xl font-bold mb-2">Categorías de Productos</h1>
          <p className="text-muted-foreground">Organiza tus productos en categorías</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Categoría
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas las Categorías</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : !categories || categories.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No hay categorías</h3>
              <p className="text-muted-foreground mb-4">
                Crea tu primera categoría para organizar tus productos
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Categoría
              </Button>
              <div className="mt-6 max-w-sm mx-auto">
                <PipeBubble
                  message="Las categorías ayudan a tus clientes a encontrar lo que buscan más rápido."
                  mood="encouraging"
                  storageKey="categories-empty"
                />
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12" />
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">Descripción</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell>
                      {cat.image ? (
                        <div className="relative w-10 h-10">
                          <Image
                            src={cat.image}
                            alt={cat.name}
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                          <FolderOpen className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground max-w-md truncate">
                      {cat.description || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{cat.products_count}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={cat.is_active ? 'default' : 'secondary'}>
                        {cat.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(cat)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            disabled={cat.products_count > 0}
                            onClick={() => setDeleteDialog({ open: true, category: cat })}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <ResponsiveDialog open={dialog.open} onOpenChange={(open) => !open && handleCloseDialog()}>
        <ResponsiveDialogContent className="max-w-lg">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{dialog.category ? 'Editar Categoría' : 'Nueva Categoría'}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {dialog.category
                ? 'Actualiza la información de la categoría'
                : 'Crea una nueva categoría para organizar tus productos'}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Suplementos" {...field} disabled={isMutating} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descripción de la categoría"
                        rows={3}
                        {...field}
                        disabled={isMutating}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Imagen</FormLabel>
                {imagePreview && (
                  <div className="relative w-24 h-24 mb-2">
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      fill
                      className="object-cover rounded"
                      unoptimized={!!imageFile}
                    />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={isMutating}
                />
              </div>

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Categoría activa</FormLabel>
                      <FormDescription>Las categorías activas aparecen en la tienda</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isMutating}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <ResponsiveDialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={isMutating}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isMutating}>
                  {isMutating ? 'Guardando...' : dialog.category ? 'Actualizar' : 'Crear'}
                </Button>
              </ResponsiveDialogFooter>
            </form>
          </Form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Delete Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La categoría{' '}
              <strong>{deleteDialog.category?.name}</strong> será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteDialog.category && deleteMutation.mutate(deleteDialog.category.id)
              }
              variant="destructive"
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
