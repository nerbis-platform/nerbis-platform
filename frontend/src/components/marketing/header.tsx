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
    <header className="nerbis-glass sticky top-0 z-50 w-full" style={{ borderBottom: `1px solid color-mix(in oklch, var(--color-border-default) 50%, transparent)`, background: 'color-mix(in oklch, var(--color-surface-inverse) 80%, transparent)' }}>
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <NerbisWordmark size={18} className="text-white" variant="full" pipeCalm />
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm transition-colors hover:text-white"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="text-sm transition-colors hover:text-white"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Iniciar sesion
          </Link>
          <Link
            href="/register"
            className="rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-200"
            style={{ background: 'var(--color-surface-default)', color: 'var(--color-surface-inverse)' }}
          >
            Crear mi tienda gratis
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:text-white md:hidden"
          style={{ color: 'var(--color-text-muted)' }}
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
        <nav id="mobile-menu" aria-label="Menu principal" className="backdrop-blur-xl md:hidden" style={{ borderTop: `1px solid color-mix(in oklch, var(--color-border-default) 50%, transparent)`, background: 'color-mix(in oklch, var(--color-surface-inverse) 95%, transparent)' }}>
          <div className="flex flex-col gap-1 px-4 py-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <hr style={{ borderColor: 'var(--color-border-default)' }} className="my-2" />
            <Link
              href="/login"
              className="rounded-lg px-3 py-2.5 text-sm transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onClick={() => setMobileOpen(false)}
            >
              Iniciar sesion
            </Link>
            <Link
              href="/register"
              className="mt-1 rounded-full px-4 py-2.5 text-center text-sm font-medium transition-colors hover:bg-zinc-200"
              style={{ background: 'var(--color-surface-default)', color: 'var(--color-surface-inverse)' }}
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
