// src/app/(shop)/services/[id]/book/page.tsx

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getService } from '@/lib/api/services';
import { createAppointment } from '@/lib/api/bookings';
import { canReview, createReview } from '@/lib/api/reviews';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AvailabilityCalendar } from '@/components/bookings/AvailabilityCalendar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, Clock, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReviewsList } from '@/components/reviews/ReviewsList';
import { ReviewForm } from '@/components/reviews/ReviewForm';

export default function BookServicePage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = parseInt(params.id as string);
  const [notes, setNotes] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<{
    staffMemberId: number;
    startDateTime: string;
    staffMemberName: string;
  } | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const { addService } = useCart();
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const queryClient = useQueryClient();

  const { data: service, isLoading } = useQuery({
    queryKey: ['service', serviceId],
    queryFn: () => getService(serviceId),
  });

  const { data: canReviewData } = useQuery({
    queryKey: ['can-review', 'service', serviceId],
    queryFn: () => canReview(serviceId, 'service'),
    enabled: isAuthenticated,
  });

  const createReviewMutation = useMutation({
    mutationFn: (data: { rating: number; title?: string; comment: string; images?: File[] }) =>
      createReview({
        service_id: serviceId,
        ...data,
      }),
    onSuccess: () => {
      setShowReviewForm(false);
      toast.success('Gracias por tu opinión');
      queryClient.invalidateQueries({ queryKey: ['reviews', 'service', serviceId] });
      queryClient.invalidateQueries({ queryKey: ['service', serviceId] });
      queryClient.invalidateQueries({ queryKey: ['can-review', 'service', serviceId] });
    },
    onError: () => {
      toast.error('Error al enviar tu opinión');
    },
  });

  // Mutation for authenticated users (create real appointment)
  const createAppointmentMutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: async (appointment) => {
      // Agregar servicio con cita al carrito
      await addService(serviceId, appointment.id);
      toast.success('Cita agregada al carrito');
      router.push('/cart');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Error al crear la cita';
      toast.error(message);
    },
  });

  const handleConfirmBooking = async () => {
    if (!selectedSlot || !service) {
      toast.error('Selecciona un horario');
      return;
    }

    if (isAuthenticated) {
      // Usuario autenticado: crear cita real en el servidor
      createAppointmentMutation.mutate({
        service: serviceId,
        staff_member: selectedSlot.staffMemberId,
        start_datetime: selectedSlot.startDateTime,
        notes: notes || undefined,
      });
    } else {
      // Usuario anónimo: agregar al carrito local
      setIsAddingToCart(true);
      try {
        await addService(
          serviceId,
          {
            staff_member_id: selectedSlot.staffMemberId,
            staff_member_name: selectedSlot.staffMemberName,
            start_datetime: selectedSlot.startDateTime,
            notes: notes || undefined,
          },
          {
            name: service.name,
            price: service.price,
            description: service.short_description || service.description,
            duration_minutes: service.duration_minutes,
            formatted_duration: service.formatted_duration,
          }
        );
        toast.success('Cita agregada al carrito');
        router.push('/cart');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error al agregar al carrito';
        toast.error(message);
      } finally {
        setIsAddingToCart(false);
      }
    }
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="container py-8">
          <Skeleton className="h-150" />
        </main>
        <Footer />
      </>
    );
  }

  if (!service) {
    return (
      <>
        <Header />
        <main className="container py-8">
          <p>Servicio no encontrado</p>
        </main>
        <Footer />
      </>
    );
  }

  const isProcessing = createAppointmentMutation.isPending || isAddingToCart;

  return (
    <>
      <Header />
      <main className="container py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/services">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a servicios
          </Link>
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Info del servicio */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <Badge variant="outline" className="w-fit mb-2">
                  {service.category.name}
                </Badge>
                <CardTitle>{service.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{service.description}</p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{service.formatted_duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{formatPrice(service.price)}</span>
                  </div>
                </div>

                {service.requires_deposit && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">
                      <strong>Depósito requerido:</strong>{' '}
                      {formatPrice(service.deposit_amount || '0')}
                    </p>
                  </div>
                )}

                {/* Selected slot summary */}
                {selectedSlot && (
                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-sm font-medium mb-2">Horario seleccionado:</p>
                    <div className="space-y-1 text-sm">
                      <p className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        {new Date(selectedSlot.startDateTime).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        {new Date(selectedSlot.startDateTime).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="text-muted-foreground">
                        con {selectedSlot.staffMemberName}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Notas (opcional)
                  </label>
                  <Textarea
                    placeholder="¿Alguna indicación especial?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  disabled={!selectedSlot || isProcessing}
                  onClick={handleConfirmBooking}
                >
                  {isProcessing ? (
                    'Procesando...'
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      Agregar al Carrito
                    </>
                  )}
                </Button>

                {!isAuthenticated && (
                  <p className="text-xs text-muted-foreground text-center">
                    Podrás iniciar sesión o registrarte al momento del pago
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Calendario */}
          <div className="lg:col-span-2">
            <AvailabilityCalendar
              serviceId={serviceId}
              onSelectSlot={setSelectedSlot}
            />
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">
            Opiniones ({service.reviews_count || 0})
          </h2>

          {/* Botón para escribir review */}
          {!showReviewForm && (
            <>
              {!isAuthenticated ? (
                <div className="mb-6">
                  <Button asChild>
                    <Link href={`/login?redirect=${encodeURIComponent(pathname)}`}>
                      Escribir una opinión
                    </Link>
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    Inicia sesión para dejar tu opinión
                  </p>
                </div>
              ) : canReviewData?.can_review ? (
                <div className="mb-6">
                  <Button onClick={() => setShowReviewForm(true)}>
                    Escribir una opinión
                  </Button>
                  {canReviewData.has_purchased && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ Has utilizado este servicio
                    </p>
                  )}
                </div>
              ) : canReviewData?.existing_review ? (
                <div className="bg-muted p-4 rounded-lg mb-6">
                  <p className="text-sm text-muted-foreground">
                    Ya dejaste una opinión para este servicio
                  </p>
                </div>
              ) : null}
            </>
          )}

          {/* Formulario de review */}
          {showReviewForm && (
            <div className="mb-6">
              <ReviewForm
                itemId={serviceId}
                itemType="service"
                itemName={service.name}
                onSubmit={async (data) => {
                  await createReviewMutation.mutateAsync(data);
                }}
                onCancel={() => setShowReviewForm(false)}
              />
            </div>
          )}

          {/* Lista de reviews */}
          <ReviewsList
            itemId={serviceId}
            itemType="service"
            averageRating={parseFloat(service.average_rating || '0')}
            totalReviews={service.reviews_count || 0}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
