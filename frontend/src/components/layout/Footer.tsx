// src/components/layout/Footer.tsx

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Instagram, Mail, MapPin, Phone } from 'lucide-react';
import { PromoBanner } from './PromoBanner';
import { BrandLogo } from './BrandLogo';
import { useTenantContact, usePageEnabled } from '@/contexts/TenantContext';

function FooterPageLink({ page, href, label }: { page: string; href: string; label: string }) {
  const isEnabled = usePageEnabled(page);
  if (!isEnabled) return null;
  return (
    <li>
      <Link href={href} className="text-muted-foreground hover:text-primary">
        {label}
      </Link>
    </li>
  );
}

export function Footer() {
  const footerLogoUrl = process.env.NEXT_PUBLIC_FOOTER_LOGO_URL || '/gravitify-logo.png';
  const footerBrand = process.env.NEXT_PUBLIC_FOOTER_COPYRIGHT || 'GRAVITIFY';
  const contact = useTenantContact();

  return (
    <>
      <PromoBanner position="bottom" />
      <footer className="border-t bg-footer">
      <div className="container py-12 mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Info */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <BrandLogo size="sm" href="/" className="mb-4" />
            <p className="text-sm text-muted-foreground">
              {process.env.NEXT_PUBLIC_APP_DESCRIPTION}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="footer-title font-semibold mb-4">Navegación</h4>
            <ul className="space-y-2 text-sm">
              <FooterPageLink page="products" href="/products" label="Productos" />
              <FooterPageLink page="services" href="/services" label="Servicios" />
              <FooterPageLink page="about" href="/about" label="Nosotros" />
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-primary">
                  Contacto
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="footer-title font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-primary">
                  Privacidad
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-muted-foreground hover:text-primary">
                  Términos
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-muted-foreground hover:text-primary">
                  Cookies
                </Link>
              </li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="footer-title font-semibold mb-4">Contacto</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {contact?.address || process.env.NEXT_PUBLIC_CONTACT_ADDRESS}
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                {contact?.phone || process.env.NEXT_PUBLIC_CONTACT_PHONE}
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                {contact?.email || process.env.NEXT_PUBLIC_CONTACT_EMAIL}
              </li>
            </ul>

            {/* Social */}
            <div className="flex gap-4 mt-4">
              <a href="#" className="text-muted-foreground hover:text-primary">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>

    {/* Sección GRAVITIFY - Cielo estrellado */}
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes gravitify-twinkle-1 {
        0%, 100% { opacity: 0.1; }
        50% { opacity: 1; }
      }
      @keyframes gravitify-twinkle-2 {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
      @keyframes gravitify-twinkle-3 {
        0%, 100% { opacity: 0.9; }
        40% { opacity: 1; }
        70% { opacity: 0.3; }
      }
    `}} />
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: '#000000',
        paddingTop: '1.25rem',
        paddingBottom: '1.25rem',
      }}
    >
      {/* Capa 1 - estrellas nítidas */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          animation: 'gravitify-twinkle-1 3s ease-in-out infinite',
          backgroundImage: [
            'radial-gradient(1px 1px at 2% 12%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 5% 55%, #fff 0%, transparent 80%)',
            'radial-gradient(1.2px 1.2px at 7% 82%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 10% 30%, #fff 0%, transparent 80%)',
            'radial-gradient(1.5px 1.5px at 13% 68%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 16% 15%, #fff 0%, transparent 80%)',
            'radial-gradient(1.2px 1.2px at 19% 90%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 22% 42%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 25% 75%, #fff 0%, transparent 80%)',
            'radial-gradient(1.5px 1.5px at 28% 20%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 31% 58%, #fff 0%, transparent 80%)',
            'radial-gradient(1.2px 1.2px at 34% 8%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 37% 85%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 40% 35%, #fff 0%, transparent 80%)',
            'radial-gradient(1.5px 1.5px at 43% 62%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 46% 10%, #fff 0%, transparent 80%)',
            'radial-gradient(1.2px 1.2px at 49% 78%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 52% 48%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 55% 22%, #fff 0%, transparent 80%)',
            'radial-gradient(1.5px 1.5px at 58% 88%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 61% 38%, #fff 0%, transparent 80%)',
            'radial-gradient(1.2px 1.2px at 64% 65%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 67% 5%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 70% 72%, #fff 0%, transparent 80%)',
            'radial-gradient(1.5px 1.5px at 73% 28%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 76% 52%, #fff 0%, transparent 80%)',
            'radial-gradient(1.2px 1.2px at 79% 92%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 82% 18%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 85% 60%, #fff 0%, transparent 80%)',
            'radial-gradient(1.5px 1.5px at 88% 40%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 91% 80%, #fff 0%, transparent 80%)',
            'radial-gradient(1.2px 1.2px at 94% 25%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 97% 50%, #fff 0%, transparent 80%)',
          ].join(', '),
        }}
      />
      {/* Capa 2 - estrellas alternadas */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          animation: 'gravitify-twinkle-2 4s ease-in-out infinite',
          backgroundImage: [
            'radial-gradient(1px 1px at 1% 40%, #fff 0%, transparent 80%)',
            'radial-gradient(1.2px 1.2px at 4% 75%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 6% 18%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 9% 62%, #fff 0%, transparent 80%)',
            'radial-gradient(1.5px 1.5px at 12% 88%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 15% 45%, #fff 0%, transparent 80%)',
            'radial-gradient(1.2px 1.2px at 18% 5%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 21% 70%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 24% 32%, #fff 0%, transparent 80%)',
            'radial-gradient(1.5px 1.5px at 27% 95%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 30% 15%, #fff 0%, transparent 80%)',
            'radial-gradient(1.2px 1.2px at 33% 52%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 36% 78%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 39% 25%, #fff 0%, transparent 80%)',
            'radial-gradient(1.5px 1.5px at 42% 55%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 45% 82%, #fff 0%, transparent 80%)',
            'radial-gradient(1.2px 1.2px at 48% 12%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 51% 65%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 54% 38%, #fff 0%, transparent 80%)',
            'radial-gradient(1.5px 1.5px at 57% 8%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 60% 72%, #fff 0%, transparent 80%)',
            'radial-gradient(1.2px 1.2px at 63% 45%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 66% 92%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 69% 28%, #fff 0%, transparent 80%)',
            'radial-gradient(1.5px 1.5px at 72% 58%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 75% 85%, #fff 0%, transparent 80%)',
            'radial-gradient(1.2px 1.2px at 78% 35%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 81% 10%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 84% 68%, #fff 0%, transparent 80%)',
            'radial-gradient(1.5px 1.5px at 87% 48%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 90% 22%, #fff 0%, transparent 80%)',
            'radial-gradient(1.2px 1.2px at 93% 75%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 96% 42%, #fff 0%, transparent 80%)',
          ].join(', '),
        }}
      />
      {/* Capa 3 - estrellas sutiles extra */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          animation: 'gravitify-twinkle-3 5s ease-in-out infinite',
          backgroundImage: [
            'radial-gradient(1px 1px at 3% 35%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 8% 60%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 11% 8%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 14% 78%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 20% 50%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 23% 15%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 26% 85%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 29% 42%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 35% 68%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 38% 20%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 41% 92%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 44% 48%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 47% 30%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 50% 72%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 53% 5%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 56% 58%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 59% 88%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 62% 25%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 65% 55%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 68% 80%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 71% 15%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 74% 65%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 77% 38%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 80% 95%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 83% 45%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 86% 12%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 89% 70%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 92% 32%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 95% 62%, #fff 0%, transparent 80%)',
            'radial-gradient(1px 1px at 98% 85%, #fff 0%, transparent 80%)',
          ].join(', '),
        }}
      />

      {/* Contenido */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <a
          href="https://graviti.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex flex-col items-center gap-2 group"
        >
          <Image
            src={footerLogoUrl}
            alt="Logo GRAVITIFY"
            width={36}
            height={36}
            className="h-9 w-9 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.4)] group-hover:drop-shadow-[0_0_16px_rgba(255,255,255,0.6)] transition-all"
            unoptimized
          />
          <p className="text-xs text-white/70 group-hover:text-white transition-colors">
            © {new Date().getFullYear()}{' '}
            <span className="font-bold text-white tracking-wider">{footerBrand}</span>. Todos los derechos reservados.
          </p>
        </a>
      </div>
    </div>
    </>
  );
} 
