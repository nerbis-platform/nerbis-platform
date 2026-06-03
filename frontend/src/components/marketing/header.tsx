'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { NerbisWordmark } from './nerbis-wordmark';
import type { HeaderContent } from '@/types/marketing';

interface MarketingHeaderProps {
  content: HeaderContent;
}

export function MarketingHeader({ content }: MarketingHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled
          ? 'border-b border-border/40 bg-background/85 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
          : 'border-b border-transparent bg-background/60'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <NerbisWordmark size={18} className="text-foreground" variant="full" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          {content.nav_links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden flex-col items-center md:flex">
          <Link
            id="header-cta"
            href={content.cta_href}
            className="group inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ background: `linear-gradient(135deg, var(--primitive-navy-700) 0%, var(--primitive-brand-600) 100%)` }}
          >
            {content.cta_text}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
          <Link
            href={content.login_href}
            className="mt-0.5 text-[11px] text-muted-foreground/60 transition-colors hover:text-foreground"
          >
            {content.login_text}
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
            {content.nav_links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <hr className="my-2 border-border" />
            <Link
              href={content.cta_href}
              className="group mt-1 inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-center text-sm font-medium text-white transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg, var(--primitive-navy-700) 0%, var(--primitive-brand-600) 100%)` }}
              onClick={() => setMobileOpen(false)}
            >
              {content.cta_text}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
