// src/app/dashboard/management/page.tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardData } from '@/lib/api/management';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatPrice } from '@/lib/utils';
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  Trophy,
} from 'lucide-react';

function getDefaultDateRange() {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    start: startDate.toISOString().split('T')[0],
    end: now.toISOString().split('T')[0],
  };
}

export default function ManagementDashboardPage() {
  const defaults = useMemo(() => getDefaultDateRange(), []);
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);

  const { data, isLoading } = useQuery({
    queryKey: ['management-dashboard', startDate, endDate],
    queryFn: () => getDashboardData(startDate, endDate),
  });

  const kpis = [
    {
      label: 'Ventas totales',
      value: data ? formatPrice(data.total_sales) : '-',
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Gastos totales',
      value: data ? formatPrice(data.total_expenses) : '-',
      icon: TrendingDown,
      color: 'text-red-600',
      bg: 'bg-red-500/10',
    },
    {
      label: 'Margen bruto',
      value: data ? formatPrice(data.gross_margin) : '-',
      icon: TrendingUp,
      color: parseFloat(data?.gross_margin || '0') >= 0 ? 'text-emerald-600' : 'text-red-600',
      bg: parseFloat(data?.gross_margin || '0') >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10',
    },
    {
      label: 'Ventas realizadas',
      value: data?.sales_count ?? '-',
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-500/10',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Filtro de fechas */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="start-date" className="text-xs text-muted-foreground">
            Desde
          </Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40 h-9"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="end-date" className="text-xs text-muted-foreground">
            Hasta
          </Label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40 h-9"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              {isLoading ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-7 w-28" />
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium truncate">
                      {kpi.label}
                    </p>
                    <p className="text-xl font-semibold mt-1 tabular-nums" style={{ color: '#1C3B57' }}>
                      {kpi.value}
                    </p>
                  </div>
                  <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${kpi.bg}`}>
                    <kpi.icon className={`size-4 ${kpi.color}`} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contenido principal */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Alertas de stock bajo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              Productos con stock bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : !data?.low_stock_products?.length ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No hay productos con stock bajo
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {data.low_stock_products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <span className="text-sm font-medium truncate">
                      {product.name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={product.stock === 0 ? 'destructive' : 'secondary'}
                        className="tabular-nums"
                      >
                        {product.stock} / {product.low_stock_threshold}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top productos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="size-4 text-amber-500" />
              Productos mas vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : !data?.top_products?.length ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No hay ventas en este periodo
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {data.top_products.map((product, idx) => (
                  <div
                    key={product.product_id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-semibold text-muted-foreground tabular-nums w-5 text-right">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium truncate">
                        {product.product_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {product.total_quantity} uds
                      </span>
                      <span className="text-sm font-semibold tabular-nums" style={{ color: '#1C3B57' }}>
                        {formatPrice(product.total_revenue)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
