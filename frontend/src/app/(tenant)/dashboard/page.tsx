// src/app/dashboard/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOrders } from '@/lib/api/orders';
import { getUpcomingAppointments } from '@/lib/api/bookings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice, formatDateTime } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Calendar, Package, User } from 'lucide-react';
import Link from 'next/link';
import { PipeBubble } from '@/components/pipe';

function CustomerDashboard() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: getOrders,
  });

  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['upcoming-appointments'],
    queryFn: getUpcomingAppointments,
  });

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mi Panel</h1>
        <p className="text-muted-foreground">
          Bienvenido{mounted && user ? `, ${user.first_name}` : ''}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Órdenes</p>
                <p className="text-2xl font-bold">{orders?.length || 0}</p>
              </div>
              <Package className="h-12 w-12 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Próximas Citas</p>
                <p className="text-2xl font-bold">{appointments?.length || 0}</p>
              </div>
              <Calendar className="h-12 w-12 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Link href="/dashboard/profile">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Mi Cuenta</p>
                  <p className="text-2xl font-bold">{mounted ? user?.role_display : '-'}</p>
                </div>
                <User className="h-12 w-12 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Próximas Citas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Próximas Citas</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/appointments">Ver todas</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {appointmentsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : appointments?.length === 0 ? (
              <div className="py-4 space-y-3">
                <p className="text-muted-foreground text-center">
                  No tienes citas próximas
                </p>
                <PipeBubble
                  message="Cuando agendes una cita, aparecerá aquí."
                  mood="idle"
                  size="sm"
                  storageKey="dashboard-appointments-empty"
                />
              </div>
            ) : (
              <div className="space-y-3">
                {appointments?.slice(0, 3).map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{appointment.service.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(appointment.start_datetime)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Con {appointment.staff_member.full_name}
                      </p>
                    </div>
                    <Badge>{appointment.status_display}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimas Órdenes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Últimas Órdenes</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/orders">Ver todas</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : orders?.length === 0 ? (
              <div className="py-4 space-y-3">
                <p className="text-muted-foreground text-center">
                  No tienes órdenes
                </p>
                <PipeBubble
                  message="Tu historial de compras aparecerá aquí."
                  mood="idle"
                  size="sm"
                  storageKey="dashboard-orders-empty"
                />
              </div>
            ) : (
              <div className="space-y-3">
                {orders?.slice(0, 3).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(order.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatPrice(order.total)}</p>
                      <Badge variant={order.status === 'paid' ? 'default' : 'secondary'}>
                        {order.status_display}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// Lazy import para StaffDashboard (se crea en Fase 5)
import dynamic from 'next/dynamic';
const StaffDashboard = dynamic(
  () => import('@/components/dashboard/StaffDashboard'),
  { loading: () => <Skeleton className="h-96" /> }
);

export default function DashboardPage() {
  const { user, tenant } = useAuth();
  const router = useRouter();

  // Admin sin sitio publicado → redirigir antes de renderizar
  const shouldRedirect =
    user?.role === 'admin' && tenant && tenant.website_status !== 'published';

  useEffect(() => {
    if (!shouldRedirect) return;
    if (!tenant!.modules_configured) {
      router.replace('/dashboard/website-builder/quick-start');
    } else {
      router.replace('/dashboard/website-builder');
    }
  }, [shouldRedirect, tenant, router]);

  // Bloquear render mientras se decide el destino
  if (shouldRedirect) return null;

  if (user?.role === 'staff') {
    return <StaffDashboard />;
  }

  return <CustomerDashboard />;
}
