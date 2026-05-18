'use client';

import Link from 'next/link';
import { NerbisWordmark } from './nerbis-wordmark';

const footerLinks = {
  Producto: [
    { label: 'Sitio web', href: '#features' },
    { label: 'Tienda', href: '#features' },
    { label: 'Reservas', href: '#features' },
  ],
  Recursos: [
    { label: 'Ayuda', href: '/ayuda' },
    { label: 'Contacto', href: '/contacto' },
  ],
  Legal: [
    { label: 'Términos', href: '/terms' },
    { label: 'Privacidad', href: '/privacy' },
    { label: 'Cookies', href: '/cookies' },
  ],
};

export function MarketingFooter() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center">
              <NerbisWordmark size={18} className="text-white" />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-zinc-500">
              Tu negocio online en 30 segundos.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <p className="text-sm font-medium text-zinc-300">{category}</p>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('#') ? (
                      <a
                        href={link.href}
                        className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-zinc-800 pt-8">
          <p className="text-center text-sm text-zinc-600">
            &copy; {new Date().getFullYear()} NERBIS. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
