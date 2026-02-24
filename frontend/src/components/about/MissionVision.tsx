// src/components/about/MissionVision.tsx

import { Target, Eye, Compass } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function MissionVision() {
  return (
    <section className="py-16 md:py-20 bg-muted/30">
      <div className="container">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
            <Compass className="h-4 w-4" />
            Nuestro Propósito
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Misión y Visión
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Misión */}
          <Card className="border-0 shadow-lg overflow-hidden group hover:shadow-xl transition-all duration-300">
            <CardContent className="p-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Target className="h-8 w-8 text-primary" />
              </div>

              <h3 className="text-2xl font-bold text-foreground mb-4">
                Nuestra Misión
              </h3>

              <p className="text-muted-foreground leading-relaxed">
                Empoderar la confianza de nuestros clientes a través de la excelencia estética,
                combinando protocolos de vanguardia con un trato humano y sofisticado que resalte su
                belleza auténtica.
              </p>

              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm font-medium text-primary">
                  Excelencia estética con un trato humano y sofisticado
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Visión */}
          <Card className="border-0 shadow-lg overflow-hidden group hover:shadow-xl transition-all duration-300">
            <CardContent className="p-8">
              <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Eye className="h-8 w-8 text-gold" />
              </div>

              <h3 className="text-2xl font-bold text-foreground mb-4">
                Nuestra Visión
              </h3>

              <p className="text-muted-foreground leading-relaxed">
                Ser el referente indiscutible en medicina estética y bienestar integral, reconocidos
                por nuestra innovación constante y por redefinir los estándares de elegancia y cuidado
                personal en la región.
              </p>

              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm font-medium text-gold">
                  Redefinir los estándares de elegancia y cuidado personal
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
