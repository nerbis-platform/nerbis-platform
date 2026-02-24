// src/components/about/OurValues.tsx

import {
  Cpu,
  Target,
  Sparkles,
  Heart,
} from 'lucide-react';

const values = [
  {
    icon: Cpu,
    title: 'Alta Tecnología',
    description: 'Seleccionamos aparatología de vanguardia que ofrece resultados reales, visibles y duraderos.',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    icon: Target,
    title: 'Precisión Técnica',
    description: 'Nuestras manos expertas no solo ejecutan tratamientos, sino que entienden la anatomía y las necesidades cambiantes de tu cuerpo.',
    color: 'text-rose-400',
    bgColor: 'bg-rose-400/10',
  },
  {
    icon: Sparkles,
    title: 'Lujo del Bienestar',
    description: 'Un entorno diseñado para que cada detalle —desde la iluminación hasta el aroma— esté pensado para que tu mente descanse mientras trabajamos en tu transformación.',
    color: 'text-gold',
    bgColor: 'bg-gold/10',
  },
];

export function OurValues() {
  return (
    <section className="py-16 md:py-20 bg-muted/30">
      <div className="container">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
            <Heart className="h-4 w-4" />
            Nuestros Pilares
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Lo que nos hace únicos
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Tres pilares que garantizan tu transformación
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {values.map((value, index) => {
            const IconComponent = value.icon;
            return (
              <div
                key={index}
                className="group relative bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-border/50 hover:border-primary/30"
              >
                {/* Número */}
                <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold shadow-lg">
                  {index + 1}
                </div>

                {/* Icono */}
                <div className={`w-16 h-16 rounded-2xl ${value.bgColor} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 mx-auto`}>
                  <IconComponent className={`h-8 w-8 ${value.color}`} />
                </div>

                {/* Contenido */}
                <h3 className="font-bold text-xl text-foreground mb-3 text-center">
                  {value.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed text-center">
                  {value.description}
                </p>

                {/* Decoración */}
                <div className="absolute bottom-0 right-0 w-20 h-20 bg-linear-to-tl from-primary/5 to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
