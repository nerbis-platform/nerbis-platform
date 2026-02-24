// src/app/dashboard/staff/appointments/page.tsx

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getStaffAppointments,
  confirmAppointment,
  startAppointment,
  completeAppointment,
  cancelAppointment,
  noShowAppointment,
} from '@/lib/api/bookings';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { toast } from 'sonner';
import {
  Calendar,
  Clock,
  User,
  ArrowLeft,
  Check,
  CheckCircle2,
  Play,
  X,
  UserX,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';

type TabFilter = 'all' | 'pending' | 'confirmed' | 'in_progress' | 'completed';

const STATUS_BORDER: Record<string, string> = {
  pending: 'border-l-amber-400',
  confirmed: 'border-l-blue-500',
  in_progress: 'border-l-violet-500',
  completed: 'border-l-green-500',
  cancelled: 'border-l-red-400',
  expired: 'border-l-red-400',
  no_show: 'border-l-orange-400',
};

const STATUS_DATE_BG: Record<string, string> = {
  pending: 'bg-amber-50 dark:bg-amber-950/30',
  confirmed: 'bg-blue-50 dark:bg-blue-950/30',
  in_progress: 'bg-violet-50 dark:bg-violet-950/30',
  completed: 'bg-green-50 dark:bg-green-950/30',
  cancelled: 'bg-muted/50',
  expired: 'bg-muted/50',
  no_show: 'bg-orange-50 dark:bg-orange-950/30',
};

function parseDateParts(dateString: string) {
  const date = new Date(dateString);
  return {
    dayName: date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase(),
    dayNumber: date.getDate(),
    month: date.toLocaleDateString('es-ES', { month: 'short' }),
    time: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function StaffAppointmentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [noShowId, setNoShowId] = useState<number | null>(null);

  const isAuthorized = !user || user.role === 'staff' || user.role === 'admin';

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['staff-appointments', activeTab],
    queryFn: () =>
      getStaffAppointments(activeTab !== 'all' ? { status: activeTab } : undefined),
    enabled: isAuthorized,
  });

  const confirmMutation = useMutation({
    mutationFn: confirmAppointment,
    onSuccess: () => {
      toast.success('Reserva confirmada');
      invalidateAll();
    },
    onError: () => toast.error('Error al confirmar la reserva'),
  });

  const startMutation = useMutation({
    mutationFn: startAppointment,
    onSuccess: () => {
      toast.success('Servicio iniciado');
      invalidateAll();
    },
    onError: () => toast.error('Error al iniciar el servicio'),
  });

  const completeMutation = useMutation({
    mutationFn: completeAppointment,
    onSuccess: () => {
      toast.success('Servicio finalizado');
      invalidateAll();
    },
    onError: () => toast.error('Error al finalizar el servicio'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelAppointment(id, 'Cancelado por staff'),
    onSuccess: () => {
      toast.success('Cita cancelada');
      setCancelingId(null);
      invalidateAll();
    },
    onError: () => {
      toast.error('Error al cancelar la cita');
      setCancelingId(null);
    },
  });

  const noShowMutation = useMutation({
    mutationFn: noShowAppointment,
    onSuccess: () => {
      toast.success('Cita marcada como No Asistió');
      setNoShowId(null);
      invalidateAll();
    },
    onError: () => {
      toast.error('Error al marcar como No Asistió');
      setNoShowId(null);
    },
  });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['staff-appointments'] });
    queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
    queryClient.invalidateQueries({ queryKey: ['staff-appointments-today'] });
  }

  if (!isAuthorized) {
    router.push('/dashboard');
    return null;
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'default' as const;
      case 'in_progress':
        return 'default' as const;
      case 'pending':
        return 'secondary' as const;
      case 'completed':
        return 'outline' as const;
      case 'cancelled':
      case 'expired':
      case 'no_show':
        return 'destructive' as const;
      default:
        return 'secondary' as const;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === 'in_progress') return 'bg-violet-600 hover:bg-violet-600';
    if (status === 'no_show') return 'bg-orange-500 hover:bg-orange-500';
    return '';
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
        <h1 className="text-3xl font-bold">Gestión de Citas</h1>
        <p className="text-muted-foreground">
          Administra las citas asignadas a ti
        </p>
      </div>

      {/* Tabs de filtro */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabFilter)}
        className="mb-6"
      >
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmadas</TabsTrigger>
          <TabsTrigger value="in_progress">En Progreso</TabsTrigger>
          <TabsTrigger value="completed">Completadas</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Lista de citas */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : !appointments || appointments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Sin citas</h2>
            <p className="text-muted-foreground">
              {activeTab === 'pending'
                ? 'No tienes citas pendientes de confirmar'
                : activeTab === 'confirmed'
                ? 'No tienes citas confirmadas'
                : activeTab === 'in_progress'
                ? 'No hay servicios en progreso'
                : activeTab === 'completed'
                ? 'No hay citas completadas'
                : 'No se encontraron citas'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => {
            const d = parseDateParts(appointment.start_datetime);
            const border = STATUS_BORDER[appointment.status] || 'border-l-muted';
            const dateBg = STATUS_DATE_BG[appointment.status] || 'bg-muted/50';
            const hasActions = ['pending', 'confirmed', 'in_progress'].includes(appointment.status);

            return (
              <Card key={appointment.id} className={`border-l-4 ${border} overflow-hidden`}>
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    {/* Bloque fecha/hora */}
                    <div className={`${dateBg} flex sm:flex-col items-center justify-center gap-1 px-5 py-3 sm:py-5 sm:min-w-25 shrink-0`}>
                      <span className="text-xs font-semibold text-muted-foreground tracking-wide">{d.dayName}</span>
                      <span className="text-2xl font-bold leading-none">{d.dayNumber}</span>
                      <span className="text-xs text-muted-foreground capitalize">{d.month}</span>
                      <span className="text-sm font-medium mt-1">{d.time}</span>
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 px-5 py-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="font-semibold text-base">
                          {appointment.service?.name || 'Servicio'}
                        </h3>
                        <Badge
                          variant={getStatusBadgeVariant(appointment.status)}
                          className={`shrink-0 ${getStatusBadgeClass(appointment.status)}`}
                        >
                          {appointment.status_display}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {appointment.service?.formatted_duration || `${appointment.duration_minutes} min`}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          {appointment.customer?.full_name || 'Cliente'}
                        </span>
                      </div>

                      {appointment.notes && (
                        <p className="mt-2 text-sm text-muted-foreground flex items-start gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{appointment.notes}</span>
                        </p>
                      )}

                      {hasActions && (
                        <>
                          <Separator className="my-3" />
                          <div className="flex gap-2 flex-wrap">
                            {/* Pendiente → Confirmar reserva */}
                            {appointment.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => confirmMutation.mutate(appointment.id)}
                                disabled={confirmMutation.isPending}
                              >
                                <Check className="h-4 w-4 mr-1.5" />
                                Confirmar Reserva
                              </Button>
                            )}

                            {/* Confirmada → Iniciar servicio o No Show */}
                            {appointment.status === 'confirmed' && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-violet-600 hover:bg-violet-700 text-white"
                                  onClick={() => startMutation.mutate(appointment.id)}
                                  disabled={startMutation.isPending}
                                >
                                  <Play className="h-4 w-4 mr-1.5" />
                                  Iniciar Servicio
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700 dark:border-orange-800 dark:hover:bg-orange-950"
                                  onClick={() => setNoShowId(appointment.id)}
                                >
                                  <UserX className="h-4 w-4 mr-1.5" />
                                  No Asistió
                                </Button>
                              </>
                            )}

                            {/* En Progreso → Finalizar servicio */}
                            {appointment.status === 'in_progress' && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => completeMutation.mutate(appointment.id)}
                                disabled={completeMutation.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                Finalizar Servicio
                              </Button>
                            )}

                            {/* Cancelar siempre disponible en pending/confirmed */}
                            {['pending', 'confirmed'].includes(appointment.status) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setCancelingId(appointment.id)}
                              >
                                <X className="h-4 w-4 mr-1.5" />
                                Cancelar
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog de confirmación de cancelación */}
      <AlertDialog open={cancelingId !== null} onOpenChange={() => setCancelingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar esta cita?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cancelará la cita y notificará al cliente. El horario quedará disponible nuevamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, mantener</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => cancelingId && cancelMutation.mutate(cancelingId)}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? 'Cancelando...' : 'Sí, cancelar cita'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmación de No Show */}
      <AlertDialog open={noShowId !== null} onOpenChange={() => setNoShowId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Marcar como No Asistió?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto indica que el cliente no se presentó a su cita. El horario quedará disponible nuevamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-500 text-white hover:bg-orange-600"
              onClick={() => noShowId && noShowMutation.mutate(noShowId)}
              disabled={noShowMutation.isPending}
            >
              {noShowMutation.isPending ? 'Marcando...' : 'Sí, no asistió'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
