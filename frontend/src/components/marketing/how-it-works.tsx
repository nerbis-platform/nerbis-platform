'use client';

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-zinc-800/30 bg-zinc-950 px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="anim-fade-up text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Asi de simple
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Tres pasos. Cero friccion.
          </h2>
        </div>

        <div className="anim-fade-up stagger mt-16 grid gap-6 sm:grid-cols-3">
          {/* Paso 1 — Registrate */}
          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <span className="text-xs font-medium uppercase tracking-widest text-zinc-600">Paso 1</span>
            <h3 className="mt-3 text-lg font-semibold text-white">Registrate</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
              Solo necesitas tu nombre, industria y pais.
            </p>
            {/* Mini form mockup */}
            <div className="mt-5 space-y-2.5">
              <div className="h-8 rounded-md border border-zinc-800 bg-zinc-950 px-3 flex items-center">
                <span className="text-[11px] text-zinc-600">Mi Salon de Belleza</span>
              </div>
              <div className="h-8 rounded-md border border-zinc-800 bg-zinc-950 px-3 flex items-center justify-between">
                <span className="text-[11px] text-zinc-600">Belleza y Bienestar</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-700"><path d="m6 9 6 6 6-6"/></svg>
              </div>
              <div className="h-8 w-24 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1C3B57 0%, #0D9488 100%)' }}>
                <span className="text-[11px] font-medium text-white">Continuar</span>
              </div>
            </div>
          </div>

          {/* Paso 2 — Pipe crea tu sitio */}
          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <span className="text-xs font-medium uppercase tracking-widest text-zinc-600">Paso 2</span>
            <h3 className="mt-3 text-lg font-semibold text-white">Pipe crea tu sitio</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
              Pipe, nuestro asistente de IA, genera todo en segundos.
            </p>
            {/* Progress-style generation — friendly, not terminal */}
            <div className="mt-5 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-zinc-400">Analizando tu negocio...</span>
                  <span className="text-[11px] text-teal-400">Listo</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-800">
                  <div className="h-full rounded-full" style={{ width: '100%', background: 'linear-gradient(90deg, #1C3B57, #0D9488)' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-zinc-400">Creando contenido...</span>
                  <span className="text-[11px] text-teal-400">Listo</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-800">
                  <div className="h-full rounded-full" style={{ width: '100%', background: 'linear-gradient(90deg, #1C3B57, #0D9488)' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-zinc-400">Aplicando diseno...</span>
                  <span className="text-[11px] text-white font-medium">85%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-800">
                  <div className="h-full rounded-full" style={{ width: '85%', background: 'linear-gradient(90deg, #1C3B57, #0D9488)' }} />
                </div>
              </div>
              <p className="text-center text-[11px] text-zinc-500 pt-1">
                Tiempo estimado: <span className="text-teal-400 font-medium">28 segundos</span>
              </p>
            </div>
          </div>

          {/* Paso 3 — Personaliza y publica */}
          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <span className="text-xs font-medium uppercase tracking-widest text-zinc-600">Paso 3</span>
            <h3 className="mt-3 text-lg font-semibold text-white">Personaliza y publica</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
              Edita lo que quieras. O dejalo tal cual.
            </p>
            {/* Mini editor mockup */}
            <div className="mt-5 overflow-hidden rounded-md border border-zinc-800 bg-zinc-950">
              <div className="flex items-center gap-1 border-b border-zinc-800 px-3 py-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-red-400/60" />
                <div className="h-1.5 w-1.5 rounded-full bg-yellow-400/60" />
                <div className="h-1.5 w-1.5 rounded-full bg-green-400/60" />
              </div>
              <div className="flex">
                {/* Sidebar */}
                <div className="w-10 border-r border-zinc-800 p-1.5 space-y-1.5">
                  <div className="h-2 w-full rounded" style={{ background: 'rgba(13,148,136,0.25)' }} />
                  <div className="h-2 w-full rounded bg-zinc-800" />
                  <div className="h-2 w-full rounded bg-zinc-800" />
                </div>
                {/* Content */}
                <div className="flex-1 p-2.5 space-y-1.5">
                  <div className="h-2 w-16 rounded bg-white/10" />
                  <div className="h-2 w-full rounded bg-zinc-800/60" />
                  <div className="h-2 w-3/4 rounded bg-zinc-800/40" />
                  <div className="mt-2 h-5 w-12 rounded flex items-center justify-center" style={{ background: 'rgba(13,148,136,0.2)' }}>
                    <span className="text-[8px] text-teal-400">Live</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
