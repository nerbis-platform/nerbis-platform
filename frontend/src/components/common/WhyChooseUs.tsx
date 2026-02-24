// src/components/common/WhyChooseUs.tsx

'use client';

import {
  Award,
  ShieldCheck,
  Heart,
  Clock,
  Sparkles,
  Users,
  Star,
  CheckCircle2
} from 'lucide-react';
import { useTenantMetrics } from '@/contexts/TenantContext';

const benefits = [
  {
    icon: Award,
    title: 'Profesionales Certificados',
    description: 'Nuestro equipo cuenta con certificaciones y formación continua en las últimas técnicas.',
    color: 'text-gold',
    bgColor: 'bg-gold/10',
  },
  {
    icon: Sparkles,
    title: 'Productos Premium',
    description: 'Utilizamos solo marcas de alta calidad para garantizar los mejores resultados.',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    icon: ShieldCheck,
    title: 'Higiene y Seguridad',
    description: 'Protocolos estrictos de limpieza y desinfección para tu tranquilidad.',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  {
    icon: Clock,
    title: 'Puntualidad Garantizada',
    description: 'Respetamos tu tiempo. Tu cita comenzará a la hora programada.',
    color: 'text-rose-400',
    bgColor: 'bg-rose-400/10',
  },
  {
    icon: Heart,
    title: 'Atención Personalizada',
    description: 'Cada tratamiento se adapta a tus necesidades y preferencias únicas.',
    color: 'text-pink-400',
    bgColor: 'bg-pink-400/10',
  },
  {
    icon: Users,
    title: 'Ambiente Acogedor',
    description: 'Un espacio diseñado para que te relajes y disfrutes de la experiencia.',
    color: 'text-rose-300',
    bgColor: 'bg-rose-300/10',
  },
];

function formatNumber(num: number): string {
  if (num >= 1000) {
    return num.toLocaleString('es-ES');
  }
  return num.toString();
}

export function WhyChooseUs() {
  const tenantMetrics = useTenantMetrics();

  // Check if tenant has any metrics configured
  const hasMetrics = tenantMetrics && (
    tenantMetrics.years_experience > 0 ||
    tenantMetrics.clients_count > 0 ||
    tenantMetrics.treatments_count > 0 ||
    tenantMetrics.average_rating > 0
  );

  return (
    <section className="py-16">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
            <Star className="h-4 w-4" />
            Nuestra Diferencia
          </div>
          <h2 className="text-3xl font-bold tracking-tight">¿Por qué elegirnos?</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Nos dedicamos a brindarte la mejor experiencia en cada visita
          </p>
        </div>

        {/* Grid de beneficios */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => {
            const IconComponent = benefit.icon;
            return (
              <div
                key={index}
                className="group relative bg-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-border/50 hover:border-primary/20"
              >
                {/* Icono */}
                <div className={`w-14 h-14 rounded-xl ${benefit.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <IconComponent className={`h-7 w-7 ${benefit.color}`} />
                </div>

                {/* Contenido */}
                <h3 className="font-semibold text-lg text-foreground mb-2">
                  {benefit.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {benefit.description}
                </p>

                {/* Check decorativo */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats rápidos - solo se muestra si el tenant tiene métricas configuradas */}
        {hasMetrics && tenantMetrics && (
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
            {tenantMetrics.years_experience > 0 && (
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">{tenantMetrics.years_experience}+</p>
                <p className="text-muted-foreground text-sm mt-1">Años de experiencia</p>
              </div>
            )}
            {tenantMetrics.clients_count > 0 && (
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">{formatNumber(tenantMetrics.clients_count)}+</p>
                <p className="text-muted-foreground text-sm mt-1">Clientes satisfechos</p>
              </div>
            )}
            {tenantMetrics.treatments_count > 0 && (
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">{tenantMetrics.treatments_count}+</p>
                <p className="text-muted-foreground text-sm mt-1">Tratamientos</p>
              </div>
            )}
            {tenantMetrics.average_rating > 0 && (
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">{tenantMetrics.average_rating}</p>
                <p className="text-muted-foreground text-sm mt-1">Valoración promedio</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
