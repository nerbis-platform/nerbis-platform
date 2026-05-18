const comparisons = [
  {
    before: 'Eliges un template generico',
    after: 'Pipe, nuestra IA, genera tu sitio unico',
  },
  {
    before: 'Pasas horas personalizando',
    after: 'Listo en 30 segundos',
  },
  {
    before: 'Necesitas 3 herramientas distintas',
    after: 'Todo integrado: web + tienda + reservas',
  },
  {
    before: 'Tu sitio se ve como mil otros',
    after: 'Diseno personalizado por industria',
  },
];

export function ProblemSolution() {
  return (
    <section className="bg-zinc-900/30 px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-4xl">
        <div className="anim-fade-up text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Por que NERBIS
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Deja atras lo generico
          </h2>
        </div>

        <div className="anim-fade-up mt-16 grid gap-0 sm:grid-cols-2">
          {/* Before column */}
          <div className="border-r-0 border-zinc-800 sm:border-r sm:pr-8">
            <p className="mb-6 text-sm font-medium uppercase tracking-wide text-zinc-600">
              Lo que haces hoy
            </p>
            {comparisons.map((item) => (
              <div
                key={item.before}
                className="flex items-start gap-3 border-t border-zinc-800/50 py-4"
              >
                <span className="mt-0.5 text-zinc-700" aria-hidden="true">&times;</span>
                <span className="text-zinc-500 line-through decoration-zinc-700">
                  {item.before}
                </span>
              </div>
            ))}
          </div>

          {/* After column */}
          <div className="mt-8 sm:mt-0 sm:pl-8">
            <p className="mb-6 text-sm font-medium uppercase tracking-wide text-zinc-400">
              Lo que haces con NERBIS
            </p>
            {comparisons.map((item) => (
              <div
                key={item.after}
                className="flex items-start gap-3 border-t border-zinc-800/50 py-4"
              >
                <span
                  className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px]"
                  style={{ background: 'linear-gradient(135deg, #1C3B57 0%, #0D9488 100%)' }}
                  aria-hidden="true"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#09090b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span className="text-white">{item.after}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
