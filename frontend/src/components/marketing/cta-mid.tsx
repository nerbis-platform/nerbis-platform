import Link from 'next/link';

export function CtaMid() {
  return (
    <section className="border-y border-zinc-800/30 bg-zinc-900/30 px-4 py-16 sm:px-6">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div>
          <h3 className="text-xl font-semibold text-white sm:text-2xl">
            Listo para empezar?
          </h3>
          <p className="mt-1 text-base text-zinc-400">
            Crea tu sitio en segundos. Sin tarjeta de credito.
          </p>
        </div>
        <Link
          href="/register"
          className="group shrink-0 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #1C3B57 0%, #0D9488 100%)' }}
        >
          Crea tu sitio gratis
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </div>
    </section>
  );
}
