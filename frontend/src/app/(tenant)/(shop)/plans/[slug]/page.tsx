// src/app/(shop)/plans/[slug]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Check, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import type { SubscriptionCategory, SubscriptionPlan } from '@/types';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function CategoryPlansPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const [category, setCategory] = useState<SubscriptionCategory | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch category details
        const categoryResponse = await apiClient.get<SubscriptionCategory>(
          `/subscriptions/categories/${resolvedParams.slug}/`
        );
        setCategory(categoryResponse.data);

        // Fetch plans for this category
        const plansResponse = await apiClient.get<SubscriptionPlan[] | { results: SubscriptionPlan[] }>(
          `/subscriptions/categories/${resolvedParams.slug}/plans/`
        );
        // Handle both paginated and non-paginated responses
        const plansData = Array.isArray(plansResponse.data) ? plansResponse.data : plansResponse.data.results || [];
        setPlans(plansData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [resolvedParams.slug]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-auth-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando planes...</p>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-muted rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Categoría no encontrada</h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Lo sentimos, la categoría que buscas no está disponible o no existe.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/plans">
              <Button size="lg" variant="default">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Ver todas las categorías
              </Button>
            </Link>
            <Link href="/">
              <Button size="lg" variant="outline">
                Volver al inicio
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
      <Link href="/plans">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a servicios
        </Button>
      </Link>

      {/* Category Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4">{category.name}</h1>
        {category.description && (
          <p className="text-xl text-muted-foreground max-w-3xl">
            {category.description}
          </p>
        )}
      </div>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <div className="max-w-md mx-auto text-center py-20">
          <div className="bg-primary/10 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <Package className="h-12 w-12 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Próximamente</h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Aún no tenemos planes disponibles en esta categoría.
            Explora otras categorías o vuelve pronto para ver novedades.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/plans">
              <Button size="lg" variant="default">
                Ver todas las categorías
              </Button>
            </Link>
            <Link href="/">
              <Button size="lg" variant="outline">
                Volver al inicio
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Image */}
              {plan.image && (
                <div className="relative h-48">
                  <Image
                    src={plan.image}
                    alt={plan.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {/* Content */}
              <div className="p-6">
                {/* Badge */}
                {plan.is_featured && (
                  <span className="inline-block bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded mb-3">
                    Destacado
                  </span>
                )}

                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-3xl font-bold text-primary">
                    ${plan.price}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    {plan.billing_period === 'once' && 'pago único'}
                    {plan.billing_period === 'monthly' && '/mes'}
                    {plan.billing_period === 'quarterly' && '/trimestre'}
                    {plan.billing_period === 'biannual' && '/semestre'}
                    {plan.billing_period === 'annual' && '/año'}
                  </span>
                </div>

                {/* Description */}
                <p className="text-muted-foreground mb-4 line-clamp-3">
                  {plan.description}
                </p>

                {/* Features */}
                {plan.features && plan.features.length > 0 && (
                  <ul className="space-y-2 mb-6">
                    {plan.features.slice(0, 4).map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    {plan.features.length > 4 && (
                      <li className="text-sm text-muted-foreground">
                        + {plan.features.length - 4} más...
                      </li>
                    )}
                  </ul>
                )}

                {/* CTA Button */}
                <Link href={`/plans/${resolvedParams.slug}/${plan.slug}`}>
                  <Button className="w-full" disabled={!plan.is_available}>
                    {plan.is_available ? 'Ver detalles' : 'No disponible'}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
