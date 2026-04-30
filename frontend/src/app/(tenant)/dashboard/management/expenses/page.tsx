// src/app/dashboard/management/expenses/page.tsx

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseCategories,
  createExpenseCategory,
  getSuppliers,
} from '@/lib/api/management';
import type {
  ExpenseList,
  ExpenseFormData,
  PaymentMethod,
} from '@/types/management';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/utils';

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'other', label: 'Otro' },
];

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

const EMPTY_FORM: ExpenseFormData = {
  description: '',
  amount: '',
  date: todayStr(),
  payment_method: 'cash',
};

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ExpenseFormData>(EMPTY_FORM);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  });

  // Dialog nueva categoria
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['management-expenses', search],
    queryFn: () => getExpenses({ search: search || undefined }),
  });

  const { data: categories } = useQuery({
    queryKey: ['management-expense-categories'],
    queryFn: getExpenseCategories,
    enabled: dialogOpen,
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['management-suppliers-select'],
    queryFn: () => getSuppliers({ is_active: true, page_size: 100 }),
    enabled: dialogOpen,
  });

  const createMutation = useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['management-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['management-dashboard'] });
      toast.success('Gasto registrado');
      closeDialog();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ExpenseFormData> }) =>
      updateExpense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['management-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['management-dashboard'] });
      toast.success('Gasto actualizado');
      closeDialog();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['management-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['management-dashboard'] });
      toast.success('Gasto eliminado');
      setDeleteDialog({ open: false, id: null });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createCatMutation = useMutation({
    mutationFn: createExpenseCategory,
    onSuccess: (newCat) => {
      queryClient.invalidateQueries({ queryKey: ['management-expense-categories'] });
      toast.success('Categoria creada');
      setForm({ ...form, category: newCat.id });
      setCatDialogOpen(false);
      setNewCatName('');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM, date: todayStr() });
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, date: todayStr() });
    setDialogOpen(true);
  }

  function openEdit(expense: ExpenseList) {
    setEditingId(expense.id);
    setForm({
      description: expense.description,
      amount: expense.amount,
      date: expense.date,
      payment_method: 'cash', // Se recargara con los datos completos
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
  const expenses = data?.results || [];

  return (
    <div className="flex flex-col gap-4">
      {/* Barra superior */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar gastos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="size-4" />
          Nuevo gasto
        </Button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="rounded-xl border bg-card divide-y">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <Skeleton className="h-4 w-40 flex-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground mb-1">
            No hay gastos registrados
          </p>
          <p className="text-xs text-muted-foreground">
            {search
              ? 'No se encontraron resultados con esa busqueda'
              : 'Registra tu primer gasto para comenzar'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {/* Cabecera desktop */}
          <div className="hidden sm:grid grid-cols-[120px_1fr_120px_120px_100px_60px] gap-4 px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>Fecha</span>
            <span>Descripcion</span>
            <span>Categoria</span>
            <span>Proveedor</span>
            <span className="text-right">Monto</span>
            <span />
          </div>
          {expenses.map((expense) => (
            <div key={expense.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
              {/* Desktop */}
              <div className="hidden sm:grid grid-cols-[120px_1fr_120px_120px_100px_60px] gap-4 items-center">
                <span className="text-xs text-muted-foreground">
                  {new Date(expense.date).toLocaleDateString('es')}
                </span>
                <span className="text-sm font-medium truncate">{expense.description}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {expense.category_name || '-'}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {expense.supplier_name || '-'}
                </span>
                <span className="text-sm font-medium tabular-nums text-right text-red-600">
                  {formatPrice(expense.amount)}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => openEdit(expense)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive"
                    onClick={() => setDeleteDialog({ open: true, id: expense.id })}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              {/* Mobile */}
              <div className="sm:hidden flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{expense.description}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {new Date(expense.date).toLocaleDateString('es')}
                    {expense.category_name ? ` · ${expense.category_name}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-medium tabular-nums text-red-600">
                    {formatPrice(expense.amount)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => openEdit(expense)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && data && (
        <p className="text-xs text-muted-foreground px-1">
          {data.count} {data.count === 1 ? 'gasto' : 'gastos'}
        </p>
      )}

      {/* Dialog crear/editar gasto */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ color: '#1C3B57' }}>
              {editingId ? 'Editar gasto' : 'Nuevo gasto'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Modifica los datos del gasto'
                : 'Registra un nuevo gasto del negocio'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-1.5">
                <Label htmlFor="expense-desc">Descripcion *</Label>
                <Input
                  id="expense-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="expense-amount">Monto *</Label>
                  <Input
                    id="expense-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="expense-date">Fecha *</Label>
                  <Input
                    id="expense-date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Categoria</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs gap-1 px-1.5"
                      onClick={() => setCatDialogOpen(true)}
                    >
                      <Plus className="size-3" />
                      Nueva
                    </Button>
                  </div>
                  <Select
                    value={form.category ? String(form.category) : 'none'}
                    onValueChange={(v) =>
                      setForm({ ...form, category: v === 'none' ? undefined : Number(v) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin categoria</SelectItem>
                      {(categories || []).map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label>Proveedor</Label>
                  <Select
                    value={form.supplier ? String(form.supplier) : 'none'}
                    onValueChange={(v) =>
                      setForm({ ...form, supplier: v === 'none' ? undefined : Number(v) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin proveedor</SelectItem>
                      {(suppliersData?.results || []).map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label>Metodo de pago</Label>
                <Select
                  value={form.payment_method}
                  onValueChange={(v) => setForm({ ...form, payment_method: v as PaymentMethod })}
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

              <div className="grid gap-1.5">
                <Label htmlFor="expense-notes">Notas</Label>
                <Textarea
                  id="expense-notes"
                  value={form.notes || ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                />
              </div>
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
                    : 'Registrar gasto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog nueva categoria */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle style={{ color: '#1C3B57' }}>Nueva categoria de gasto</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createCatMutation.mutate({ name: newCatName });
            }}
          >
            <div className="grid gap-4 py-4">
              <div className="grid gap-1.5">
                <Label htmlFor="cat-name">Nombre *</Label>
                <Input
                  id="cat-name"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCatDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createCatMutation.isPending}>
                {createCatMutation.isPending ? 'Creando...' : 'Crear categoria'}
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
            <AlertDialogTitle>Eliminar gasto</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. El registro del gasto sera eliminado permanentemente.
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
