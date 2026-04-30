// src/app/dashboard/management/suppliers/page.tsx

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '@/lib/api/management';
import type { SupplierList, SupplierFormData } from '@/types/management';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_FORM: SupplierFormData = {
  name: '',
  tax_id: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  country: '',
  notes: '',
  is_active: true,
};

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SupplierFormData>(EMPTY_FORM);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['management-suppliers', search],
    queryFn: () => getSuppliers({ search: search || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['management-suppliers'] });
      toast.success('Proveedor creado');
      closeDialog();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SupplierFormData> }) =>
      updateSupplier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['management-suppliers'] });
      toast.success('Proveedor actualizado');
      closeDialog();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['management-suppliers'] });
      toast.success('Proveedor eliminado');
      setDeleteDialog({ open: false, id: null });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(supplier: SupplierList) {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name,
      tax_id: supplier.tax_id,
      email: supplier.email,
      phone: supplier.phone,
      is_active: supplier.is_active,
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const suppliers = data?.results || [];

  return (
    <div className="flex flex-col gap-4">
      {/* Barra superior */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar proveedores..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="size-4" />
          Nuevo proveedor
        </Button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="rounded-xl border bg-card divide-y">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <Skeleton className="h-4 w-40 flex-1" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : suppliers.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground mb-1">
            No hay proveedores
          </p>
          <p className="text-xs text-muted-foreground">
            {search
              ? 'No se encontraron resultados con esa busqueda'
              : 'Crea tu primer proveedor para comenzar'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {/* Cabecera (solo desktop) */}
          <div className="hidden sm:grid grid-cols-[1fr_120px_160px_100px_80px_60px] gap-4 px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>Nombre</span>
            <span>RUC/NIT</span>
            <span>Email</span>
            <span>Telefono</span>
            <span>Estado</span>
            <span />
          </div>
          {suppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              {/* Desktop */}
              <div className="hidden sm:grid grid-cols-[1fr_120px_160px_100px_80px_60px] gap-4 items-center">
                <span className="text-sm font-medium truncate">{supplier.name}</span>
                <span className="text-sm text-muted-foreground tabular-nums truncate">
                  {supplier.tax_id || '-'}
                </span>
                <span className="text-sm text-muted-foreground truncate">
                  {supplier.email || '-'}
                </span>
                <span className="text-sm text-muted-foreground tabular-nums truncate">
                  {supplier.phone || '-'}
                </span>
                <div>
                  <Badge variant={supplier.is_active ? 'default' : 'secondary'} className="text-[0.65rem]">
                    {supplier.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => openEdit(supplier)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive"
                    onClick={() => setDeleteDialog({ open: true, id: supplier.id })}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              {/* Mobile */}
              <div className="sm:hidden flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{supplier.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {supplier.email || supplier.phone || supplier.tax_id || 'Sin datos de contacto'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={supplier.is_active ? 'default' : 'secondary'} className="text-[0.65rem]">
                    {supplier.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => openEdit(supplier)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contador */}
      {!isLoading && data && (
        <p className="text-xs text-muted-foreground px-1">
          {data.count} {data.count === 1 ? 'proveedor' : 'proveedores'}
        </p>
      )}

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ color: '#1C3B57' }}>
              {editingId ? 'Editar proveedor' : 'Nuevo proveedor'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Modifica los datos del proveedor'
                : 'Ingresa los datos del nuevo proveedor'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-1.5">
                <Label htmlFor="supplier-name">Nombre *</Label>
                <Input
                  id="supplier-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="supplier-tax-id">RUC/NIT</Label>
                  <Input
                    id="supplier-tax-id"
                    value={form.tax_id || ''}
                    onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="supplier-phone">Telefono</Label>
                  <Input
                    id="supplier-phone"
                    value={form.phone || ''}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="supplier-email">Email</Label>
                <Input
                  id="supplier-email"
                  type="email"
                  value={form.email || ''}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="supplier-address">Direccion</Label>
                <Input
                  id="supplier-address"
                  value={form.address || ''}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="supplier-city">Ciudad</Label>
                  <Input
                    id="supplier-city"
                    value={form.city || ''}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="supplier-country">Pais</Label>
                  <Input
                    id="supplier-country"
                    value={form.country || ''}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="supplier-notes">Notas</Label>
                <Textarea
                  id="supplier-notes"
                  value={form.notes || ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                />
              </div>
              {editingId && (
                <div className="flex items-center gap-3">
                  <Switch
                    id="supplier-active"
                    checked={form.is_active}
                    onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                  />
                  <Label htmlFor="supplier-active">Activo</Label>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? 'Guardando...'
                  : editingId
                    ? 'Guardar cambios'
                    : 'Crear proveedor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmar eliminacion */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => { if (!open) setDeleteDialog({ open: false, id: null }); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar proveedor</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. El proveedor sera eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteDialog.id) deleteMutation.mutate(deleteDialog.id);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
