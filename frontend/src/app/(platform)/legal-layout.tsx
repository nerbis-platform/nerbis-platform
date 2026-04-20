// src/app/(platform)/legal-layout.tsx
//
// Shared layout for platform-level legal pages (terms, privacy, cookies).
// Uses NERBIS corporate branding — NO tenant theme injection.

import Link from 'next/link';

export function LegalLayout({ children }: { children: React.ReactNode }) {
  const contactEmail = process.env.NEXT_PUBLIC_NERBIS_EMAIL || 'hola@nerbis.com';

  return (
    <>
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/nerbis-logo.svg"
              alt="NERBIS"
              className="h-8"
            />
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/terms"
              className="text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              Términos de Servicio
            </Link>
            <Link
              href="/privacy"
              className="text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              Política de Privacidad
            </Link>
          </nav>
        </div>
      </header>

      {/* ─── Content ─── */}
      <main className="min-h-screen bg-white">
        <div className="container py-12 max-w-4xl">
          {children}
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t bg-neutral-50">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-sm text-neutral-500">
              <Link href="/terms" className="hover:text-neutral-700 transition-colors">
                Términos de Servicio
              </Link>
              <Link href="/privacy" className="hover:text-neutral-700 transition-colors">
                Política de Privacidad
              </Link>
              <Link href="/cookies" className="hover:text-neutral-700 transition-colors">
                Política de Cookies
              </Link>
            </div>
            <div className="text-sm text-neutral-400">
              &copy; {new Date().getFullYear()} NERBIS SAS. Todos los derechos reservados.
              {contactEmail && (
                <>
                  {' · '}
                  <a
                    href={`mailto:${contactEmail}`}
                    className="hover:text-neutral-600 transition-colors"
                  >
                    {contactEmail}
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
