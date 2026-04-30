// src/app/dashboard/management/inventory/page.tsx

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getInventoryMovements } from '@/lib/api/management';
import type { InventoryMovementFilters } from '@/types/management';
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
import { Button } from '@/components/ui/button';
import { Search, ArrowDownCircle, ArrowUpCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

const MOVEMENT_TYPE_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  in: { label: 'Entrada', variant: 'default' },
  out: { label: 'Salida', variant: 'destructive' },
  adjust: { label: 'Ajuste', variant: 'secondary' },
};

const REFERENCE_TYPE_LABELS: Record<string, string> = {
  purchase: 'Compra',
  sale: 'Venta',
  adjustment: 'Ajuste',
  return: 'Devolucion',
  initial: 'Inventario inicial',
};

export default function InventoryMovementsPage() {
  const [filters, setFilters] = useState<InventoryMovementFilters>({
    page: 1,
    page_size: 20,
    ordering: '-moved_at',
  });
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-movements', filters],
    queryFn: () => getInventoryMovements(filters),
  });

  const movements = data?.results ?? [];
  const totalPages = data ? Math.ceil(data.count / (filters.page_size ?? 20)) : 0;

  function handleFilterChange(key: keyof InventoryMovementFilters, value: string | undefined) {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
      page: 1,
    }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Movimientos de Inventario</h1>
        <p className="text-muted-foreground mt-1">
          Registro automatico de entradas, salidas y ajustes de stock
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por referencia..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              handleFilterChange('search' as keyof InventoryMovementFilters, e.target.value);
            }}
            className="pl-9"
          />
        </div>

        <Select
          value={filters.movement_type ?? 'all'}
          onValueChange={(v) => handleFilterChange('movement_type', v === 'all' ? undefined : v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="in">Entrada</SelectItem>
            <SelectItem value="out">Salida</SelectItem>
            <SelectItem value="adjust">Ajuste</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          placeholder="Desde"
          className="w-[160px]"
          onChange={(e) => handleFilterChange('date_from', e.target.value)}
        />
        <Input
          type="date"
          placeholder="Hasta"
          className="w-[160px]"
          onChange={(e) => handleFilterChange('date_to', e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Fecha</th>
              <th className="text-left p-3 font-medium">Producto</th>
              <th className="text-left p-3 font-medium">Tipo</th>
              <th className="text-right p-3 font-medium">Cantidad</th>
              <th className="text-left p-3 font-medium">Origen</th>
              <th className="text-left p-3 font-medium">Referencia</th>
              <th className="text-left p-3 font-medium">Notas</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="p-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : movements.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  No hay movimientos de inventario registrados
                </td>
              </tr>
            ) : (
              movements.map((mov) => {
                const typeInfo = MOVEMENT_TYPE_LABELS[mov.movement_type] ?? {
                  label: mov.movement_type_display || mov.movement_type,
                  variant: 'outline' as const,
                };
                const icon =
                  mov.movement_type === 'in' ? (
                    <ArrowDownCircle className="h-4 w-4 text-green-600" />
                  ) : mov.movement_type === 'out' ? (
                    <ArrowUpCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <RefreshCw className="h-4 w-4 text-blue-600" />
                  );

                return (
                  <tr key={mov.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {new Date(mov.created_at).toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="p-3 font-medium">{mov.product_name}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {icon}
                        <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono">
                      {mov.movement_type === 'in' ? '+' : mov.movement_type === 'out' ? '-' : ''}
                      {mov.quantity}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {REFERENCE_TYPE_LABELS[mov.reference_type] ?? mov.reference_type}
                    </td>
                    <td className="p-3 font-mono text-xs">{mov.reference_number || '-'}</td>
                    <td className="p-3 text-muted-foreground text-xs max-w-[200px] truncate">
                      {mov.notes || '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {data?.count ?? 0} movimientos en total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!data?.previous}
              onClick={() =>
                setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) - 1 }))
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {filters.page ?? 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!data?.next}
              onClick={() =>
                setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }))
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
