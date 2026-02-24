// src/components/common/CTABooking.tsx

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Calendar, ArrowRight, Clock, Sparkles } from 'lucide-react';

export function CTABooking() {
  return (
    <section className="relative py-20 overflow-hidden">
      {/* Imagen de fondo */}
      <div className="absolute inset-0">
        <Image
          src="/images/cta-booking-bg.jpg"
          alt="Reserva tu cita"
          fill
          className="object-cover"
          quality={85}
        />
        {/* Overlay oscuro con gradiente */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/70 to-black/50" />
      </div>

      {/* Elementos decorativos */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-48 h-48 bg-primary/15 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10">
        <div className="max-w-2xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm font-medium mb-6 border border-white/20">
            <Sparkles className="h-4 w-4 text-primary" />
            Reserva Online 24/7
          </div>

          {/* Título */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            ¿Lista para tu próxima
            <span className="text-primary"> transformación</span>?
          </h2>

          {/* Descripción */}
          <p className="text-lg text-white/80 mb-8 leading-relaxed">
            Agenda tu cita en minutos y déjate consentir por nuestros expertos.
            Elige el servicio, horario y profesional que prefieras.
          </p>

          {/* Beneficios rápidos */}
          <div className="flex flex-wrap gap-6 mb-10">
            <div className="flex items-center gap-2 text-white/90">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm">Confirmación inmediata</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm">Horarios flexibles</span>
            </div>
          </div>

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              size="lg"
              className="text-base px-8 shadow-lg shadow-primary/30 hover:shadow-primary/40 transition-all"
              asChild
            >
              <Link href="/services">
                <Calendar className="mr-2 h-5 w-5" />
                Agendar Cita Ahora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-8 bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm"
              asChild
            >
              <Link href="/services">
                Ver Servicios
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}