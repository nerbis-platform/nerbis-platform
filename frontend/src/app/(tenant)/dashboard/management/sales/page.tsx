// src/app/dashboard/management/sales/page.tsx

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSales, createSale, cancelSale } from '@/lib/api/management';
import type {
  SaleList,
  SaleFormData,
  SaleItemFormData,
  SaleStatus,
  PaymentMethod,
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
import { Search, Plus, XCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/utils';

const STATUS_CONFIG: Record<SaleStatus, { label: string; variant: 'default' | 'destructive' }> = {
  completed: { label: 'Completada', variant: 'default' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'other', label: 'Otro' },
];

const EMPTY_ITEM: SaleItemFormData = { product: 0, quantity: 1, unit_price: '' };

export default function SalesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  });

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<SaleItemFormData[]>([{ ...EMPTY_ITEM }]);

  const { data, isLoading } = useQuery({
    queryKey: ['management-sales', search, statusFilter],
    queryFn: () =>
      getSales({
        search: search || undefined,
        status: statusFilter !== 'all' ? (statusFilter as SaleStatus) : undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: createSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['management-sales'] });
      queryClient.invalidateQueries({ queryKey: ['management-dashboard'] });
      toast.success('Venta registrada');
      closeDialog();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['management-sales'] });
      queryClient.invalidateQueries({ queryKey: ['management-dashboard'] });
      toast.success('Venta cancelada');
      setCancelDialog({ open: false, id: null });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function closeDialog() {
    setDialogOpen(false);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setPaymentMethod('cash');
    setNotes('');
    setItems([{ ...EMPTY_ITEM }]);
  }

  function addItem() {
    setItems([...items, { ...EMPTY_ITEM }]);
  }

  function removeItem(idx: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof SaleItemFormData, value: string | number) {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = items.filter((it) => it.product > 0 && it.quantity > 0 && it.unit_price);
    if (validItems.length === 0) {
      toast.error('Agrega al menos un producto');
      return;
    }
    const payload: SaleFormData = {
      customer_name: customerName || undefined,
      customer_email: customerEmail || undefined,
      customer_phone: customerPhone || undefined,
      payment_method: paymentMethod,
      items: validItems,
      notes: notes || undefined,
    };
    createMutation.mutate(payload);
  }

  const sales = data?.results || [];

  return (
    <div className="flex flex-col gap-4">
      {/* Barra superior */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar ventas..."
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
              <SelectItem value="completed">Completada</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
          <Plus className="size-4" />
          Nueva venta
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
      ) : sales.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground mb-1">
            No hay ventas registradas
          </p>
          <p className="text-xs text-muted-foreground">
            {search || statusFilter !== 'all'
              ? 'No se encontraron resultados con los filtros aplicados'
              : 'Registra tu primera venta para comenzar'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {/* Cabecera desktop */}
          <div className="hidden sm:grid grid-cols-[100px_1fr_100px_100px_100px_120px_50px] gap-4 px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>Numero</span>
            <span>Cliente</span>
            <span>Estado</span>
            <span>Metodo</span>
            <span className="text-right">Total</span>
            <span>Fecha</span>
            <span />
          </div>
          {sales.map((sale) => {
            const statusConf = STATUS_CONFIG[sale.status];
            return (
              <div key={sale.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                {/* Desktop */}
                <div className="hidden sm:grid grid-cols-[100px_1fr_100px_100px_100px_120px_50px] gap-4 items-center">
                  <span className="text-sm font-medium tabular-nums">{sale.sale_number}</span>
                  <span className="text-sm text-muted-foreground truncate">
                    {sale.customer_name || 'Sin nombre'}
                  </span>
                  <div>
                    <Badge variant={statusConf.variant} className="text-[0.65rem]">
                      {statusConf.label}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {sale.payment_method_display}
                  </span>
                  <span className="text-sm font-medium tabular-nums text-right">
                    {formatPrice(sale.total)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(sale.created_at).toLocaleDateString('es')}
                  </span>
                  <div>
                    {sale.status === 'completed' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive"
                        title="Cancelar venta"
                        onClick={() => setCancelDialog({ open: true, id: sale.id })}
                      >
                        <XCircle className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Mobile */}
                <div className="sm:hidden flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium tabular-nums">{sale.sale_number}</p>
                      <Badge variant={statusConf.variant} className="text-[0.65rem]">
                        {statusConf.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {sale.customer_name || 'Sin nombre'} · {sale.payment_method_display}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-medium tabular-nums">
                      {formatPrice(sale.total)}
                    </span>
                    {sale.status === 'completed' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive"
                        onClick={() => setCancelDialog({ open: true, id: sale.id })}
                      >
                        <XCircle className="size-3.5" />
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
          {data.count} {data.count === 1 ? 'venta' : 'ventas'}
        </p>
      )}

      {/* Dialog nueva venta */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ color: '#1C3B57' }}>Nueva venta</DialogTitle>
            <DialogDescription>
              Registra una venta directa con los datos del cliente y productos
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Datos del cliente */}
              <div className="grid gap-1.5">
                <Label>Cliente (opcional)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    placeholder="Nombre"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-9"
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="h-9"
                  />
                  <Input
                    placeholder="Telefono"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label>Metodo de pago *</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((pm) => (
                      <SelectItem key={pm.value} value={pm.value}>
                        {pm.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Items */}
              <div className="grid gap-2">
                <Label>Productos *</Label>
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
                        <span className="text-[0.65rem] text-muted-foreground">Precio unit.</span>
                      )}
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={item.unit_price}
                        onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
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
                  Agregar producto
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
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Registrando...' : 'Registrar venta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog cancelar venta */}
      <AlertDialog
        open={cancelDialog.open}
        onOpenChange={(open) => { if (!open) setCancelDialog({ open: false, id: null }); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar venta</AlertDialogTitle>
            <AlertDialogDescription>
              Al cancelar la venta, el inventario se restaurara automaticamente. Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cancelDialog.id) cancelMutation.mutate(cancelDialog.id);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? 'Cancelando...' : 'Cancelar venta'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
