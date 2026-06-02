// src/components/layout/Footer.tsx

'use client';

import Link from 'next/link';
import { Facebook, Instagram, Mail, MapPin, Phone } from 'lucide-react';
import { PromoBanner } from './PromoBanner';
import { BrandLogo } from './BrandLogo';
import { useTenantContact, useTenantLegal, usePageEnabled } from '@/contexts/TenantContext';

function FooterPageLink({ page, href, label }: { page: string; href: string; label: string }) {
  const isEnabled = usePageEnabled(page);
  if (!isEnabled) return null;
  return (
    <li>
      <Link
        href={href}
        className="text-[var(--color-text-inverse)]/60 hover:text-[var(--color-text-inverse)] transition-colors"
        style={{ transitionDuration: 'var(--duration-fast)' }}
      >
        {label}
      </Link>
    </li>
  );
}

export function Footer() {
  const footerBrand = process.env.NEXT_PUBLIC_FOOTER_COPYRIGHT || 'NERBIS';
  const contact = useTenantContact();
  const legal = useTenantLegal();

  return (
    <>
      <PromoBanner position="bottom" />

      {/* Tenant footer */}
      <footer className="border-t border-[var(--color-border-default)] bg-[var(--color-surface-sunken)]">
        <div className="container py-12 mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Info */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <BrandLogo size="sm" href="/" className="mb-4" />
              <p className="text-sm text-[var(--color-text-secondary)]">
                {process.env.NEXT_PUBLIC_APP_DESCRIPTION}
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
                Navegacion
              </h4>
              <ul className="flex flex-col gap-2 text-sm">
                <FooterPageLink page="products" href="/products" label="Productos" />
                <FooterPageLink page="services" href="/services" label="Servicios" />
                <FooterPageLink page="about" href="/about" label="Nosotros" />
                <li>
                  <Link
                    href="/contact"
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    style={{ transitionDuration: 'var(--duration-fast)' }}
                  >
                    Contacto
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
                Legal
              </h4>
              <ul className="flex flex-col gap-2 text-sm">
                <li>
                  <Link
                    href="/privacy"
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    style={{ transitionDuration: 'var(--duration-fast)' }}
                  >
                    Privacidad
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    style={{ transitionDuration: 'var(--duration-fast)' }}
                  >
                    Terminos
                  </Link>
                </li>
                <li>
                  <Link
                    href="/cookies"
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    style={{ transitionDuration: 'var(--duration-fast)' }}
                  >
                    Cookies
                  </Link>
                </li>
              </ul>
              {(legal?.legal_name || legal?.tax_id || legal?.legal_address) && (
                <div className="mt-4 pt-4 border-t border-[var(--color-border-default)]/50 text-xs text-[var(--color-text-secondary)] space-y-1">
                  {legal.legal_name && <p>{legal.legal_name}</p>}
                  {legal.tax_id && <p>NIT: {legal.tax_id}</p>}
                  {legal.legal_address && <p>{legal.legal_address}</p>}
                </div>
              )}
            </div>

            {/* Contacto */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
                Contacto
              </h4>
              <ul className="flex flex-col gap-3 text-sm">
                {contact?.address && (
                  <li className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {contact.address}
                  </li>
                )}
                {contact?.phone && (
                  <li className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                    <Phone className="h-4 w-4 shrink-0" />
                    {contact.phone}
                  </li>
                )}
                {contact?.email && (
                  <li className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                    <Mail className="h-4 w-4 shrink-0" />
                    {contact.email}
                  </li>
                )}
              </ul>

              {/* Social */}
              <div className="flex gap-4 mt-4">
                <a
                  href="#"
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                  style={{ transitionDuration: 'var(--duration-fast)' }}
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                  style={{ transitionDuration: 'var(--duration-fast)' }}
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* NERBIS brand bar — dark surface with grain */}
      <div className="relative bg-[var(--color-surface-inverse)] nerbis-grain">
        <div className="relative z-10 flex flex-col items-center gap-1 py-5">
          <a
            href="https://nerbis.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 group"
          >
            <span
              className="text-xs font-extrabold tracking-[var(--tracking-display)] text-[var(--color-text-inverse)]"
            >
              {footerBrand}
            </span>
          </a>
          <p className="text-[var(--text-xs)] text-[var(--color-text-inverse)]/50">
            &copy; {new Date().getFullYear()} Todos los derechos reservados.
          </p>
        </div>
      </div>
    </>
  );
}
