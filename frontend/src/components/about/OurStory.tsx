// src/components/about/OurStory.tsx

import { Sparkles, Users } from 'lucide-react';

export function OurStory() {
  return (
    <section className="py-16 md:py-20">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Users className="h-4 w-4" />
              ¿Quiénes Somos?
            </div>

            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
              Menos protocolos, más esencia
            </h2>
          </div>

          {/* Contenido principal */}
          <div className="space-y-6 text-muted-foreground leading-relaxed text-lg">
            <p>
              En <span className="font-semibold text-foreground">Centro de Estética Gerdy</span>, no buscamos cambiarte.
              Buscamos que, cuando te mires al espejo, reconozcas la mejor versión de ti, <span className="italic">sin filtros</span>.
            </p>

            <p>
              Entendemos que la verdadera belleza no se fabrica en serie. Por eso, decidimos alejarnos
              de la estética convencional para crear un concepto de <span className="font-semibold text-foreground">&quot;Estética de Autor&quot;</span>.
              Olvida esos rostros donde todo se ve igual, bonito, si... pero aquí, cada detalle —desde tu
              piel hasta tu aroma— está pensado para que tu mente descanse mientras nosotros trabajamos
              en tu transformación.
            </p>

            <div className="bg-card border border-border rounded-2xl p-8 my-8">
              <p className="text-foreground font-medium text-center italic">
                &quot;Nuestra filosofía es simple pero poderosa: <span className="text-primary">tu piel tiene memoria</span>,
                y nosotros te tratamos con amor y ciencia. En cada protocolo que realizamos.&quot;
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                  <span className="text-primary font-bold">1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">La Alta Tecnología</h3>
                  <p>Seleccionamos aparatología de vanguardia que ofrece resultados reales, visibles y duraderos.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                  <span className="text-primary font-bold">2</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">La Precision Técnica</h3>
                  <p>Nuestras manos expertas no solo ejecutan tratamientos, sino que entienden la anatomía y las necesidades cambiantes de tu cuerpo.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                  <span className="text-primary font-bold">3</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">El Lujo del Bienestar</h3>
                  <p>Un origen diseñado para que cada detalle —desde la iluminación hasta el aroma— está pensado para que tu mente descanse mientras nosotros trabajamos en tu transformación.</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary/10 via-rose-200/10 to-amber-100/10 rounded-2xl p-8 mt-8 border border-primary/10">
              <div className="flex items-start gap-4">
                <Sparkles className="h-6 w-6 text-primary shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Nuestro secreto</h3>
                  <p>
                    No seguimos tendencias pasajeras ni modas de internet. Diseñamos planes personalizados que
                    se sienten naturales y se ven extraordinarios. Porque creemos que el verdadero lujo no es
                    la inversión que puedes hacer en tu propia confianza.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-center text-xl font-medium text-foreground pt-8">
              En el <span className="text-primary">Centro de Estética Gerdy</span>, no solo vienes a transformar tu imagen;
              vienes a reclamar tu seguridad.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
