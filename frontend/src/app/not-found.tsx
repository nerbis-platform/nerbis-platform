import Link from 'next/link';
import { PipeStatic } from '@/components/pipe-avatar';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {/* Subtle glow behind Pipe */}
      <div className="relative">
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: '240px',
            height: '240px',
            background:
              'radial-gradient(circle, var(--primitive-brand-500) 0%, transparent 70%)',
            opacity: 0.06,
            filter: 'blur(40px)',
          }}
          aria-hidden="true"
        />
        <PipeStatic size={120} />
      </div>

      <p className="mt-6 text-sm font-medium uppercase tracking-widest text-muted-foreground/60">
        Error 404
      </p>
      <h1 className="nerbis-display mt-2 text-3xl text-foreground sm:text-4xl">
        Ups, aqui no hay nada
      </h1>
      <p className="mt-3 max-w-sm text-center text-base leading-relaxed text-muted-foreground">
        Parece que esta pagina no existe o fue movida.
        <br />
        <span className="pipe-name">Pipe</span> tampoco sabe donde quedo.
      </p>

      <Link
        href="/"
        className="group mt-10 inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-medium text-white transition-all hover:opacity-90"
        style={{
          background:
            'linear-gradient(135deg, var(--primitive-navy-700) 0%, var(--primitive-brand-600) 100%)',
        }}
      >
        Volver al inicio
        <svg
          width="14"
          height="14"
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
  );
}
