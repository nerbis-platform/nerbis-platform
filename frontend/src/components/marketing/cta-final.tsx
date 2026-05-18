import Link from 'next/link';

export function CtaFinal() {
  return (
    <section className="relative overflow-hidden bg-zinc-950 px-4 py-24 sm:px-6 sm:py-32">
      {/* Glow — brand colors */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        aria-hidden="true"
      >
        <div
          className="h-[400px] w-[400px] rounded-full opacity-15 blur-[100px]"
          style={{ background: 'radial-gradient(ellipse, #0D9488 0%, #1C3B57 60%, transparent 80%)' }}
        />
      </div>

      <div className="relative mx-auto max-w-3xl text-center">
        <h2 className="anim-fade-up text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
          Tu negocio merece mas
          <br />
          que un template.
        </h2>

        <div className="anim-fade-up mt-10">
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-base font-medium text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1C3B57 0%, #0D9488 100%)' }}
          >
            Crea tu sitio gratis
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>

        <p className="anim-fade-up mt-6 text-sm text-zinc-500">
          Sin tarjeta de credito. Sin compromisos.
        </p>
      </div>
    </section>
  );
}
