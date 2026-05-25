import type { Metadata } from 'next';
import Link from 'next/link';
import { PipeStatic } from '@/components/pipe-avatar';

export const metadata: Metadata = {
  title: 'Producto — NERBIS',
  description:
    'Conoce todo lo que NERBIS puede hacer por tu negocio: sitio web con IA, tienda online, reservas, marketing y analiticas.',
};

const modules = [
  {
    title: 'Sitio web generado por IA',
    description:
      'Pipe analiza tu industria, competencia y estilo para crear un sitio unico. No un template mas.',
    badge: 'Diferenciador',
  },
  {
    title: 'Tienda online',
    description:
      'Catalogo de productos, carrito, checkout y pasarelas de pago integradas. Todo listo para vender.',
  },
  {
    title: 'Sistema de reservas',
    description:
      'Tus clientes reservan citas directamente desde tu sitio. Calendario, disponibilidad y recordatorios automaticos.',
  },
  {
    title: 'Marketing integrado',
    description:
      'SEO automatico, integracion con redes sociales y herramientas de email marketing para hacer crecer tu negocio.',
  },
  {
    title: 'Resenas y reputacion',
    description:
      'Recopila resenas de tus clientes y muestralas en tu sitio para generar confianza.',
  },
  {
    title: 'Analiticas',
    description:
      'Dashboard con metricas de visitas, ventas, conversiones y comportamiento de usuarios en tiempo real.',
  },
];

const differentiators = [
  {
    before: 'Elegir un template generico',
    after: 'Pipe genera un sitio unico para tu negocio',
  },
  {
    before: 'Horas configurando y personalizando',
    after: 'Listo en 30 segundos con IA',
  },
  {
    before: 'Pagar 3 herramientas distintas',
    after: 'Todo integrado: web + tienda + reservas',
  },
  {
    before: 'Aprender a usar plataformas complejas',
    after: 'Solo cuentale tu idea a Pipe',
  },
];

export default function ProductoPage() {
  return (
    <>
      {/* Hero */}
      <section className="px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 flex justify-center">
            <PipeStatic size={72} />
          </div>
          <h1 className="nerbis-display text-4xl text-foreground sm:text-5xl lg:text-6xl">
            Todo lo que necesitas.
            <br />
            <span className="text-primary">Nada que no necesites.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            NERBIS combina IA generativa con las herramientas esenciales para
            lanzar y hacer crecer tu negocio digital.
          </p>
        </div>
      </section>

      {/* Modules grid */}
      <section className="border-t border-border px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((mod) => (
              <div
                key={mod.title}
                className="group rounded-2xl border border-border bg-background p-6 transition-colors hover:border-primary/30"
              >
                {mod.badge && (
                  <span
                    className="mb-3 inline-block rounded-full px-3 py-1 text-xs font-medium text-white"
                    style={{
                      background:
                        'linear-gradient(135deg, var(--primitive-navy-700) 0%, var(--primitive-brand-600) 100%)',
                    }}
                  >
                    {mod.badge}
                  </span>
                )}
                <h3 className="text-lg font-semibold text-foreground">
                  {mod.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {mod.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why NERBIS */}
      <section className="border-t border-border bg-muted/30 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="nerbis-display text-center text-3xl text-foreground sm:text-4xl">
            Deja atras lo generico
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {differentiators.map((d) => (
              <div
                key={d.before}
                className="rounded-xl border border-border bg-background p-5"
              >
                <p className="text-sm text-muted-foreground line-through">
                  {d.before}
                </p>
                <p className="mt-2 font-medium text-foreground">{d.after}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="nerbis-display text-3xl text-foreground sm:text-4xl">
            Listo para empezar?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Crea tu sitio en segundos. Sin tarjeta de credito.
          </p>
          <Link
            href="/register"
            className="group mt-8 inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-base font-medium text-white transition-all hover:opacity-90"
            style={{
              background:
                'linear-gradient(135deg, var(--primitive-navy-700) 0%, var(--primitive-brand-600) 100%)',
            }}
          >
            Crear mi tienda gratis
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform group-hover:translate-x-0.5"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>
    </>
  );
}
