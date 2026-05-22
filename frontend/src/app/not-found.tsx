import Link from 'next/link';
import { PipeAvatar } from '@/components/pipe-avatar';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <PipeAvatar mood="surprised" size={96} calm />
      <h1 className="nerbis-display mt-8 text-5xl text-foreground sm:text-6xl">
        404
      </h1>
      <p className="mt-3 text-center text-lg text-muted-foreground">
        Esta pagina no existe o fue movida.
      </p>
      <Link
        href="/"
        className="group mt-8 inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-medium text-white transition-all hover:opacity-90"
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
