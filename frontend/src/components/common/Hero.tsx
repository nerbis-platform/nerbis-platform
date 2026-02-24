// src/components/common/Hero.tsx

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Calendar, ShoppingBag, Sparkles } from 'lucide-react';
import { useTenantImages, useTenantInfo } from '@/contexts/TenantContext';

const DEFAULT_HERO_IMAGE = '/images/hero-home.jpg';

export function Hero() {
  const images = useTenantImages();
  const tenantInfo = useTenantInfo();
  const heroImage = images?.hero_home || DEFAULT_HERO_IMAGE;

  return (
    <section className="relative overflow-hidden min-h-130 md:min-h-150 flex items-center">
      {/* Imagen de fondo */}
      <div className="absolute inset-0">
        <Image
          src={heroImage}
          alt={`${tenantInfo.name} - Tratamiento profesional`}
          fill
          className="object-cover object-center"
          priority
          quality={85}
          unoptimized
        />
        {/* Overlay rosa/gold cálido — deja ver la foto con tonos de marca */}
        <div className="absolute inset-0 bg-linear-to-r from-[#D4A5A5]/70 via-[#D4A5A5]/40 to-[#D4AF37]/20" />
        {/* Capa de legibilidad suave sobre el lado del texto */}
        <div className="absolute inset-0 bg-linear-to-r from-white/50 via-white/20 to-transparent" />
        {/* Gradiente inferior para transición al fondo del sitio */}
        <div className="absolute inset-0 bg-linear-to-t from-background/60 via-transparent to-transparent" />
      </div>

      {/* Elementos decorativos - blobs rosa/gold */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-md h-112 bg-[#D4A5A5]/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-80 h-80 bg-[#D4AF37]/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-[#F5E6E6]/30 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10 py-16 md:py-20">
        <div className="max-w-2xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-card/80 backdrop-blur-sm text-primary mb-6 shadow-sm border border-primary/15">
            <Sparkles className="h-4 w-4 text-[#D4AF37]" />
            <span className="text-sm font-medium">Centro de Estética Profesional</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-foreground drop-shadow-sm">
            Tu belleza, nuestra{' '}
            <span className="text-primary">pasión</span>
          </h1>

          {/* Descripción */}
          <p className="text-lg md:text-xl text-foreground/80 mb-8 max-w-xl drop-shadow-sm">
            Descubre nuestros tratamientos de belleza y productos premium.
            Agenda tu cita online y transforma tu rutina de cuidado personal.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" className="rounded-xl shadow-lg shadow-primary/25 h-12 px-6 text-base" asChild>
              <Link href="/services">
                <Calendar className="mr-2 h-5 w-5" />
                Agendar Cita
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-xl h-12 px-6 text-base bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/60 hover:bg-white dark:hover:bg-card"
              asChild
            >
              <Link href="/products">
                <ShoppingBag className="mr-2 h-5 w-5" />
                Ver Productos
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
