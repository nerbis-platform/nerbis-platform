// src/app/dashboard/management/purchases/page.tsx

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPurchaseOrders,
  createPurchaseOrder,
  receivePurchaseOrder,
  getSuppliers,
} from '@/lib/api/management';
import type {
  PurchaseOrderList,
  PurchaseOrderFormData,
  PurchaseOrderItemFormData,
  PurchaseOrderStatus,
} from '@/types/management';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Search, Plus, PackageCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/utils';

const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Borrador', variant: 'secondary' },
  sent: { label: 'Enviada', variant: 'outline' },
  partial: { label: 'Parcial', variant: 'outline' },
  received: { label: 'Recibida', variant: 'default' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
};

const EMPTY_ITEM: PurchaseOrderItemFormData = { product: 0, quantity: 1, unit_cost: '' };

export default function PurchasesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [receiveDialog, setReceiveDialog] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  });

  // Form state
  const [supplierId, setSupplierId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [items, setItems] = useState<PurchaseOrderItemFormData[]>([{ ...EMPTY_ITEM }]);

  const { data, isLoading } = useQuery({
    queryKey: ['management-purchases', search, statusFilter],
    queryFn: () =>
      getPurchaseOrders({
        search: search || undefined,
        status: statusFilter !== 'all' ? (statusFilter as PurchaseOrderStatus) : undefined,
      }),
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['management-suppliers-select'],
    queryFn: () => getSuppliers({ is_active: true, page_size: 100 }),
    enabled: dialogOpen,
  });

  const createMutation = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['management-purchases'] });
      toast.success('Orden de compra creada');
      closeDialog();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const receiveMutation = useMutation({
    mutationFn: receivePurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['management-purchases'] });
      toast.success('Orden recibida. Inventario actualizado.');
      setReceiveDialog({ open: false, id: null });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function closeDialog() {
    setDialogOpen(false);
    setSupplierId('');
    setNotes('');
    setExpectedDate('');
    setItems([{ ...EMPTY_ITEM }]);
  }

  function addItem() {
    setItems([...items, { ...EMPTY_ITEM }]);
  }

  function removeItem(idx: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof PurchaseOrderItemFormData, value: string | number) {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = items.filter((it) => it.product > 0 && it.quantity > 0 && it.unit_cost);
    if (validItems.length === 0) {
      toast.error('Agrega al menos un item valido');
      return;
    }
    const payload: PurchaseOrderFormData = {
      supplier: Number(supplierId),
      items: validItems,
      notes: notes || undefined,
      expected_date: expectedDate || undefined,
    };
    createMutation.mutate(payload);
  }

  const orders = data?.results || [];

  return (
    <div className="flex flex-col gap-4">
      {/* Barra superior */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar ordenes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="sent">Enviada</SelectItem>
              <SelectItem value="partial">Parcial</SelectItem>
              <SelectItem value="received">Recibida</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
          <Plus className="size-4" />
          Nueva orden
        </Button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="rounded-xl border bg-card divide-y">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32 flex-1" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground mb-1">
            No hay ordenes de compra
          </p>
          <p className="text-xs text-muted-foreground">
            {search || statusFilter !== 'all'
              ? 'No se encontraron resultados con los filtros aplicados'
              : 'Crea tu primera orden de compra para comenzar'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {/* Cabecera desktop */}
          <div className="hidden sm:grid grid-cols-[100px_1fr_100px_100px_120px_60px] gap-4 px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>Numero</span>
            <span>Proveedor</span>
            <span>Estado</span>
            <span className="text-right">Total</span>
            <span>Fecha</span>
            <span />
          </div>
          {orders.map((order) => {
            const statusConf = STATUS_CONFIG[order.status];
            const canReceive = order.status === 'draft' || order.status === 'sent' || order.status === 'partial';
            return (
              <div key={order.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                {/* Desktop */}
                <div className="hidden sm:grid grid-cols-[100px_1fr_100px_100px_120px_60px] gap-4 items-center">
                  <span className="text-sm font-medium tabular-nums">{order.order_number}</span>
                  <span className="text-sm text-muted-foreground truncate">{order.supplier_name}</span>
                  <div>
                    <Badge variant={statusConf.variant} className="text-[0.65rem]">
                      {statusConf.label}
                    </Badge>
                  </div>
                  <span className="text-sm font-medium tabular-nums text-right">
                    {formatPrice(order.total)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString('es')}
                  </span>
                  <div>
                    {canReceive && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        title="Recibir orden"
                        onClick={() => setReceiveDialog({ open: true, id: order.id })}
                      >
                        <PackageCheck className="size-3.5 text-emerald-600" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Mobile */}
                <div className="sm:hidden flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium tabular-nums">{order.order_number}</p>
                      <Badge variant={statusConf.variant} className="text-[0.65rem]">
                        {statusConf.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {order.supplier_name} · {new Date(order.created_at).toLocaleDateString('es')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-medium tabular-nums">
                      {formatPrice(order.total)}
                    </span>
                    {canReceive && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => setReceiveDialog({ open: true, id: order.id })}
                      >
                        <PackageCheck className="size-3.5 text-emerald-600" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && data && (
        <p className="text-xs text-muted-foreground px-1">
          {data.count} {data.count === 1 ? 'orden' : 'ordenes'}
        </p>
      )}

      {/* Dialog nueva orden */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ color: '#1C3B57' }}>Nueva orden de compra</DialogTitle>
            <DialogDescription>
              Selecciona un proveedor y agrega los productos a comprar
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-1.5">
                <Label>Proveedor *</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {(suppliersData?.results || []).map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label>Fecha esperada de entrega</Label>
                <Input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="w-48"
                />
              </div>

              {/* Items */}
              <div className="grid gap-2">
                <Label>Items *</Label>
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-end">
                    <div>
                      {idx === 0 && (
                        <span className="text-[0.65rem] text-muted-foreground">Producto ID</span>
                      )}
                      <Input
                        type="number"
                        placeholder="ID"
                        value={item.product || ''}
                        onChange={(e) => updateItem(idx, 'product', Number(e.target.value))}
                        min={1}
                        className="h-9"
                      />
                    </div>
                    <div>
                      {idx === 0 && (
                        <span className="text-[0.65rem] text-muted-foreground">Cantidad</span>
                      )}
                      <Input
                        type="number"
                        placeholder="Cant."
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                        min={1}
                        className="h-9"
                      />
                    </div>
                    <div>
                      {idx === 0 && (
                        <span className="text-[0.65rem] text-muted-foreground">Costo unit.</span>
                      )}
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={item.unit_cost}
                        onChange={(e) => updateItem(idx, 'unit_cost', e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 text-destructive"
                      onClick={() => removeItem(idx)}
                      disabled={items.length <= 1}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="w-fit gap-1.5">
                  <Plus className="size-3.5" />
                  Agregar item
                </Button>
              </div>

              <div className="grid gap-1.5">
                <Label>Notas</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || !supplierId}>
                {createMutation.isPending ? 'Creando...' : 'Crear orden'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmar recepcion */}
      <AlertDialog
        open={receiveDialog.open}
        onOpenChange={(open) => { if (!open) setReceiveDialog({ open: false, id: null }); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recibir orden de compra</AlertDialogTitle>
            <AlertDialogDescription>
              Al recibir la orden, el inventario se actualizara automaticamente con las cantidades de cada producto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (receiveDialog.id) receiveMutation.mutate(receiveDialog.id);
              }}
              disabled={receiveMutation.isPending}
            >
              {receiveMutation.isPending ? 'Procesando...' : 'Confirmar recepcion'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
