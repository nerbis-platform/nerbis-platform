// src/app/dashboard/appointments/page.tsx

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyAppointments, cancelAppointment } from '@/lib/api/bookings';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
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
import { Calendar, Clock, User, ArrowLeft, X, MessageSquare } from 'lucide-react';
import Link from 'next/link';

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

export default function AppointmentsPage() {
  const queryClient = useQueryClient();
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: getMyAppointments,
  });

  const cancelMutation = useMutation({
    mutationFn: (appointmentId: number) => cancelAppointment(appointmentId),
    onSuccess: () => {
      toast.success('Cita cancelada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-appointments'] });
      setCancelingId(null);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Error al cancelar la cita';
      toast.error(message);
      setCancelingId(null);
    },
  });

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

  const upcomingAppointments = appointments?.filter(
    (a) => ['pending', 'confirmed', 'in_progress'].includes(a.status) && !a.is_expired
  ) || [];

  const pastAppointments = appointments?.filter(
    (a) => ['completed', 'cancelled', 'expired', 'no_show'].includes(a.status) || a.is_expired
  ) || [];

  const renderAppointmentCard = (appointment: typeof upcomingAppointments[number], isPast = false) => {
    const d = parseDateParts(appointment.start_datetime);
    const border = STATUS_BORDER[appointment.status] || 'border-l-muted';
    const dateBg = STATUS_DATE_BG[appointment.status] || 'bg-muted/50';

    return (
      <Card
        key={appointment.id}
        className={`border-l-4 ${border} overflow-hidden ${isPast ? 'opacity-70' : ''}`}
      >
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
                  {appointment.is_expired ? 'Expirada' : appointment.status_display}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {appointment.service?.formatted_duration || `${appointment.duration_minutes} min`}
                </span>
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {appointment.staff_member?.full_name || 'Personal por asignar'}
                </span>
              </div>

              {appointment.notes && (
                <p className="mt-2 text-sm text-muted-foreground flex items-start gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{appointment.notes}</span>
                </p>
              )}

              {appointment.cancellation_reason && (
                <p className="mt-2 text-sm text-destructive flex items-start gap-1.5">
                  <X className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>Motivo: {appointment.cancellation_reason}</span>
                </p>
              )}

              {!isPast && appointment.can_cancel && (
                <>
                  <Separator className="my-3" />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setCancelingId(appointment.id)}
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    Cancelar cita
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
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
        <h1 className="text-3xl font-bold">Mis Citas</h1>
        <p className="text-muted-foreground">
          Gestiona tus citas y reservas
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : appointments?.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No tienes citas</h2>
            <p className="text-muted-foreground mb-4">
              Reserva un servicio para agendar tu primera cita
            </p>
            <Button asChild>
              <Link href="/services">Ver Servicios</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Próximas citas */}
          {upcomingAppointments.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Próximas Citas</h2>
              <div className="space-y-4">
                {upcomingAppointments.map((a) => renderAppointmentCard(a))}
              </div>
            </div>
          )}

          {/* Historial */}
          {pastAppointments.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Historial de Citas</h2>
              <div className="space-y-4">
                {pastAppointments.map((a) => renderAppointmentCard(a, true))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialog de confirmación de cancelación */}
      <AlertDialog open={cancelingId !== null} onOpenChange={() => setCancelingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar esta cita?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La cita será cancelada y el horario quedará disponible para otros clientes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, mantener cita</AlertDialogCancel>
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
    </>
  );
}
