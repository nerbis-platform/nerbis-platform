// src/app/(shop)/cart/page.tsx

'use client';

import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatPrice, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';
import { ShoppingCart, Minus, Plus, Trash2, ArrowRight, Calendar, Clock, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { CouponInput } from '@/components/cart/CouponInput';

export default function CartPage() {
  const router = useRouter();
  const { cart, isLoading, isLocalCart, updateItem, removeItem } = useCart();

  const handleUpdateQuantity = async (itemId: number | string, newQuantity: number) => {
    try {
      await updateItem(itemId, newQuantity);
    } catch {
      toast.error('Error al actualizar cantidad');
    }
  };

  const handleRemoveItem = async (itemId: number | string, isService: boolean = false) => {
    try {
      await removeItem(itemId);
      toast.success(isService ? 'Cita cancelada exitosamente' : 'Item eliminado del carrito');
    } catch {
      toast.error(isService ? 'Error al cancelar la cita' : 'Error al eliminar item');
    }
  };

  const handleCheckout = () => {
    router.push('/checkout');
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="container py-8">
          <p>Cargando carrito...</p>
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
              <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">Tu carrito está vacío</h2>
              <p className="text-muted-foreground mb-6">
                Agrega productos o agenda un servicio para empezar
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild>
                  <Link href="/products">Ver Productos</Link>
                </Button>
                <Button variant="outline" asChild>
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

  return (
    <>
      <Header />
      <main className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Carrito de Compras</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Items del carrito */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => {
              // Check if it's a local cart item with pending appointment
              const isPendingAppointment = 'pending_appointment' in item && item.pending_appointment;
              const hasServerAppointment = 'appointment' in item && item.appointment;
              const itemId = item.id;
              const productImage =
                item.item_type === 'product'
                  ? (('main_image' in item.item_data && item.item_data.main_image) ||
                      ('images' in item.item_data
                        ? item.item_data.images?.[0]?.image_url || item.item_data.images?.[0]?.image
                        : undefined))
                  : undefined;

              return (
                <Card key={itemId}>
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      {/* Imagen */}
                      {item.item_type === 'product' && productImage && (
                        <div className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden">
                          <Image
                            src={productImage}
                            alt={item.item_data.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}

                      {/* Información */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-1">
                          {item.item_data.name}
                        </h3>

                        {/* Local cart item - pending appointment (not yet confirmed) */}
                        {isPendingAppointment && (
                          <div className="text-sm text-muted-foreground space-y-1 mt-2">
                            <p className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {new Date(item.pending_appointment!.start_datetime).toLocaleDateString('es-ES', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                              })}
                            </p>
                            <p className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              {new Date(item.pending_appointment!.start_datetime).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                            <p className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {item.pending_appointment!.staff_member_name}
                            </p>
                            {'formatted_duration' in item.item_data && item.item_data.formatted_duration && (
                              <p className="text-xs">
                                Duración: {item.item_data.formatted_duration}
                              </p>
                            )}
                            <p className="text-xs text-amber-600 mt-2">
                              La cita se confirmará al completar el pago
                            </p>
                          </div>
                        )}

                        {/* Server cart item - confirmed appointment */}
                        {hasServerAppointment && (
                          <div className="text-sm text-muted-foreground space-y-1 mt-2">
                            <p className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {formatDateTime(item.appointment!.start_datetime)}
                            </p>
                            <p className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {item.appointment!.staff_member?.full_name || 'Personal por asignar'}
                            </p>
                            <p className="text-xs">
                              Estado:{' '}
                              <span className={
                                item.appointment!.status === 'expired' || item.appointment!.is_expired
                                  ? 'text-red-500'
                                  : item.appointment!.status === 'confirmed'
                                  ? 'text-green-600'
                                  : 'text-amber-600'
                              }>
                                {item.appointment!.status === 'expired' || item.appointment!.is_expired
                                  ? 'Reserva expirada'
                                  : item.appointment!.status_display}
                              </span>
                            </p>
                            {item.appointment!.status === 'pending' && item.appointment!.expires_at && (
                              <p className="text-xs text-amber-600">
                                Expira: {formatDateTime(item.appointment!.expires_at)}
                              </p>
                            )}
                          </div>
                        )}

                        <p className="text-lg font-bold mt-2">
                          {formatPrice(item.total_price)}
                        </p>
                      </div>

                      {/* Controles */}
                      <div className="flex flex-col items-end justify-between">
                        {item.item_type === 'product' ? (
                          <div className="flex items-center border rounded-lg">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleUpdateQuantity(itemId, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-12 text-center font-medium">
                              {item.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleUpdateQuantity(itemId, item.quantity + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            Cantidad: 1
                          </div>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveItem(itemId, item.item_type === 'service')}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {item.item_type === 'service' ? 'Cancelar Cita' : 'Eliminar'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Resumen */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-bold">Resumen</h2>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatPrice(cart.subtotal)}</span>
                  </div>
                  {cart.discount_amount && parseFloat(cart.discount_amount) > 0 && (
                    <div className="flex justify-between text-primary">
                      <span>Descuento</span>
                      <span className="font-medium">-{formatPrice(cart.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IVA (21%)</span>
                    <span className="font-medium">{formatPrice(cart.tax_amount)}</span>
                  </div>
                </div>

                <Separator />

                {/* Cupón de descuento */}
                <CouponInput />

                <Separator />

                <div className="flex justify-between text-lg">
                  <span className="font-bold">Total</span>
                  <span className="font-bold">{formatPrice(cart.total)}</span>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCheckout}
                >
                  Proceder al Pago
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Pago seguro con Stripe
                </p>

                {isLocalCart && (
                  <p className="text-xs text-amber-600 text-center">
                    Necesitarás iniciar sesión o crear una cuenta para completar la compra
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
