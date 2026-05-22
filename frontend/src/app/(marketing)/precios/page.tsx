import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Precios — NERBIS',
  description:
    'Planes simples y transparentes. Empieza gratis y escala cuando quieras.',
};

const plans = [
  {
    name: 'Gratis',
    price: '$0',
    period: 'para siempre',
    description: 'Perfecto para empezar y probar la plataforma.',
    cta: 'Empezar gratis',
    features: [
      'Sitio web generado por IA',
      'Subdominio nerbis.com',
      'Hasta 10 productos',
      'Pagos integrados',
      'SSL incluido',
      'Soporte por email',
    ],
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mes',
    description: 'Para negocios que quieren crecer.',
    cta: 'Empezar prueba gratuita',
    popular: true,
    features: [
      'Todo lo de Gratis',
      'Dominio personalizado',
      'Productos ilimitados',
      'Sistema de reservas',
      'Analytics avanzados',
      'Resenas de clientes',
      'Sin marca NERBIS',
      'Soporte prioritario',
    ],
  },
  {
    name: 'Business',
    price: '$49',
    period: '/mes',
    description: 'Para negocios establecidos con necesidades avanzadas.',
    cta: 'Contactar ventas',
    features: [
      'Todo lo de Pro',
      'Multiples sucursales',
      'API access',
      'Integraciones avanzadas',
      'Reportes personalizados',
      'Onboarding dedicado',
      'SLA garantizado',
      'Soporte 24/7',
    ],
  },
];

export default function PreciosPage() {
  return (
    <>
      {/* Hero */}
      <section className="px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-32">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="nerbis-display text-4xl text-foreground sm:text-5xl lg:text-6xl">
            Planes simples,
            <br />
            <span className="text-primary">precios transparentes</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Empieza gratis. Escala cuando quieras. Sin sorpresas.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="border-t border-border px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 ${
                  plan.popular
                    ? 'border-primary bg-background shadow-lg shadow-primary/5'
                    : 'border-border bg-background'
                }`}
              >
                {plan.popular && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-medium text-white"
                    style={{
                      background:
                        'linear-gradient(135deg, var(--primitive-navy-700) 0%, var(--primitive-brand-600) 100%)',
                    }}
                  >
                    Mas popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-foreground">
                  {plan.name}
                </h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {plan.period}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {plan.description}
                </p>
                <Link
                  href="/register"
                  className={`mt-6 block rounded-full py-2.5 text-center text-sm font-medium transition-all hover:opacity-90 ${
                    plan.popular
                      ? 'text-white'
                      : 'border border-border text-foreground hover:bg-muted'
                  }`}
                  style={
                    plan.popular
                      ? {
                          background:
                            'linear-gradient(135deg, var(--primitive-navy-700) 0%, var(--primitive-brand-600) 100%)',
                        }
                      : undefined
                  }
                >
                  {plan.cta}
                </Link>
                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm text-muted-foreground"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mt-0.5 shrink-0 text-primary"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ pricing */}
      <section className="border-t border-border bg-muted/30 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="nerbis-display text-3xl text-foreground sm:text-4xl">
            Preguntas sobre precios
          </h2>
          <p className="mt-4 text-muted-foreground">
            Todos los planes incluyen SSL, hosting, y actualizaciones
            automaticas. Puedes cambiar de plan o cancelar en cualquier momento.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Precios en USD. Proximamente precios en moneda local.
          </p>
        </div>
      </section>
    </>
  );
}
