'use client';

import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import type { WebsiteTheme, WebsiteSeo, WebsiteMedia, SectionData } from '@/contexts/WebsiteContentContext';
import { useScrollAnimation } from './useScrollAnimation';
import { useParallax } from './useParallax';
import '@/styles/published-website.css';

// ─── Nav labels ─────────────────────────────────────────
const SECTION_NAV_LABELS: Record<string, string> = {
  about: 'Nosotros',
  services: 'Servicios',
  products: 'Productos',
  testimonials: 'Testimonios',
  gallery: 'Galería',
  pricing: 'Precios',
  faq: 'FAQ',
  contact: 'Contacto',
  team: 'Equipo',
  blog: 'Blog',
};

// ─── Social Icons ───────────────────────────────────────
const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  instagram: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>,
  facebook: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>,
  twitter: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>,
  tiktok: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12a4 4 0 104 4V4a5 5 0 005 5" /></svg>,
  youtube: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.33z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" /></svg>,
  linkedin: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>,
};

// ─── Types ──────────────────────────────────────────────
interface WebsiteShellProps {
  theme?: WebsiteTheme;
  seo?: WebsiteSeo;
  media?: WebsiteMedia;
  content: Record<string, SectionData>;
  sections: string[];
  children: ReactNode;
}

export function WebsiteShell({ theme, seo, media, content, sections, children }: WebsiteShellProps) {
  const headerRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  // Scroll-triggered animations: observes .anim-* and .reveal elements
  const scrollRef = useScrollAnimation<HTMLDivElement>({}, [children]);
  // Parallax effect for hero backgrounds
  const parallaxRef = useParallax<HTMLDivElement>();

  const primaryColor = theme?.primary_color || '#3b82f6';
  const secondaryColor = theme?.secondary_color || '#10b981';
  const fontHeading = theme?.font_heading || 'Poppins';
  const fontBody = theme?.font_body || 'Inter';
  const style = theme?.style || 'modern';
  const colorMode = theme?.color_mode || 'light';
  const isDark = colorMode === 'dark';

  const borderRadius = style === 'modern' || style === 'clean' ? '12px'
    : style === 'elegant' ? '4px' : '8px';

  // Nav sections (skip hero, header)
  const navSections = sections.filter(s => s !== 'hero' && s !== 'header' && s !== '_section_order');

  // Header data
  const headerData = content.header || {};
  const logoText = headerData.logo_text || '';
  const ctaText = headerData.cta_text || '';
  const ctaLink = headerData.cta_link || '#contact';

  // Contact data for footer
  const contactData = content.contact || {};

  // Social links
  const socialLinks = seo?.social_links || {};

  // ─── SEO: update document title ────────────────────────
  useEffect(() => {
    if (seo?.meta_title) {
      document.title = seo.meta_title;
    }
    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (seo?.meta_description) {
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', seo.meta_description);
    }
  }, [seo]);

  // ─── Scroll effects ───────────────────────────────────
  const handleScroll = useCallback(() => {
    const scrollY = window.scrollY;
    if (headerRef.current) {
      headerRef.current.classList.toggle('scrolled', scrollY > 20);
    }
    setShowScrollTop(scrollY > 500);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Scroll reveal is now handled by useScrollAnimation hook (scrollRef)
  // which observes both .reveal and .anim-* elements

  // ─── Smooth scroll for anchor links ───────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;

      try {
        const el = document.querySelector(href);
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } catch {
        // invalid selector
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, []);

  // ─── CSS Variables ────────────────────────────────────
  const cssVars = {
    '--primary': primaryColor,
    '--secondary': secondaryColor,
    '--font-heading': `'${fontHeading}', sans-serif`,
    '--font-body': `'${fontBody}', sans-serif`,
    '--radius': borderRadius,
    '--shadow-sm': isDark
      ? '0 1px 3px rgba(0,0,0,.2), 0 1px 2px rgba(0,0,0,.15)'
      : '0 1px 3px rgba(0,0,0,.04), 0 1px 2px rgba(0,0,0,.06)',
    '--shadow-md': isDark
      ? '0 4px 16px rgba(0,0,0,.25), 0 1px 3px rgba(0,0,0,.15)'
      : '0 4px 16px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.04)',
    '--shadow-lg': isDark
      ? '0 12px 40px rgba(0,0,0,.35), 0 4px 12px rgba(0,0,0,.2)'
      : '0 12px 40px rgba(0,0,0,.08), 0 4px 12px rgba(0,0,0,.04)',
    '--shadow-xl': isDark
      ? '0 20px 60px rgba(0,0,0,.4), 0 8px 20px rgba(0,0,0,.25)'
      : '0 20px 60px rgba(0,0,0,.1), 0 8px 20px rgba(0,0,0,.06)',
  } as React.CSSProperties;

  // ─── Google Fonts URL ─────────────────────────────────
  const fontsUrl = `https://fonts.googleapis.com/css2?family=${fontHeading.replace(/ /g, '+')}:wght@400;600;700&family=${fontBody.replace(/ /g, '+')}:wght@300;400;500;600&display=swap`;

  return (
    <>
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href={fontsUrl} rel="stylesheet" />

      <div ref={(node) => {
        // Combine refs: containerRef for smooth scroll, scrollRef for animations, parallaxRef for parallax
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        (parallaxRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }} className={`published-website pw-style-${style}`} style={cssVars} data-color-mode={colorMode}>
        {/* Header */}
        <header ref={headerRef} className="site-header">
          <div className="container">
            <a href="#" className="logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              {media?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={media.logo_url} alt={logoText || 'Logo'} className="logo-img" />
              ) : (
                logoText || 'Mi Sitio'
              )}
            </a>
            <nav>
              {navSections.map((s) => (
                <a key={s} href={`#${s}`}>{SECTION_NAV_LABELS[s] || s}</a>
              ))}
            </nav>
            {ctaText && (
              <a href={ctaLink} className="header-cta">{ctaText}</a>
            )}
          </div>
        </header>

        {/* Sections */}
        {children}

        {/* Scroll to top */}
        <button
          className={`scroll-top-btn${showScrollTop ? ' visible' : ''}`}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Volver arriba"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </button>

        {/* Footer */}
        <footer className="site-footer">
          <div className="container">
            <div>
              <div className="footer-brand">
                {logoText || 'Mi Sitio'}
              </div>
              <p className="footer-desc">
                {contactData.address || ''}
              </p>
              {Object.keys(socialLinks).length > 0 && (
                <div className="footer-social">
                  {Object.entries(socialLinks).map(([key, url]) => {
                    if (!url) return null;
                    return (
                      <a key={key} href={url as string} target="_blank" rel="noopener noreferrer" className="footer-social-link">
                        {SOCIAL_ICONS[key] || key[0].toUpperCase()}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <h4>Secciones</h4>
              <ul>
                {navSections.map((s) => (
                  <li key={s}><a href={`#${s}`}>{SECTION_NAV_LABELS[s] || s}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Contacto</h4>
              <ul>
                {contactData.phone && <li><a href={`tel:${contactData.phone}`}>{contactData.phone}</a></li>}
                {contactData.email && <li><a href={`mailto:${contactData.email}`}>{contactData.email}</a></li>}
                {contactData.address && <li><span>{contactData.address}</span></li>}
              </ul>
            </div>
            <div className="footer-bottom">
              &copy; {new Date().getFullYear()} {logoText || 'Mi Sitio'}. Todos los derechos reservados.
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
