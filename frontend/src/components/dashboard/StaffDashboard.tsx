// src/components/dashboard/StaffDashboard.tsx

'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStaffStats, getStaffAppointments } from '@/lib/api/bookings';
import { getStaffMyProfile } from '@/lib/api/services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Scissors,
  ArrowRight,
  User,
} from 'lucide-react';
import Link from 'next/link';

export default function StaffDashboard() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['staff-stats'],
    queryFn: getStaffStats,
  });

  const today = new Date().toISOString().split('T')[0];
  const { data: todayAppointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['staff-appointments-today'],
    queryFn: () => getStaffAppointments({ start_date: today, end_date: `${today}T23:59:59` }),
  });

  const { data: staffProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['staff-my-profile'],
    queryFn: getStaffMyProfile,
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'default' as const;
      case 'pending':
        return 'secondary' as const;
      case 'completed':
        return 'outline' as const;
      case 'cancelled':
      case 'expired':
        return 'destructive' as const;
      default:
        return 'secondary' as const;
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Panel de Staff</h1>
        <p className="text-muted-foreground">
          Bienvenido{mounted && user ? `, ${user.first_name}` : ''}
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statsLoading ? (
          [...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.today_count ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Citas Hoy</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.pending_count ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Pendientes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.confirmed_count ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Confirmadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.completed_today ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Completadas Hoy</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Citas del día */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Citas de Hoy
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/staff/appointments">
                  Ver todas
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
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
            ) : !todayAppointments || todayAppointments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No tienes citas programadas para hoy
              </p>
            ) : (
              <div className="space-y-3">
                {todayAppointments.slice(0, 5).map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">
                          {appointment.service?.name || 'Servicio'}
                        </p>
                        <Badge variant={getStatusBadgeVariant(appointment.status)} className="text-xs shrink-0">
                          {appointment.status_display}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(appointment.start_datetime).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {appointment.customer?.full_name || 'Cliente'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mis Servicios */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Scissors className="h-5 w-5" />
                Mis Servicios
              </CardTitle>
              {stats?.upcoming_count ? (
                <Badge variant="secondary" className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {stats.upcoming_count} próximas
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {profileLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : !staffProfile?.services || staffProfile.services.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No tienes servicios asignados
              </p>
            ) : (
              <div className="space-y-3">
                {staffProfile.services.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{service.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {service.formatted_duration} - ${service.price}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {service.category?.name || 'Sin categoría'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Link rápido a gestión de citas */}
      <div className="mt-8">
        <Button asChild className="w-full md:w-auto">
          <Link href="/dashboard/staff/appointments">
            <Calendar className="h-4 w-4 mr-2" />
            Gestionar Todas las Citas
          </Link>
        </Button>
      </div>
    </>
  );
}
