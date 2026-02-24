// src/app/(shop)/pricing/page.tsx

'use client';

import { useQuery } from '@tanstack/react-query';
import { getServices } from '@/lib/api/services';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { BadgeDollarSign, ArrowRight, Clock } from 'lucide-react';
import { PageGuard } from '@/components/common/PageGuard';
import { usePageContent } from '@/contexts/WebsiteContentContext';

export default function PricingPage() {
  const { data: servicesData, isLoading } = useQuery({
    queryKey: ['services-pricing'],
    queryFn: () => getServices({}),
  });
  const aiContent = usePageContent<{ title?: string; subtitle?: string }>('pricing');

  const services = servicesData?.results ?? [];

  return (
    <PageGuard page="pricing">
      <Header />
      <main className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative py-20 md:py-28 overflow-hidden bg-linear-to-br from-primary/5 via-primary/10 to-background">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-20 right-10 w-72 h-72 bg-primary/15 rounded-full blur-3xl" />
            <div className="absolute bottom-20 left-10 w-96 h-96 bg-emerald-300/10 rounded-full blur-3xl" />
          </div>
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <BadgeDollarSign className="h-4 w-4" />
                Transparencia en precios
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                {aiContent?.title || 'Nuestros Precios'}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                {aiContent?.subtitle || 'Precios claros y justos. Sin sorpresas ni costos ocultos.'}
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Grid */}
        <section className="py-16">
          <div className="container">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-40 rounded-xl" />
                ))}
              </div>
            ) : services.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {services.map((service: any) => (
                  <Card key={service.id} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="font-semibold text-lg">{service.name}</h3>
                        {service.is_featured && (
                          <Badge variant="secondary">Destacado</Badge>
                        )}
                      </div>

                      {service.description && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {service.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-auto">
                        <div>
                          <span className="text-2xl font-bold text-primary">
                            ${Number(service.price).toLocaleString()}
                          </span>
                          {service.duration && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                              <Clock className="h-3.5 w-3.5" />
                              {service.duration} min
                            </div>
                          )}
                        </div>
                        <Button variant="outline" size="sm" asChild className="gap-1">
                          <Link href="/services">
                            Ver m&aacute;s <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <BadgeDollarSign className="h-16 w-16 text-muted-foreground/30 mx-auto mb-6" />
                <h2 className="text-2xl font-semibold mb-2">Precios pr&oacute;ximamente</h2>
                <p className="text-muted-foreground">
                  Estamos actualizando nuestra lista de precios. Cont&aacute;ctanos para m&aacute;s informaci&oacute;n.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-muted/30">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl font-semibold mb-3">&iquest;Listo para empezar?</h2>
              <p className="text-muted-foreground mb-6">
                Reserva tu cita o explora todos nuestros servicios y productos.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link href="/services">Ver servicios</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/products">Ver productos</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </PageGuard>
  );
}
