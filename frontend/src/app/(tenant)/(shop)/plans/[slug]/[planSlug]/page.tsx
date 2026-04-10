// src/app/(shop)/plans/[slug]/[planSlug]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Check, ShoppingCart, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { SubscriptionPlan } from '@/types';

interface PageProps {
  params: Promise<{ slug: string; planSlug: string }>;
}

export default function PlanDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { user } = useAuth();
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const response = await apiClient.get<SubscriptionPlan>(
          `/subscriptions/plans/${resolvedParams.planSlug}/`
        );
        setPlan(response.data);
      } catch (error) {
        console.error('Error loading plan:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [resolvedParams.planSlug]);

  const handlePurchase = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión para comprar este plan');
      return;
    }

    if (!plan) return;

    setPurchasing(true);
    try {
      await apiClient.post('/subscriptions/purchase/', {
        service_plan_id: plan.id,
      });

      toast.success('Plan agregado al carrito exitosamente');
      // Redirect to cart or handle as needed
      // router.push('/cart');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      const errorMessage = err.response?.data?.error || 'Error al procesar la compra';
      toast.error(errorMessage);
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando plan...</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-muted rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Plan no disponible</h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Lo sentimos, el plan que buscas no está disponible en este momento o ya no existe.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={`/plans/${resolvedParams.slug}`}>
              <Button size="lg" variant="default">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Ver otros planes
              </Button>
            </Link>
            <Link href="/plans">
              <Button size="lg" variant="outline">
                Ver todas las categorías
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Back Button */}
      <Link href={`/plans/${resolvedParams.slug}`}>
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a planes
        </Button>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Header */}
          <div className="mb-8">
            {plan.is_featured && (
              <span className="inline-block bg-primary/10 text-primary text-sm font-medium px-3 py-1 rounded mb-3">
                Plan Destacado
              </span>
            )}
            <h1 className="text-4xl font-bold mb-4">{plan.name}</h1>
            <p className="text-xl text-muted-foreground">{plan.description}</p>
          </div>

          {/* Image */}
          {plan.image && (
            <div className="relative h-80 rounded-lg overflow-hidden mb-8">
              <Image
                src={plan.image}
                alt={plan.name}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Full Description */}
          {plan.full_description && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Descripción</h2>
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: plan.full_description }}
              />
            </div>
          )}

          {/* Features */}
          {plan.features && plan.features.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Características incluidas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4 p-6">
            {/* Price */}
            <div className="mb-6">
              <div className="text-sm text-muted-foreground mb-1">Precio</div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-primary">
                  ${plan.price}
                </span>
                <span className="text-muted-foreground">
                  {plan.billing_period === 'once' && 'pago único'}
                  {plan.billing_period === 'monthly' && '/mes'}
                  {plan.billing_period === 'quarterly' && '/trimestre'}
                  {plan.billing_period === 'biannual' && '/semestre'}
                  {plan.billing_period === 'annual' && '/año'}
                </span>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Details */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Disponibilidad</span>
                <span className={plan.is_available ? 'text-green-600' : 'text-red-600'}>
                  {plan.is_available ? 'Disponible' : 'No disponible'}
                </span>
              </div>
              {plan.max_contracts && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Contratos activos</span>
                  <span>
                    {plan.active_contracts_count || 0} / {plan.max_contracts}
                  </span>
                </div>
              )}
            </div>

            {/* CTA Button */}
            <Button
              className="w-full"
              size="lg"
              onClick={handlePurchase}
              disabled={!plan.is_available || purchasing}
            >
              {purchasing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Procesando...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Comprar ahora
                </>
              )}
            </Button>

            {!user && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                Debes <Link href="/auth/login" className="text-primary hover:underline">iniciar sesión</Link> para comprar
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
