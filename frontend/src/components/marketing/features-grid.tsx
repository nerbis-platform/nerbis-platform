'use client';

export function FeaturesGrid() {
  return (
    <section id="features" className="bg-zinc-950 px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="anim-fade-up text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Modulos
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Todo lo que necesitas.
            <br />
            <span className="text-zinc-500">Nada que no necesites.</span>
          </h2>
        </div>

        {/* Bento Grid — cada celda es un mini-preview del producto */}
        <div className="anim-fade-up stagger mt-16 grid grid-cols-1 gap-3 sm:grid-cols-6">

          {/* Sitio web con IA — celda hero (grande) */}
          <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:col-span-4 sm:row-span-2 sm:p-8 transition-colors hover:border-zinc-700">
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-teal-400" style={{ background: 'rgba(13,148,136,0.12)' }}>
                <span className="h-1 w-1 rounded-full bg-teal-400" />
                Diferenciador
              </span>
              <h3 className="mt-4 text-xl font-semibold text-white sm:text-2xl">
                Sitio web generado por IA
              </h3>
              <p className="mt-2 max-w-sm text-base leading-relaxed text-zinc-400">
                Pipe, nuestro asistente de IA, analiza tu industria y genera un sitio unico. No un template mas.
              </p>
            </div>
            {/* Mini browser mockup — light theme like real output */}
            <div className="mt-6 overflow-hidden rounded-lg border border-zinc-700/50 shadow-lg">
              <div className="flex items-center gap-1.5 border-b border-zinc-700/50 bg-zinc-800 px-3 py-2">
                <div className="h-2 w-2 rounded-full bg-red-400/60" />
                <div className="h-2 w-2 rounded-full bg-yellow-400/60" />
                <div className="h-2 w-2 rounded-full bg-green-400/60" />
                <div className="ml-3 flex h-4 w-32 items-center justify-center rounded bg-zinc-700/50">
                  <span className="text-[9px] text-zinc-400">tunegocio.nerbis.com</span>
                </div>
              </div>
              <div className="bg-[#FAFAFA] p-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-2">
                    <div className="h-2.5 w-20 rounded" style={{ background: 'rgba(13,148,136,0.3)' }} />
                    <div className="h-4 w-44 rounded bg-gray-800/80" />
                    <div className="h-4 w-36 rounded bg-gray-800/50" />
                    <div className="mt-3 h-2.5 w-full rounded bg-gray-300/60" />
                    <div className="h-2.5 w-4/5 rounded bg-gray-300/40" />
                    <div className="mt-3 flex gap-2">
                      <div className="h-8 w-20 rounded-md" style={{ background: '#0D9488' }} />
                      <div className="h-8 w-16 rounded-md border border-gray-300 bg-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="aspect-square rounded-md bg-gray-200" />
                    <div className="h-2 w-full rounded bg-gray-300/50" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tienda online */}
          <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:col-span-2 transition-colors hover:border-zinc-700">
            <h3 className="text-lg font-semibold text-white">Tienda online</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
              Catalogo, carrito y pagos integrados.
            </p>
            {/* Mini product grid */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="aspect-square rounded-lg bg-zinc-800/60" />
              <div className="aspect-square rounded-lg bg-zinc-800/40" />
              <div className="col-span-2 flex items-center gap-2 rounded-lg bg-zinc-800/30 px-3 py-2">
                <div className="h-2 w-12 rounded" style={{ background: 'rgba(13,148,136,0.4)' }} />
                <div className="ml-auto h-2 w-8 rounded bg-zinc-700" />
              </div>
            </div>
          </div>

          {/* Reservas */}
          <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:col-span-2 transition-colors hover:border-zinc-700">
            <h3 className="text-lg font-semibold text-white">Reservas</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
              Agenda de citas para servicios.
            </p>
            {/* Mini calendar */}
            <div className="mt-4 space-y-1.5">
              {[
                { time: '10:00', w: 'w-3/4', color: 'border-teal-400/20', bg: 'rgba(13,148,136,0.12)' },
                { time: '11:30', w: 'w-1/2', color: 'border-zinc-700/30', bg: 'rgba(63,63,70,0.3)' },
                { time: '14:00', w: 'w-2/3', color: 'border-[#1C3B57]/30', bg: 'rgba(28,59,87,0.15)' },
              ].map((slot) => (
                <div key={slot.time} className="flex items-center gap-2">
                  <span className="w-10 text-[11px] tabular-nums text-zinc-600">{slot.time}</span>
                  <div className={`h-7 ${slot.w} rounded-md border ${slot.color}`} style={{ background: slot.bg }} />
                </div>
              ))}
            </div>
          </div>

          {/* Marketing */}
          <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:col-span-2 transition-colors hover:border-zinc-700">
            <h3 className="text-lg font-semibold text-white">Marketing</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
              Campanas y notificaciones automaticas.
            </p>
            {/* Mini metrics */}
            <div className="mt-4 flex items-end gap-1">
              {[40, 55, 35, 65, 50, 72, 60, 80, 68, 90, 75, 95].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{
                    height: `${h * 0.6}px`,
                    background: `linear-gradient(to top, rgba(13,148,136,0.25), rgba(28,59,87,0.15))`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Resenas */}
          <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:col-span-2 transition-colors hover:border-zinc-700">
            <h3 className="text-lg font-semibold text-white">Resenas</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
              Opiniones que generan confianza.
            </p>
            {/* Mini review */}
            <div className="mt-4 space-y-3">
              <div className="flex gap-1">
                {[1,2,3,4,5].map((s) => (
                  <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill={s <= 4 ? '#facc15' : 'none'} stroke={s <= 4 ? '#facc15' : '#3f3f46'} strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
                <span className="ml-1 text-xs text-zinc-500">4.8</span>
              </div>
              <div className="space-y-1.5">
                <div className="h-2 w-full rounded bg-zinc-800/60" />
                <div className="h-2 w-3/4 rounded bg-zinc-800/40" />
              </div>
            </div>
          </div>

          {/* Analiticas */}
          <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:col-span-2 transition-colors hover:border-zinc-700">
            <h3 className="text-lg font-semibold text-white">Analiticas</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
              Metricas de visitas y rendimiento.
            </p>
            {/* Mini chart line */}
            <div className="mt-4">
              <svg viewBox="0 0 200 60" className="w-full" fill="none">
                <defs>
                  <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0D9488" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#0D9488" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,45 Q20,42 40,38 T80,28 T120,22 T160,15 T200,8" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" />
                <path d="M0,45 Q20,42 40,38 T80,28 T120,22 T160,15 T200,8 V60 H0 Z" fill="url(#chart-grad)" />
              </svg>
              <div className="mt-2 flex justify-between text-[10px] text-zinc-600">
                <span>Ene</span>
                <span>Mar</span>
                <span>Jun</span>
                <span>Hoy</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
