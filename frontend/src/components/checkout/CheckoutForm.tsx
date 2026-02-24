// src/components/checkout/CheckoutForm.tsx

'use client';

import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { confirmPayment } from '@/lib/api/orders';

interface CheckoutFormProps {
  orderId: number;
  paymentIntentId: string;
  onSuccess: () => void;
}

export function CheckoutForm({ orderId, paymentIntentId, onSuccess }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast.error(error.message || 'Error al procesar el pago');
      } else {
        // Confirmar pago en el backend
        // Esto es esencial para confirmar las citas, especialmente en desarrollo
        // donde el webhook de Stripe no está disponible
        try {
          const result = await confirmPayment(orderId, paymentIntentId);
          console.log('Pago confirmado en backend:', result);
          toast.success('¡Pago exitoso!');
          onSuccess();
        } catch (confirmError) {
          // Aún así redirigir, pero mostrar advertencia
          console.error('Error confirmando pago en backend:', confirmError);
          toast.success('¡Pago procesado! Tu cita será confirmada en breve.');
          onSuccess();
        }
      }
    } catch {
      toast.error('Error al procesar el pago');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Procesando pago...
          </>
        ) : (
          'Pagar Ahora'
        )}
      </Button>
    </form>
  );
}