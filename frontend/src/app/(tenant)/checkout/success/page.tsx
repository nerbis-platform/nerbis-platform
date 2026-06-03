// src/app/checkout/success/page.tsx

'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getOrder } from '@/lib/api/orders';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');

  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrder(parseInt(orderId!)),
    enabled: !!orderId,
  });

  return (
    <>
      <Header />
      <main className="container py-12">
        <Card className="max-w-2xl mx-auto text-center">
          <CardContent className="pt-12 pb-12 space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-6">
                <CheckCircle className="h-16 w-16 text-green-600" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold">¡Pago Exitoso!</h1>
              <p className="text-muted-foreground text-lg">
                Tu orden ha sido procesada correctamente
              </p>
            </div>

            {order && (
              <div className="bg-muted rounded-lg p-6 space-y-2">
                <p className="text-sm text-muted-foreground">Número de orden</p>
                <p className="text-2xl font-bold">{order.order_number}</p>
              </div>
            )}

            <p className="text-muted-foreground">
              Recibirás un email de confirmación con los detalles de tu orden.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button asChild size="lg">
                <Link href="/dashboard/orders">Ver mis órdenes</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/">Volver al inicio</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-auth-accent" />
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}