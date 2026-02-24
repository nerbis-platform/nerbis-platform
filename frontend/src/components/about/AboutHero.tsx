// src/components/about/AboutHero.tsx

import { Sparkles, Heart } from 'lucide-react';

export function AboutHero() {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden bg-gradient-to-br from-primary/5 via-primary/10 to-background">
      {/* Decoración de fondo */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/15 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-rose-300/10 rounded-full blur-3xl" />
      </div>

      <div className="container">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-in">
            <Heart className="h-4 w-4 fill-current" />
            Sobre Nosotros
          </div>

          {/* Título */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            Menos protocolos, más esencia
          </h1>

          {/* Descripción */}
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 max-w-3xl mx-auto">
            Al final del día, la belleza que más impacta es aquella que nace de sentirte
            impecable en tu propia piel.
          </p>

          {/* Destacado */}
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-card border border-border shadow-sm">
            <Sparkles className="h-5 w-5 text-gold" />
            <span className="text-sm font-medium">
              Tú pones la intención, <span className="text-primary font-bold">nosotros el arte</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
