// src/app/dashboard/orders/page.tsx

'use client';

import { useQuery } from '@tanstack/react-query';
import { getOrders } from '@/lib/api/orders';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice, formatDateTime } from '@/lib/utils';
import { Package, ArrowLeft, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export default function OrdersPage() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: getOrders,
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
      case 'refunded':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <>
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al panel
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Mis Órdenes</h1>
        <p className="text-muted-foreground">
          Historial de tus compras y pedidos
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : orders?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No tienes órdenes</h2>
            <p className="text-muted-foreground mb-4">
              Explora nuestros productos y servicios
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild>
                <Link href="/products">Ver Productos</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/services">Ver Servicios</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders?.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <Package className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{order.order_number}</h3>
                        <Badge variant={getStatusBadgeVariant(order.status)}>
                          {order.status_display}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(order.created_at)}
                      </p>
                      <div className="mt-2 text-sm">
                        {order.product_items && order.product_items.length > 0 && (
                          <p className="text-muted-foreground">
                            {order.product_items.length} producto(s)
                          </p>
                        )}
                        {order.service_items && order.service_items.length > 0 && (
                          <p className="text-muted-foreground">
                            {order.service_items.length} servicio(s)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold">{formatPrice(order.total)}</p>
                      <p className="text-sm text-muted-foreground">
                        Subtotal: {formatPrice(order.subtotal)}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/orders/${order.id}`}>
                        Ver detalle
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
