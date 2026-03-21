// src/app/page.tsx

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-[#0f1e2e] via-[#1C3B57] to-[#0f1e2e] px-4 text-center">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <path d="M6 16C6 10.477 10.477 6 16 6s10 4.477 10 10-4.477 10-10 10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M16 16h6M16 16v6" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="text-white text-2xl font-bold tracking-tight">NERBIS</span>
      </div>

      {/* Headline */}
      <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
        Algo grande está<br />
        <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-cyan-300">
          en camino
        </span>
      </h1>

      <p className="text-slate-300 text-lg max-w-md mb-10 leading-relaxed">
        Estamos preparando la plataforma para que puedas crear y gestionar tu negocio digital fácilmente.
      </p>

      {/* CTA */}
      <Link
        href="/login"
        className="inline-flex items-center gap-2 bg-white text-[#1C3B57] font-semibold px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors text-base shadow-lg"
      >
        Iniciar sesión
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </Link>

      {/* Footer */}
      <p className="mt-16 text-slate-500 text-sm">
        © {new Date().getFullYear()} <span className="font-bold">NERBIS</span> — Todos los derechos reservados
      </p>
    </div>
  );
}
