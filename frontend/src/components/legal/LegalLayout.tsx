// src/components/legal/LegalLayout.tsx
//
// Shared layout for platform-level legal pages (terms, privacy, cookies).
// Uses NERBIS corporate branding — NO tenant theme injection.

import Link from 'next/link';
import Image from 'next/image';
import { getContactEmail } from '@/lib/legal';

export function LegalLayout({ children }: { children: React.ReactNode }) {
  const contactEmail = getContactEmail();

  return (
    <>
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="NERBIS — Inicio">
            <Image
              src="/nerbis-logo.svg"
              alt="NERBIS"
              width={96}
              height={32}
              priority
              className="h-8 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/terms"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Términos de Servicio
            </Link>
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Política de Privacidad
            </Link>
          </nav>
        </div>
      </header>

      {/* ─── Content ─── */}
      <main className="min-h-screen bg-background">
        <div className="container py-12 max-w-4xl">
          {children}
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border bg-muted/40">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Términos de Servicio
              </Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Política de Privacidad
              </Link>
              <Link href="/cookies" className="hover:text-foreground transition-colors">
                Política de Cookies
              </Link>
            </div>
            <div className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} NERBIS SAS. Todos los derechos reservados.
              {' · '}
              <a
                href={`mailto:${contactEmail}`}
                className="hover:text-foreground transition-colors"
              >
                {contactEmail}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
