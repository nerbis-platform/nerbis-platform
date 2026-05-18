'use client';

import Link from 'next/link';
import Image from 'next/image';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-zinc-950 px-4 pb-20 pt-20 sm:px-6 sm:pb-28 sm:pt-28">
      {/* Glow — brand colors */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute left-1/2 top-1/4 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[100px]"
          style={{ background: 'radial-gradient(ellipse, #0D9488 0%, #1C3B57 50%, transparent 80%)' }}
        />
      </div>

      <div className="relative mx-auto max-w-4xl text-center">
        {/* Badge */}
        <div className="anim-fade-up mb-6 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-1.5 text-sm text-zinc-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-400" />
            </span>
            Disponible en Latinoamerica
          </span>
        </div>

        {/* Headline */}
        <h1 className="anim-fade-up text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
          Crea el sitio web de tu negocio
          <br className="hidden sm:block" />
          <span className="text-teal-400">en segundos</span>, no en semanas.
        </h1>

        {/* Subtitle */}
        <p className="anim-fade-up mx-auto mt-5 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          Dinos que tipo de negocio tienes y Pipe, nuestro asistente de IA,
          genera un sitio profesional listo para publicar.
        </p>

        {/* Single primary CTA — like Shopify */}
        <div className="anim-fade-up mt-8 flex flex-col items-center gap-3">
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-base font-medium text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1C3B57 0%, #0D9488 100%)' }}
          >
            Empieza gratis
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
          <span className="text-xs text-zinc-600">Sin tarjeta de credito</span>
        </div>

        {/* Product preview — simulated real website, light theme like actual output */}
        <div className="anim-fade-up mx-auto mt-14 max-w-3xl">
          <div className="overflow-hidden rounded-xl border border-zinc-700/50 shadow-2xl shadow-black/40 ring-1 ring-white/5">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-zinc-700/50 bg-zinc-800 px-4 py-2.5">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
              </div>
              <div className="mx-auto flex h-6 w-full max-w-[240px] items-center justify-center rounded bg-zinc-700/50 px-3">
                <span className="text-[11px] text-zinc-400">misalon.nerbis.com</span>
              </div>
            </div>
            {/* Site preview — LIGHT background (like real generated sites) */}
            <div className="bg-[#FAFAFA]">
              {/* Nav */}
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded" style={{ background: '#1C3B57' }} />
                  <div className="h-2 w-16 rounded bg-gray-800/70" />
                </div>
                <div className="hidden gap-4 sm:flex">
                  <div className="h-1.5 w-10 rounded bg-gray-400/50" />
                  <div className="h-1.5 w-8 rounded bg-gray-400/50" />
                  <div className="h-1.5 w-12 rounded bg-gray-400/50" />
                </div>
                <div className="h-5 w-14 rounded-full" style={{ background: '#0D9488' }} />
              </div>
              {/* Hero of generated site */}
              <div className="px-5 py-8 sm:px-8 sm:py-12">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
                  <div className="flex-1 space-y-2.5">
                    <div className="h-1.5 w-16 rounded" style={{ background: 'rgba(13,148,136,0.3)' }} />
                    <div className="h-4 w-52 max-w-full rounded bg-gray-800/80" />
                    <div className="h-4 w-40 max-w-full rounded bg-gray-800/50" />
                    <div className="mt-3 space-y-1.5">
                      <div className="h-2 w-full max-w-[220px] rounded bg-gray-300/60" />
                      <div className="h-2 w-4/5 max-w-[180px] rounded bg-gray-300/40" />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <div className="h-7 w-20 rounded-full" style={{ background: '#0D9488' }} />
                      <div className="h-7 w-16 rounded-full border border-gray-300 bg-white" />
                    </div>
                  </div>
                  <div className="hidden aspect-square w-36 rounded-xl bg-gray-200 sm:block" />
                </div>
              </div>
              {/* Services cards */}
              <div className="border-t border-gray-200 px-5 pb-5 pt-4 sm:px-8">
                <div className="grid grid-cols-3 gap-2.5">
                  {['Corte y Peinado', 'Color y Mechas', 'Tratamientos'].map((name) => (
                    <div key={name} className="rounded-lg border border-gray-200 bg-white p-2.5">
                      <div className="mb-2 h-10 rounded bg-gray-100" />
                      <div className="h-1.5 w-3/4 rounded bg-gray-700/40" />
                      <div className="mt-1 h-1.5 w-1/2 rounded bg-gray-400/30" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
