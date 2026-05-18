// src/app/dashboard/orders/[id]/page.tsx

'use client';

import { useQuery } from '@tanstack/react-query';
import { getOrder } from '@/lib/api/orders';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { formatPrice, formatDateTime } from '@/lib/utils';
import {
  Package,
  ArrowLeft,
  Calendar,
  CreditCard,
  User,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Image from 'next/image';

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = parseInt(params.id as string);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrder(orderId),
    enabled: !!orderId,
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
      case 'confirmed':
        return 'default';
      case 'pending':
      case 'processing':
        return 'secondary';
      case 'cancelled':
      case 'refunded':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
      case 'processing':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  if (error) {
    return (
      <>
        <Header />
        <main className="container py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h2 className="text-xl font-semibold mb-2">Error al cargar la orden</h2>
              <p className="text-muted-foreground mb-4">
                No se pudo encontrar la orden solicitada
              </p>
              <Button asChild>
                <Link href="/dashboard/orders">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver a mis órdenes
                </Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="container py-8">
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/dashboard/orders">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a mis órdenes
            </Link>
          </Button>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-6 w-96" />
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Orden {order?.order_number}</h1>
                  <p className="text-muted-foreground">
                    Realizada el {order && formatDateTime(order.created_at)}
                  </p>
                </div>
                <Badge variant={getStatusBadgeVariant(order?.status || '')} className="text-lg py-2 px-4">
                  {order?.status_display}
                </Badge>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna principal - Productos y Servicios */}
          <div className="lg:col-span-2 space-y-6">
            {/* Productos */}
            {isLoading ? (
              <Skeleton className="h-64" />
            ) : order?.product_items && order.product_items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Productos ({order.product_items.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {order.product_items.map((item) => (
                    <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
                      <div className="relative h-20 w-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                        {item.product.images && item.product.images.length > 0 ? (
                          <Image
                            src={item.product.images[0].image_url || item.product.images[0].image}
                            alt={item.product_name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{item.product_name}</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          Cantidad: {item.quantity}
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Precio unitario: </span>
                          <span className="font-medium">{formatPrice(item.unit_price)}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatPrice(item.total_price)}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Servicios */}
            {isLoading ? (
              <Skeleton className="h-64" />
            ) : order?.service_items && order.service_items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Servicios Reservados ({order.service_items.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {order.service_items.map((item) => (
                    <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
                      <div className="relative h-20 w-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                        {item.service.image ? (
                          <Image
                            src={item.service.image_url || item.service.image}
                            alt={item.service_name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Calendar className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{item.service_name}</h4>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {item.staff_member_name}
                          </p>
                          <p className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {formatDateTime(item.appointment_datetime)}
                          </p>
                          <p className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {item.service_duration} minutos
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatPrice(item.price)}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Información del Cliente */}
            {isLoading ? (
              <Skeleton className="h-48" />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Información de Facturación
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{order?.billing_name}</p>
                      <p className="text-sm text-muted-foreground">Nombre completo</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{order?.billing_email}</p>
                      <p className="text-sm text-muted-foreground">Correo electrónico</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Columna lateral - Resumen y Pagos */}
          <div className="space-y-6">
            {/* Resumen de Orden */}
            {isLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Resumen de Orden</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{formatPrice(order?.subtotal || '0')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Impuestos</span>
                      <span className="font-medium">{formatPrice(order?.tax_amount || '0')}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="font-semibold text-lg">Total</span>
                      <span className="font-bold text-2xl">{formatPrice(order?.total || '0')}</span>
                    </div>
                  </div>

                  {order?.paid_at && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Pagado el {formatDateTime(order.paid_at)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Información de Pagos */}
            {isLoading ? (
              <Skeleton className="h-48" />
            ) : order?.payments && order.payments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Pagos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {order.payments.map((payment) => (
                    <div key={payment.id} className="space-y-3 pb-4 border-b last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getPaymentStatusIcon(payment.status)}
                          <span className="font-medium">{payment.status_display}</span>
                        </div>
                        <Badge variant={getStatusBadgeVariant(payment.status)}>
                          {payment.payment_method}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Monto:</span>
                          <span className="font-semibold">{formatPrice(payment.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Creado:</span>
                          <span>{formatDateTime(payment.created_at)}</span>
                        </div>
                        {payment.processed_at && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Procesado:</span>
                            <span>{formatDateTime(payment.processed_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
