// src/components/common/FeaturedServices.tsx

'use client';

import { useQuery } from '@tanstack/react-query';
import { getFeaturedServices } from '@/lib/api/services';
import { ServiceCard } from '@/components/services/ServiceCard';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';

export function FeaturedServices() {
  const { data: services, isLoading } = useQuery({
    queryKey: ['featured-services'],
    queryFn: getFeaturedServices,
  });

  // No mostrar sección si no hay servicios destacados
  if (!isLoading && (!services || services.length === 0)) {
    return null;
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
              <Sparkles className="h-4 w-4" />
              Reserva Online
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Servicios Destacados</h2>
            <p className="text-muted-foreground mt-2">
              Nuestros tratamientos más populares y recomendados
            </p>
          </div>
          <Button variant="ghost" asChild className="hidden sm:flex">
            <Link href="/services">
              Ver todos los servicios
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-[420px] rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services?.slice(0, 6).map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}

        {/* Botón móvil */}
        <div className="mt-8 text-center sm:hidden">
          <Button asChild>
            <Link href="/services">
              Ver todos los servicios
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}