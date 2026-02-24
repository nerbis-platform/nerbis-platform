// src/app/(shop)/services/page.tsx

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { getServices, getServiceCategories } from '@/lib/api/services';
import { ServiceCard } from '@/components/services/ServiceCard';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Sparkles, Clock, Users, CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenantImages } from '@/contexts/TenantContext';
import { PageGuard } from '@/components/common/PageGuard';
import { usePageContent } from '@/contexts/WebsiteContentContext';

const DEFAULT_SERVICES_HERO = '/images/services-hero.jpg';

export default function ServicesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const images = useTenantImages();
  const heroImage = images?.hero_services || DEFAULT_SERVICES_HERO;
  const aiContent = usePageContent<{ title?: string; subtitle?: string }>('services');

  const { data: categories } = useQuery({
    queryKey: ['service-categories'],
    queryFn: getServiceCategories,
  });

  const { data: servicesData, isLoading } = useQuery({
    queryKey: ['services', selectedCategory],
    queryFn: () => getServices({
      category: selectedCategory !== 'all' ? parseInt(selectedCategory) : undefined,
    }),
  });

  const servicesCount = servicesData?.results?.length ?? 0;

  return (
    <PageGuard page="services">
      <Header />
      <main className="min-h-screen bg-background">
        {/* Hero Section con imagen de fondo */}
        <section className="relative overflow-hidden min-h-[420px] md:min-h-[480px] flex items-center">
          {/* Imagen de fondo */}
          <div className="absolute inset-0">
            <Image
              src={heroImage}
              alt="Servicios de belleza y estética"
              fill
              className="object-cover object-center"
              priority
              quality={85}
            />
            {/* Overlay con gradiente para legibilidad */}
            <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
          </div>

          {/* Elementos decorativos sutiles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-primary/8 rounded-full blur-3xl" />
          </div>

          <div className="container relative z-10 py-16 md:py-20">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 dark:bg-background/90 text-primary mb-6 shadow-sm backdrop-blur-sm">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">Tratamientos Profesionales</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground drop-shadow-sm">
                {aiContent?.title || <>Descubre Nuestros{' '}<span className="text-primary">Servicios</span></>}
              </h1>

              <p className="text-lg md:text-xl text-foreground/80 max-w-xl mb-8">
                {aiContent?.subtitle || 'Tratamientos personalizados de belleza y estética realizados por profesionales certificados. Tu bienestar es nuestra prioridad.'}
              </p>

              {/* Stats con fondo semitransparente */}
              <div className="flex flex-wrap gap-4 md:gap-6">
                <div className="flex items-center gap-3 bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                    <CalendarCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{servicesCount}+</p>
                    <p className="text-xs text-muted-foreground">Servicios</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">Expertos</p>
                    <p className="text-xs text-muted-foreground">Profesionales</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">Flexible</p>
                    <p className="text-xs text-muted-foreground">Horarios</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Filtros y contenido */}
        <section className="container py-10 md:py-14">
          {/* Category Pills */}
          <div className="mb-10">
            <div className="flex flex-wrap gap-3">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="lg"
                className={cn(
                  "rounded-full transition-all duration-300",
                  selectedCategory === 'all'
                    ? "shadow-lg shadow-primary/25"
                    : "hover:bg-primary/5 hover:border-primary/30"
                )}
                onClick={() => setSelectedCategory('all')}
              >
                Todos los servicios
              </Button>
              {categories?.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id.toString() ? 'default' : 'outline'}
                  size="lg"
                  className={cn(
                    "rounded-full transition-all duration-300",
                    selectedCategory === category.id.toString()
                      ? "shadow-lg shadow-primary/25"
                      : "hover:bg-primary/5 hover:border-primary/30"
                  )}
                  onClick={() => setSelectedCategory(category.id.toString())}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Grid de servicios */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden">
                  <Skeleton className="h-[320px]" />
                </div>
              ))}
            </div>
          ) : servicesCount === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-primary/50" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No hay servicios disponibles</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Actualmente no hay servicios en esta categoría.
                Explora otras categorías o vuelve pronto.
              </p>
              {selectedCategory !== 'all' && (
                <Button
                  variant="outline"
                  className="mt-6 rounded-full"
                  onClick={() => setSelectedCategory('all')}
                >
                  Ver todos los servicios
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {servicesData?.results?.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          )}
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 py-16">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                ¿Necesitas ayuda para elegir?
              </h2>
              <p className="text-muted-foreground mb-6">
                Nuestro equipo está listo para asesorarte y encontrar el tratamiento
                perfecto para ti.
              </p>
              <Button size="lg" className="rounded-full shadow-lg shadow-primary/25">
                Contáctanos
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </PageGuard>
  );
}
