'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { NerbisWordmark } from './nerbis-wordmark';

const navLinks = [
  { label: 'Producto', href: '#features' },
  { label: 'Industrias', href: '#industries' },
  { label: 'Como funciona', href: '#how-it-works' },
];

export function MarketingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="nerbis-glass sticky top-0 z-50 w-full border-b border-border/50 bg-background/80">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <NerbisWordmark size={18} className="text-foreground" variant="full" pipeCalm />
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Iniciar sesion
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:opacity-90"
          >
            Crear mi tienda gratis
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Cerrar menu' : 'Abrir menu'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav id="mobile-menu" aria-label="Menu principal" className="border-t border-border/50 bg-background/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1 px-4 py-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <hr className="my-2 border-border" />
            <Link
              href="/login"
              className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              Iniciar sesion
            </Link>
            <Link
              href="/register"
              className="mt-1 rounded-full bg-foreground px-4 py-2.5 text-center text-sm font-medium text-background transition-colors hover:opacity-90"
              onClick={() => setMobileOpen(false)}
            >
              Crear mi tienda gratis
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
