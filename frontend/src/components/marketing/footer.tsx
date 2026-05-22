'use client';

import Link from 'next/link';
import { NerbisWordmark } from './nerbis-wordmark';

const footerColumns = [
  {
    title: 'Producto',
    links: [
      { label: 'Generador IA', href: '#' },
      { label: 'Website Builder', href: '#' },
      { label: 'Tienda Online', href: '#' },
      { label: 'Reservas', href: '#' },
      { label: 'Marketing', href: '#' },
      { label: 'Analíticas', href: '#' },
    ],
  },
  {
    title: 'Industrias',
    links: [
      { label: 'Belleza y Bienestar', href: '#' },
      { label: 'Fitness', href: '#' },
      { label: 'Gastronomía', href: '#' },
      { label: 'Moda y Retail', href: '#' },
      { label: 'Salud', href: '#' },
      { label: 'Educación', href: '#' },
      { label: 'Servicios Profesionales', href: '#' },
    ],
  },
  {
    title: 'Recursos',
    links: [
      { label: 'Centro de Ayuda', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Guías', href: '#' },
      { label: 'API Docs', href: '#' },
      { label: 'Estado del Servicio', href: '#' },
      { label: 'Comunidad', href: '#' },
      { label: 'Iniciar Sesión', href: '/login' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { label: 'Sobre NERBIS', href: '#' },
      { label: 'Carreras', href: '#' },
      { label: 'Prensa', href: '#' },
      { label: 'Contacto', href: '#' },
      { label: 'Partners', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Términos de Servicio', href: '/terms' },
      { label: 'Política de Privacidad', href: '/privacy' },
      { label: 'Política de Cookies', href: '/cookies' },
      { label: 'Aviso Legal', href: '#' },
    ],
  },
];

const socialLinks = [
  {
    label: 'Instagram',
    href: '#',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-5">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: 'X',
    href: '#',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: '#',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: '#',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
];

function FooterLinkItem({ href, label }: { href: string; label: string }) {
  const className = "text-sm text-background/60 transition-colors hover:text-background/90";

  if (href.startsWith('#')) {
    return (
      <a href={href} className={className}>
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

export function MarketingFooter() {
  return (
    <footer className="nerbis-grain bg-foreground px-4 py-16 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-7xl">
        {/* Main grid: brand + 5 columns */}
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          {/* Brand column */}
          <div className="lg:col-span-3">
            <Link href="/" className="inline-flex items-center">
              <NerbisWordmark size={18} className="text-background" variant="full" pipeCalm pipeSize={32} />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-background/60">
              La plataforma que crea tu negocio digital con inteligencia artificial.
            </p>

            {/* Social links */}
            <div className="mt-6 flex items-center gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="text-background/40 transition-colors hover:text-background/80"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-9 lg:grid-cols-5 lg:gap-6">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-background">
                  {column.title}
                </p>
                <ul className="flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <FooterLinkItem href={link.href} label={link.label} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-background/10 pt-8 sm:flex-row">
          <p className="text-sm text-background/40">
            &copy; {new Date().getFullYear()} NERBIS. Todos los derechos reservados.
          </p>
          <p className="text-sm text-background/40">
            Hecho con IA en Latinoam&eacute;rica 🌎
          </p>
        </div>
      </div>
    </footer>
  );
}
