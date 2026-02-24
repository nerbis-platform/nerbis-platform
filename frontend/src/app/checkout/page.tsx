// src/app/checkout/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useMutation } from '@tanstack/react-query';
import { createOrder, createPaymentIntent } from '@/lib/api/orders';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';
import { Loader2, LogIn, UserPlus, ShoppingCart, Calendar, Clock, User } from 'lucide-react';
import Link from 'next/link';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);

const checkoutSchema = z.object({
  billing_name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  billing_email: z.string().email('Email inválido'),
  billing_phone: z.string().optional(),
  billing_address: z.string().optional(),
  billing_city: z.string().optional(),
  billing_postal_code: z.string().optional(),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, clearCart, isLocalCart, syncCartToServer } = useCart();
  const { isAuthenticated, user } = useAuth();
  const [clientSecret, setClientSecret] = useState<string>('');
  const [orderId, setOrderId] = useState<number | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Evitar errores de hidratación
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      billing_name: '',
      billing_email: '',
      billing_phone: '',
      billing_address: '',
      billing_city: '',
      billing_postal_code: '',
    },
  });

  // Pre-fill form with user data when authenticated
  useEffect(() => {
    if (user) {
      form.setValue('billing_name', user.full_name || `${user.first_name} ${user.last_name}`);
      form.setValue('billing_email', user.email);
      if (user.phone) {
        form.setValue('billing_phone', user.phone);
      }
    }
  }, [user, form]);

  // Sync local cart with server when user is authenticated
  useEffect(() => {
    const syncCart = async () => {
      if (isAuthenticated && isLocalCart) {
        setIsSyncing(true);
        try {
          await syncCartToServer();
        } catch (error) {
          console.error('Error syncing cart:', error);
        } finally {
          setIsSyncing(false);
        }
      }
    };
    syncCart();
  }, [isAuthenticated, isLocalCart, syncCartToServer]);

  const createOrderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: async (order) => {
      setOrderId(order.id);

      // Crear Payment Intent
      try {
        const paymentData = await createPaymentIntent(order.id);
        setClientSecret(paymentData.client_secret);
        setPaymentIntentId(paymentData.payment_intent_id);
      } catch (error) {
        console.error('Error creating payment intent:', error);
        const message = error instanceof Error ? error.message : 'Error al inicializar el pago';
        toast.error(message);
      }
    },
    onError: (error) => {
      console.error('Error creating order:', error);
      const message = error instanceof Error ? error.message : 'Error al crear la orden';
      toast.error(message);
    },
  });

  const onSubmit = async (data: CheckoutFormValues) => {
    // Si aún hay items locales, sincronizar primero
    if (isLocalCart) {
      try {
        await syncCartToServer();
      } catch {
        toast.error('Error al sincronizar el carrito. Intenta de nuevo.');
        return;
      }
    }

    createOrderMutation.mutate({
      ...data,
      use_billing_for_shipping: true,
    });
  };

  const handlePaymentSuccess = async () => {
    await clearCart();
    router.push(`/checkout/success?order_id=${orderId}`);
  };

  // Show loading state during hydration to avoid mismatch
  if (!isMounted) {
    return (
      <>
        <Header />
        <main className="container py-8">
          <Card className="max-w-md mx-auto text-center py-12">
            <CardContent>
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <h2 className="text-xl font-semibold mb-2">Cargando...</h2>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </>
    );
  }

  // Show login/register prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <Header />
        <main className="container py-8">
          <h1 className="text-3xl font-bold mb-8">Checkout</h1>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Login/Register prompt */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Inicia sesión para continuar</CardTitle>
                  <CardDescription>
                    Para completar tu compra, necesitas iniciar sesión o crear una cuenta.
                    Tu carrito se mantendrá guardado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button asChild className="w-full" size="lg">
                    <Link href={`/login?redirect=/checkout`}>
                      <LogIn className="mr-2 h-5 w-5" />
                      Iniciar Sesión
                    </Link>
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        o
                      </span>
                    </div>
                  </div>

                  <Button asChild variant="outline" className="w-full" size="lg">
                    <Link href={`/register?redirect=/checkout`}>
                      <UserPlus className="mr-2 h-5 w-5" />
                      Crear Cuenta
                    </Link>
                  </Button>

                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Al crear una cuenta podrás ver el historial de tus pedidos,
                    gestionar tus citas y acceder a ofertas exclusivas.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Cart summary */}
            <div>
              <Card className="sticky top-20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Tu Carrito
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cart && cart.items.length > 0 ? (
                    <>
                      {/* Items */}
                      <div className="space-y-3">
                        {cart.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <div className="flex-1">
                              <p className="font-medium">{item.item_data.name}</p>
                              {item.item_type === 'service' && 'pending_appointment' in item && item.pending_appointment && (
                                <div className="text-xs text-muted-foreground mt-1 space-y-1">
                                  <p className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(item.pending_appointment.start_datetime).toLocaleDateString('es-ES', {
                                      weekday: 'short',
                                      day: 'numeric',
                                      month: 'short',
                                    })}
                                  </p>
                                  <p className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(item.pending_appointment.start_datetime).toLocaleTimeString('es-ES', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                    {' - '}{item.pending_appointment.staff_member_name}
                                  </p>
                                </div>
                              )}
                              {item.item_type === 'product' && (
                                <p className="text-muted-foreground">
                                  Cantidad: {item.quantity}
                                </p>
                              )}
                            </div>
                            <p className="font-medium">{formatPrice(item.total_price)}</p>
                          </div>
                        ))}
                      </div>

                      <Separator />

                      {/* Totales */}
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span>{formatPrice(cart.subtotal)}</span>
                        </div>
                        {cart.discount_amount && parseFloat(cart.discount_amount) > 0 && (
                          <div className="flex justify-between text-primary">
                            <span>Descuento {cart.coupon && `(${cart.coupon.code})`}</span>
                            <span>-{formatPrice(cart.discount_amount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">IVA (21%)</span>
                          <span>{formatPrice(cart.tax_amount)}</span>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span>{formatPrice(cart.total)}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      Tu carrito está vacío
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Show syncing state
  if (isSyncing) {
    return (
      <>
        <Header />
        <main className="container py-8">
          <Card className="max-w-md mx-auto text-center py-12">
            <CardContent>
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <h2 className="text-xl font-semibold mb-2">Sincronizando tu carrito...</h2>
              <p className="text-muted-foreground">
                Estamos preparando tu pedido, por favor espera.
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <>
        <Header />
        <main className="container py-8">
          <Card className="max-w-md mx-auto text-center py-12">
            <CardContent>
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-4">Tu carrito está vacío</h2>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild>
                  <Link href="/products">Ver Productos</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/services">Ver Servicios</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </>
    );
  }

  const appearance = {
    theme: 'stripe' as const,
  };

  return (
    <>
      <Header />
      <main className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Formulario */}
          <div>
            {!clientSecret ? (
              <Card>
                <CardHeader>
                  <CardTitle>Información de Facturación</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="billing_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre completo *</FormLabel>
                            <FormControl>
                              <Input placeholder="Juan Pérez" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="billing_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="juan@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="billing_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Teléfono</FormLabel>
                            <FormControl>
                              <Input placeholder="+34 600 000 000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="billing_address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dirección</FormLabel>
                            <FormControl>
                              <Input placeholder="Calle Principal 123" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="billing_city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ciudad</FormLabel>
                              <FormControl>
                                <Input placeholder="Madrid" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="billing_postal_code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Código Postal</FormLabel>
                              <FormControl>
                                <Input placeholder="28001" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        size="lg"
                        disabled={createOrderMutation.isPending}
                      >
                        {createOrderMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          'Continuar al Pago'
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Información de Pago</CardTitle>
                </CardHeader>
                <CardContent>
                  <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
                    <CheckoutForm
                      orderId={orderId!}
                      paymentIntentId={paymentIntentId}
                      onSuccess={handlePaymentSuccess}
                    />
                  </Elements>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Resumen */}
          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>Resumen del Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="space-y-3">
                  {cart.items.map((item) => {
                    const isPendingAppointment = 'pending_appointment' in item && item.pending_appointment;
                    const hasServerAppointment = 'appointment' in item && item.appointment;

                    return (
                      <div key={item.id} className="flex justify-between text-sm">
                        <div className="flex-1">
                          <p className="font-medium">{item.item_data.name}</p>

                          {/* Local cart - pending appointment */}
                          {item.item_type === 'service' && isPendingAppointment && (
                            <div className="text-xs text-muted-foreground mt-1 space-y-1">
                              <p className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(item.pending_appointment!.start_datetime).toLocaleDateString('es-ES', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </p>
                              <p className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(item.pending_appointment!.start_datetime).toLocaleTimeString('es-ES', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                              <p className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {item.pending_appointment!.staff_member_name}
                              </p>
                            </div>
                          )}

                          {/* Server cart - confirmed appointment */}
                          {item.item_type === 'service' && hasServerAppointment && (
                            <div className="text-xs text-muted-foreground mt-1 space-y-1">
                              <p className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(item.appointment!.start_datetime).toLocaleDateString('es-ES', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </p>
                              <p className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(item.appointment!.start_datetime).toLocaleTimeString('es-ES', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                              <p className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {item.appointment!.staff_member?.full_name || 'Personal por asignar'}
                              </p>
                            </div>
                          )}

                          {item.item_type === 'product' && (
                            <p className="text-muted-foreground">
                              Cantidad: {item.quantity}
                            </p>
                          )}
                        </div>
                        <p className="font-medium">{formatPrice(item.total_price)}</p>
                      </div>
                    );
                  })}
                </div>

                <Separator />

                {/* Totales */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(cart.subtotal)}</span>
                  </div>
                  {cart.discount_amount && parseFloat(cart.discount_amount) > 0 && (
                    <div className="flex justify-between text-primary">
                      <span>Descuento {cart.coupon && `(${cart.coupon.code})`}</span>
                      <span>-{formatPrice(cart.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IVA (21%)</span>
                    <span>{formatPrice(cart.tax_amount)}</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatPrice(cart.total)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
