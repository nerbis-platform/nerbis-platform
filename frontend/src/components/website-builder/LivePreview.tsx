'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Monitor, Tablet, Smartphone, RefreshCw, Loader2, Maximize2, Minimize2 } from 'lucide-react';

interface ThemeOverrides {
  primary_color?: string;
  secondary_color?: string;
  font_heading?: string;
  font_body?: string;
  style?: string;
  spacing?: string;
  button_style?: string;
  animation?: string;
  shadow?: string;
  color_mode?: string;
  bg_color?: string;
}

interface LivePreviewProps {
  htmlContent: string | null;
  isLoading?: boolean;
  onSectionClick?: (sectionId: string) => void;
  onRefresh?: () => void;
  themeOverrides?: ThemeOverrides;
  siteName?: string;
  faviconUrl?: string;
  siteUrl?: string;
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

const DEVICE_CONFIG: Record<DeviceMode, { width: string; label: string; scale?: boolean }> = {
  desktop: { width: '100%', label: 'Escritorio' },
  tablet: { width: '768px', label: 'Tablet', scale: true },
  mobile: { width: '375px', label: 'Móvil', scale: true },
};

// Apply dramatic style overrides via injected <style> tag
function applyStyleOverrides(doc: Document, style: string, primary: string) {
  const id = 'theme-style-overrides';
  let el = doc.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = doc.createElement('style');
    el.id = id;
    doc.head.appendChild(el);
  }

  const styles: Record<string, string> = {
    modern: `
      :root { --radius: 12px; }
      .card { border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,.06); border: none; }
      .card:hover { box-shadow: 0 16px 48px rgba(0,0,0,.1); transform: translateY(-6px); }
      .card::before { border-radius: 16px 16px 0 0; }
      .btn { border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
      .btn:hover { box-shadow: 0 6px 20px rgba(0,0,0,.15); transform: translateY(-3px); }
      .section { padding: 80px 24px; }
      .section-title { letter-spacing: -0.02em; }
      .faq-item { border-radius: 16px; }
      .testimonial-card { border-radius: 16px; }
      .card-icon { border-radius: 14px; }
    `,
    elegant: `
      :root { --radius: 2px; }
      .card { border-radius: 2px; box-shadow: none; border: 1px solid #e5e5e5; }
      .card:hover { box-shadow: none; transform: none; border-color: #999; }
      .card::before { display: none; }
      .btn { border-radius: 0; text-transform: uppercase; letter-spacing: 0.15em; font-size: 0.8rem; font-weight: 500; }
      .btn-primary { background: transparent; color: ${primary || 'var(--primary)'}; border: 2px solid ${primary || 'var(--primary)'}; }
      .btn-primary:hover { background: ${primary || 'var(--primary)'}; color: #fff; }
      .btn:hover { transform: none; box-shadow: none; }
      .section-title { letter-spacing: 0.02em; font-weight: 600; }
      .section-label { letter-spacing: 0.2em; font-size: 0.65rem; }
      h1, h2, h3, .section-title { font-weight: 600; }
      .faq-item { border-radius: 0; border: none; border-bottom: 1px solid #e5e7eb; }
      .testimonial-card { border-radius: 2px; border: 1px solid #e5e5e5; }
      .card-icon { border-radius: 2px; }
      .header-cta { border-radius: 0; }
      .site-header nav a { border-radius: 0; }
    `,
    bold: `
      :root { --radius: 8px; }
      .card { border-radius: 8px; border: 3px solid #111; box-shadow: 6px 6px 0 #111; }
      .card:hover { transform: translate(-2px, -2px); box-shadow: 8px 8px 0 #111; }
      .card::before { height: 5px; }
      .btn { border-radius: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding: 16px 40px; font-size: 1rem; }
      .btn:hover { transform: translate(-2px, -2px); box-shadow: 4px 4px 0 #111; }
      .section-title { font-size: 2.8rem; font-weight: 800; letter-spacing: -0.03em; }
      .section-label { font-size: 0.8rem; font-weight: 800; }
      .hero h1 { font-size: 4rem; font-weight: 900; }
      .faq-item { border: 2px solid #111; border-radius: 8px; }
      .testimonial-card { border: 2px solid #111; border-radius: 8px; }
      .stat-number { font-size: 3.5rem; font-weight: 900; }
    `,
    clean: `
      :root { --radius: 8px; }
      .card { border-radius: 12px; box-shadow: none; border: 1px solid #f0f0f0; }
      .card:hover { box-shadow: 0 2px 12px rgba(0,0,0,.04); transform: none; }
      .card::before { display: none; }
      .btn { border-radius: 8px; font-weight: 500; box-shadow: none; }
      .btn:hover { transform: none; box-shadow: none; opacity: 0.85; }
      .section { padding: 96px 24px; }
      .section-title { font-size: 1.9rem; font-weight: 600; letter-spacing: -0.01em; }
      .section-subtitle { font-size: 0.95rem; color: #9ca3af; }
      .section-label { font-size: 0.6rem; color: #9ca3af; }
      .faq-item { border: 1px solid #f5f5f5; border-radius: 12px; }
      .testimonial-card { border: 1px solid #f5f5f5; border-radius: 12px; }
      .card-icon { border-radius: 10px; opacity: 0.8; }
    `,
    minimal: `
      :root { --radius: 0px; }
      .card { border-radius: 0; box-shadow: none; border: none; border-bottom: 1px solid #e5e7eb; padding: 24px 0; }
      .card:hover { box-shadow: none; transform: none; }
      .card::before { display: none; }
      .btn { border-radius: 0; background: transparent !important; color: ${primary || 'var(--primary)'} !important; padding: 0; text-decoration: underline; text-underline-offset: 4px; font-weight: 500; box-shadow: none; }
      .btn:hover { transform: none; box-shadow: none; opacity: 0.7; }
      .section { padding: 64px 24px; }
      .section-title { font-size: 1.8rem; font-weight: 600; }
      .section-subtitle { font-size: 0.9rem; }
      .section-label { display: none; }
      .section-alt { background: transparent; }
      .faq-item { border: none; border-bottom: 1px solid #e5e7eb; border-radius: 0; }
      .testimonial-card { border: none; border-bottom: 1px solid #e5e7eb; border-radius: 0; padding: 24px 0; }
      .card-icon { border-radius: 0; background: none; }
      .hero { padding: 100px 24px 80px; }
    `,
    artistic: `
      :root { --radius: 20px; }
      .card { border-radius: 24px; box-shadow: 0 8px 32px rgba(0,0,0,.06); border: none; overflow: hidden; }
      .card:hover { box-shadow: 0 12px 40px ${primary ? primary + '20' : 'rgba(0,0,0,.1)'}; transform: translateY(-4px) rotate(-0.5deg); }
      .card::before { height: 4px; background: linear-gradient(90deg, var(--primary), var(--secondary), var(--primary)); }
      .btn { border-radius: 999px; padding: 14px 32px; }
      .btn:hover { transform: scale(1.05); }
      .section-title { letter-spacing: -0.02em; }
      .section-label { background: linear-gradient(90deg, var(--primary), var(--secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800; }
      .faq-item { border-radius: 20px; }
      .testimonial-card { border-radius: 24px; }
      .card-icon { border-radius: 50%; }
      .header-cta { border-radius: 999px; }
      .site-header nav a { border-radius: 999px; }
    `,
  };

  el.textContent = styles[style] || styles.modern;
}

// Apply spacing/density overrides via injected <style> tag
function applySpacingOverrides(doc: Document, spacing: string) {
  const id = 'theme-spacing-overrides';
  let el = doc.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = doc.createElement('style');
    el.id = id;
    doc.head.appendChild(el);
  }

  const styles: Record<string, string> = {
    compact: `
      .section { padding: 48px 20px; }
      .section-header { margin-bottom: 28px; }
      .card { padding: 16px; }
      .hero { padding: 60px 20px 48px; }
      .grid, [class*="grid"] { gap: 16px; }
      h1, .hero h1 { margin-bottom: 12px; }
      h2, .section-title { margin-bottom: 8px; }
      .section-subtitle { margin-bottom: 16px; }
      .faq-item { padding: 12px 16px; margin-bottom: 8px; }
      .testimonial-card { padding: 16px; }
      @media (max-width: 768px) {
        .section { padding: 36px 16px; }
        .hero { padding: 48px 16px 36px; }
      }
    `,
    normal: ``,
    spacious: `
      .section { padding: 160px 48px; }
      .section-header { margin-bottom: 80px; }
      .card { padding: 40px; }
      .hero { padding: 200px 48px 160px; }
      .grid, [class*="grid"] { gap: 40px; row-gap: 48px; }
      h1, .hero h1 { margin-bottom: 32px; font-size: 3.5rem; }
      h2, .section-title { margin-bottom: 20px; }
      .section-subtitle { margin-bottom: 48px; font-size: 1.15rem; line-height: 1.8; }
      .section-label { margin-bottom: 16px; }
      .faq-item { padding: 28px 32px; margin-bottom: 20px; }
      .testimonial-card { padding: 48px; }
      .btn { padding: 18px 40px; font-size: 1rem; }
      @media (max-width: 768px) {
        .section { padding: 100px 24px; }
        .hero { padding: 140px 24px 100px; }
      }
    `,
  };

  el.textContent = styles[spacing] || '';
}

// Apply button style overrides via injected <style> tag
function applyButtonOverrides(doc: Document, buttonStyle: string, primary: string, secondary: string) {
  const id = 'theme-button-overrides';
  let el = doc.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = doc.createElement('style');
    el.id = id;
    doc.head.appendChild(el);
  }

  const s = secondary || 'var(--secondary)';
  // Use body prefix for higher specificity — must win over applyStyleOverrides
  const styles: Record<string, string> = {
    pill: `
      body .btn, body .header-cta { border-radius: 9999px !important; }
    `,
    rounded: `
      body .btn, body .header-cta { border-radius: 8px !important; }
    `,
    square: `
      body .btn, body .header-cta { border-radius: 0 !important; }
    `,
    outline: `
      body .btn, body .header-cta { border-radius: 8px !important; }
      body .btn.btn-primary,
      body .btn-primary,
      body .btn-secondary,
      body .hero .btn,
      body .header-cta {
        background: transparent !important;
        color: ${s} !important;
        border: 2px solid ${s} !important;
        box-shadow: none !important;
      }
      body .btn.btn-primary:hover,
      body .btn-primary:hover,
      body .btn-secondary:hover,
      body .hero .btn:hover,
      body .header-cta:hover {
        background: ${s} !important;
        color: #fff !important;
      }
    `,
  };

  el.textContent = styles[buttonStyle] || '';
}

// Apply animation overrides via injected <style> tag
function applyAnimationOverrides(doc: Document, animation: string) {
  const id = 'theme-animation-overrides';
  let el = doc.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = doc.createElement('style');
    el.id = id;
    doc.head.appendChild(el);
  }

  const styles: Record<string, string> = {
    none: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
      }
      .card:hover, .btn:hover { transform: none !important; }
    `,
    fade: `
      .section {
        opacity: 0;
        animation: gvFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .section:nth-child(2) { animation-delay: 0.1s; }
      .section:nth-child(3) { animation-delay: 0.2s; }
      .section:nth-child(4) { animation-delay: 0.3s; }
      .section:nth-child(5) { animation-delay: 0.4s; }
      @keyframes gvFade {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
    `,
    slide: `
      .section {
        opacity: 0;
        animation: gvSlideUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .section:nth-child(2) { animation-delay: 0.08s; }
      .section:nth-child(3) { animation-delay: 0.16s; }
      .section:nth-child(4) { animation-delay: 0.24s; }
      .section:nth-child(5) { animation-delay: 0.32s; }
      .hero h1, .hero .hero-subtitle, .hero .btn {
        opacity: 0;
        animation: gvSlideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .hero h1 { animation-delay: 0.15s; }
      .hero .hero-subtitle { animation-delay: 0.25s; }
      .hero .btn { animation-delay: 0.35s; }
      @keyframes gvSlideUp {
        from { opacity: 0; transform: translateY(40px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `,
    stagger: `
      .section {
        opacity: 0;
        animation: gvReveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .section:nth-child(2) { animation-delay: 0.05s; }
      .section:nth-child(3) { animation-delay: 0.1s; }
      .section:nth-child(4) { animation-delay: 0.15s; }
      .section:nth-child(5) { animation-delay: 0.2s; }
      .card,
      .faq-item,
      .testimonial-card,
      .stat-card {
        opacity: 0;
        animation: gvStagger 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .card:nth-child(1), .faq-item:nth-child(1), .testimonial-card:nth-child(1), .stat-card:nth-child(1) { animation-delay: 0.15s; }
      .card:nth-child(2), .faq-item:nth-child(2), .testimonial-card:nth-child(2), .stat-card:nth-child(2) { animation-delay: 0.3s; }
      .card:nth-child(3), .faq-item:nth-child(3), .testimonial-card:nth-child(3), .stat-card:nth-child(3) { animation-delay: 0.45s; }
      .card:nth-child(4), .faq-item:nth-child(4), .testimonial-card:nth-child(4), .stat-card:nth-child(4) { animation-delay: 0.6s; }
      .card:nth-child(5), .faq-item:nth-child(5), .testimonial-card:nth-child(5), .stat-card:nth-child(5) { animation-delay: 0.75s; }
      .card:nth-child(6), .faq-item:nth-child(6), .testimonial-card:nth-child(6), .stat-card:nth-child(6) { animation-delay: 0.9s; }
      .hero h1, .hero .hero-subtitle, .hero .btn {
        opacity: 0;
        animation: gvStagger 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .hero h1 { animation-delay: 0.2s; }
      .hero .hero-subtitle { animation-delay: 0.35s; }
      .hero .btn { animation-delay: 0.5s; }
      .section-label, .section-title, .section-subtitle {
        opacity: 0;
        animation: gvStagger 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .section-label { animation-delay: 0.1s; }
      .section-title { animation-delay: 0.2s; }
      .section-subtitle { animation-delay: 0.3s; }
      @keyframes gvReveal {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes gvStagger {
        from { opacity: 0; transform: translateY(24px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
    `,
  };

  el.textContent = styles[animation] || '';
}

// Apply shadow overrides via injected <style> tag
function applyShadowOverrides(doc: Document, shadow: string) {
  const id = 'theme-shadow-overrides';
  let el = doc.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = doc.createElement('style');
    el.id = id;
    doc.head.appendChild(el);
  }

  const styles: Record<string, string> = {
    none: `
      .card, .faq-item, .testimonial-card, .stat-card {
        box-shadow: none !important;
      }
      .card:hover, .faq-item:hover, .testimonial-card:hover, .stat-card:hover {
        box-shadow: none !important;
      }
      .site-header, .site-header.scrolled {
        box-shadow: none !important;
      }
      .btn {
        box-shadow: none !important;
      }
      .btn:hover {
        box-shadow: none !important;
      }
    `,
    subtle: `
      .card, .faq-item, .testimonial-card, .stat-card {
        box-shadow: 0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04) !important;
      }
      .card:hover, .faq-item:hover, .testimonial-card:hover, .stat-card:hover {
        box-shadow: 0 4px 12px rgba(0,0,0,.08) !important;
      }
      .site-header, .site-header.scrolled {
        box-shadow: 0 1px 4px rgba(0,0,0,.05) !important;
      }
      .btn {
        box-shadow: 0 1px 2px rgba(0,0,0,.06) !important;
      }
      .btn:hover {
        box-shadow: 0 3px 8px rgba(0,0,0,.1) !important;
      }
    `,
    medium: `
      .card, .faq-item, .testimonial-card, .stat-card {
        box-shadow: 0 4px 16px rgba(0,0,0,.08), 0 2px 6px rgba(0,0,0,.04) !important;
      }
      .card:hover, .faq-item:hover, .testimonial-card:hover, .stat-card:hover {
        box-shadow: 0 12px 32px rgba(0,0,0,.12) !important;
      }
      .site-header, .site-header.scrolled {
        box-shadow: 0 2px 12px rgba(0,0,0,.07) !important;
      }
      .btn {
        box-shadow: 0 2px 6px rgba(0,0,0,.08) !important;
      }
      .btn:hover {
        box-shadow: 0 6px 16px rgba(0,0,0,.14) !important;
      }
    `,
    dramatic: `
      .card, .faq-item, .testimonial-card, .stat-card {
        box-shadow: 0 10px 40px rgba(0,0,0,.12), 0 4px 12px rgba(0,0,0,.06) !important;
      }
      .card:hover, .faq-item:hover, .testimonial-card:hover, .stat-card:hover {
        box-shadow: 0 20px 60px rgba(0,0,0,.18), 0 8px 20px rgba(0,0,0,.08) !important;
      }
      .site-header, .site-header.scrolled {
        box-shadow: 0 4px 20px rgba(0,0,0,.1) !important;
      }
      .btn {
        box-shadow: 0 4px 14px rgba(0,0,0,.12) !important;
      }
      .btn:hover {
        box-shadow: 0 8px 28px rgba(0,0,0,.2) !important;
        transform: translateY(-2px);
      }
    `,
  };

  el.textContent = styles[shadow] || '';
}

// Apply color mode (light/dark) overrides via injected <style> tag
function applyColorModeOverrides(doc: Document, colorMode: string) {
  const id = 'theme-color-mode-overrides';
  let el = doc.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = doc.createElement('style');
    el.id = id;
    doc.head.appendChild(el);
  }

  if (colorMode === 'dark') {
    el.textContent = `
      /* ── Base ── */
      body {
        background: #0f172a !important;
        color: #e2e8f0 !important;
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
      }

      /* ── Sections ── */
      .section { background-color: transparent !important; }
      .section:nth-child(even) { background: rgba(30,41,59,0.3) !important; }
      .section-subtitle { color: #94a3b8 !important; }

      /* ── Section divider gradient ── */
      .section + .section { border-top: 1px solid transparent !important; background-clip: padding-box !important; }

      /* ── Cards — glass morphism ── */
      .card, .bento-item, .faq-item, .testimonial-card, .pricing-card, .contact-card {
        background: rgba(30,41,59,0.6) !important;
        backdrop-filter: blur(12px) !important;
        -webkit-backdrop-filter: blur(12px) !important;
        border-color: rgba(255,255,255,0.08) !important;
      }
      .card:hover, .bento-item:hover, .testimonial-card:hover, .pricing-card:hover {
        border-color: rgba(255,255,255,0.12) !important;
        box-shadow: 0 12px 40px rgba(0,0,0,0.35), 0 0 16px color-mix(in srgb, var(--primary), transparent 70%) !important;
      }
      .card h3, .faq-item h3, .testimonial-card h3, .bento-item h3, .pricing-card h3 {
        color: #f1f5f9 !important;
      }
      .card p, .card span, .faq-item p, .testimonial-card p, .bento-item p, .pricing-card p {
        color: #94a3b8 !important;
      }
      .card .card-icon {
        background: rgba(255,255,255,.06) !important;
        border: 1px solid rgba(255,255,255,.08) !important;
      }
      .card .card-price {
        background: rgba(255,255,255,.08) !important;
      }
      .card::before { opacity: 0.7; }
      .card:hover::before { opacity: 1; }

      /* ── Pricing recommended — glow ── */
      .pricing-card--recommended {
        border-color: var(--primary) !important;
        box-shadow: 0 0 30px color-mix(in srgb, var(--primary), transparent 60%) !important;
      }

      /* ── Stats ── */
      .stat-number { color: #f1f5f9 !important; }
      .stat-label { color: #64748b !important; }

      /* ── Header — glass ── */
      .site-header {
        background: rgba(15,23,42,0.85) !important;
        border-color: rgba(255,255,255,.06) !important;
        backdrop-filter: blur(20px) saturate(1.4) !important;
        -webkit-backdrop-filter: blur(20px) saturate(1.4) !important;
      }
      .site-header.scrolled {
        background: rgba(15,23,42,0.96) !important;
        box-shadow: 0 4px 30px rgba(0,0,0,0.3) !important;
      }
      .site-header nav a { color: #cbd5e1 !important; }
      .site-header nav a:hover { color: #fff !important; }
      .logo { color: #f1f5f9 !important; }

      /* ── FAQ ── */
      .faq-trigger { color: #f1f5f9 !important; }
      .faq-answer { color: #94a3b8 !important; }

      /* ── Testimonials ── */
      .author-name { color: #f1f5f9 !important; }
      .author-role { color: #64748b !important; }

      /* ── Generic text ── */
      h1, h2, h3, h4, h5, h6 { color: #f1f5f9 !important; }
      .hero h1, .hero p { color: #fff !important; }
      .section-title { color: #f1f5f9 !important; }
      .section-label { color: var(--secondary) !important; }

      /* ── Hero adjustments ── */
      .hero--centered {
        background: linear-gradient(135deg, #0f172a, #1e293b) !important;
      }
      .hero--split { background: #0f172a !important; }
      .hero--split h1 { color: #f1f5f9 !important; }
      .hero--split p { color: #94a3b8 !important; }
      .hero--bold { background: #0f172a !important; color: #f1f5f9 !important; }

      /* ── Highlights ── */
      .highlight {
        background: rgba(255,255,255,0.05) !important;
        border-color: rgba(255,255,255,0.08) !important;
      }
      .highlight span { color: #cbd5e1 !important; }

      /* ── Overlap cards ── */
      .overlap-card {
        background: rgba(30,41,59,0.7) !important;
        border-color: rgba(255,255,255,0.08) !important;
      }

      /* ── Services lists ── */
      .svc-list-item { border-color: rgba(255,255,255,0.06) !important; }
      .svc-featured-main { background: rgba(30,41,59,0.6) !important; border-color: rgba(255,255,255,0.08) !important; }
      .svc-featured-small { background: rgba(30,41,59,0.5) !important; border-color: rgba(255,255,255,0.06) !important; }
      .svc-icon-box { background: rgba(255,255,255,0.06) !important; }

      /* ── Products ── */
      .catalog-item { background: rgba(30,41,59,0.5) !important; border-color: rgba(255,255,255,0.08) !important; }
      .masonry-item { background: rgba(30,41,59,0.6) !important; border-color: rgba(255,255,255,0.08) !important; }
      .price-table-row { border-color: rgba(255,255,255,0.06) !important; }
      .pricing-table { border-color: rgba(255,255,255,0.08) !important; }
      .pricing-table th { background: rgba(30,41,59,0.8) !important; color: #f1f5f9 !important; border-color: rgba(255,255,255,0.08) !important; }
      .pricing-table td { border-color: rgba(255,255,255,0.06) !important; color: #94a3b8 !important; }

      /* ── Forms / inputs ── */
      input, textarea, select {
        background-color: rgba(15,23,42,0.6) !important;
        border-color: rgba(255,255,255,0.1) !important;
        color: #e2e8f0 !important;
      }

      /* ── Buttons — glow ── */
      .btn-primary:hover { box-shadow: 0 0 30px color-mix(in srgb, var(--primary), transparent 60%) !important; }
      .btn-outline { border-color: rgba(255,255,255,0.2) !important; color: #e2e8f0 !important; }
      .btn-outline:hover { background: rgba(255,255,255,0.08) !important; border-color: rgba(255,255,255,0.3) !important; }

      /* ── Footer ── */
      .site-footer { background: rgba(2,6,23,0.8) !important; border-top: 1px solid rgba(255,255,255,0.06) !important; }
      .site-footer h4 { color: #cbd5e1 !important; }
      .site-footer a { color: #64748b !important; }
      .site-footer a:hover { color: var(--primary) !important; }
      .footer-brand { color: #f1f5f9 !important; }
      .footer-bottom { border-color: rgba(255,255,255,0.06) !important; color: #475569 !important; }
      .footer-social-link { color: #64748b !important; border-color: rgba(255,255,255,0.08) !important; }
      .footer-social-link:hover { color: var(--primary) !important; box-shadow: 0 0 16px color-mix(in srgb, var(--primary), transparent 70%) !important; }

      /* ── Misc ── */
      hr { border-color: rgba(255,255,255,0.06) !important; }
    `;
  } else {
    el.textContent = '';
  }
}

// Load a Google Font into an iframe document (if not already loaded)
function loadGoogleFont(doc: Document, fontName: string) {
  const id = `gfont-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (doc.getElementById(id)) return; // already loaded
  const link = doc.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@300;400;500;600;700&display=swap`;
  doc.head.appendChild(link);
}

export default function LivePreview({
  htmlContent,
  isLoading,
  onSectionClick,
  onRefresh,
  themeOverrides,
  siteName,
  faviconUrl,
  siteUrl,
}: LivePreviewProps) {
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Listen for postMessage from the iframe (section clicks)
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'section-click' && e.data.sectionId && onSectionClick) {
        onSectionClick(e.data.sectionId);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSectionClick]);

  // Inject theme overrides into iframe CSS variables (live preview)
  const themeOverridesRef = useRef(themeOverrides);
  themeOverridesRef.current = themeOverrides;

  const applyThemeToIframe = useCallback(() => {
    const overrides = themeOverridesRef.current;
    if (!overrides || !iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc?.documentElement) return;

    const root = doc.documentElement;
    if (overrides.primary_color) root.style.setProperty('--primary', overrides.primary_color);
    if (overrides.secondary_color) root.style.setProperty('--secondary', overrides.secondary_color);

    // Fonts: update CSS variable + load Google Font if needed
    if (overrides.font_heading) {
      root.style.setProperty('--font-heading', `'${overrides.font_heading}', sans-serif`);
      loadGoogleFont(doc, overrides.font_heading);
    }
    if (overrides.font_body) {
      root.style.setProperty('--font-body', `'${overrides.font_body}', sans-serif`);
      loadGoogleFont(doc, overrides.font_body);
    }

    if (overrides.style) {
      applyStyleOverrides(doc, overrides.style, overrides.primary_color || '');
    }

    // Spacing / density — inject real CSS overrides
    if (overrides.spacing) {
      applySpacingOverrides(doc, overrides.spacing);
    }

    // Button style — inject real CSS overrides
    if (overrides.button_style) {
      applyButtonOverrides(doc, overrides.button_style, overrides.primary_color || '', overrides.secondary_color || '');
    }

    // Animation level — inject real CSS overrides
    if (overrides.animation) {
      applyAnimationOverrides(doc, overrides.animation);
    }

    // Shadow level — inject real CSS overrides
    if (overrides.shadow) {
      applyShadowOverrides(doc, overrides.shadow);
    }

    // Color mode (light/dark) — inject before bg_color so custom bg wins
    if (overrides.color_mode) {
      applyColorModeOverrides(doc, overrides.color_mode);
    }

    // Background color or gradient
    if (overrides.bg_color) {
      if (overrides.bg_color.startsWith('linear-gradient')) {
        root.style.setProperty('--bg-color', '#FFFFFF');
        doc.body.style.backgroundColor = 'transparent';
        doc.body.style.background = overrides.bg_color;
        doc.body.style.backgroundAttachment = 'fixed';
      } else {
        root.style.setProperty('--bg-color', overrides.bg_color);
        doc.body.style.background = overrides.bg_color;
      }
    }
  }, []);

  // Apply when theme changes
  useEffect(() => {
    applyThemeToIframe();
  }, [themeOverrides, applyThemeToIframe]);

  // Re-apply when iframe loads (srcDoc is async)
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => applyThemeToIframe();
    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [applyThemeToIframe, htmlContent]);

  // Escape to exit fullscreen
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFullscreen]);

  const devices: { mode: DeviceMode; icon: typeof Monitor }[] = [
    { mode: 'desktop', icon: Monitor },
    { mode: 'tablet', icon: Tablet },
    { mode: 'mobile', icon: Smartphone },
  ];

  const isNarrow = device !== 'desktop';

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-[#0f1117]'
          : 'bg-[#13161b] rounded-none'
      }`}
    >
      {/* ─── Browser tab bar ──────────────────────────────── */}
      <div className="flex items-center px-4 pt-2 pb-0 bg-[#1c1f26] shrink-0 gap-2">
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5 mr-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>

        {/* Active tab */}
        <div className="flex items-center gap-2 h-8 px-3 bg-[#2a2d35] rounded-t-lg max-w-[220px]">
          {faviconUrl ? (
            <img src={faviconUrl} alt="" className="w-3.5 h-3.5 rounded-sm shrink-0 object-contain" />
          ) : (
            <svg className="w-3.5 h-3.5 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          )}
          <span className="text-[0.7rem] text-gray-300 truncate">
            {siteName || 'Mi sitio'}
          </span>
        </div>
      </div>

      {/* ─── Browser chrome toolbar ──────────────────────── */}
      <div className="flex items-center justify-between px-4 h-9 bg-[#2a2d35] shrink-0">
        {/* Left: URL bar */}
        <div className="flex items-center gap-3">
          {/* URL bar */}
          <div className="hidden sm:flex items-center gap-2 h-7 px-3 rounded-md bg-[#1c1f26] min-w-[200px] max-w-[320px]">
            <svg className="w-3 h-3 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-[0.68rem] text-gray-500 truncate">
              {siteUrl || 'tusitio.graviti.co'}
            </span>
          </div>
        </div>

        {/* Center: device toggles */}
        <div className="flex items-center gap-0.5 bg-[#2a2d35] rounded-lg p-0.5">
          {devices.map(({ mode, icon: Icon }) => (
            <button
              key={mode}
              type="button"
              onClick={() => setDevice(mode)}
              title={DEVICE_CONFIG[mode].label}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                device === mode
                  ? 'bg-[#3b3f4a] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-300 hover:bg-[#2a2d35] transition-colors cursor-pointer"
              title="Refrescar"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-300 hover:bg-[#2a2d35] transition-colors cursor-pointer"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* ─── Preview viewport ────────────────────────────── */}
      <div className="flex-1 overflow-auto flex justify-center items-start bg-[#13161b]">
        <div
          className={`bg-white overflow-hidden transition-all duration-300 ease-out relative ${
            isNarrow
              ? 'rounded-xl shadow-2xl shadow-black/40 my-6 mx-auto'
              : 'w-full h-full'
          }`}
          style={{
            width: isNarrow ? DEVICE_CONFIG[device].width : '100%',
            height: isNarrow ? 'calc(100% - 48px)' : '100%',
            maxWidth: '100%',
          }}
        >
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#13161b]/60 backdrop-blur-sm z-10">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-3">
                <Loader2 className="h-5 w-5 text-[#95D0C9] animate-spin" />
              </div>
              <p className="text-[0.72rem] text-gray-400">Actualizando preview...</p>
            </div>
          )}

          {/* Device frame bezel (only for tablet/mobile) */}
          {isNarrow && (
            <div className="h-1.5 bg-gradient-to-b from-gray-100 to-transparent" />
          )}

          {/* Iframe */}
          {htmlContent ? (
            <iframe
              ref={iframeRef}
              srcDoc={htmlContent}
              className="w-full border-0"
              style={{ height: isNarrow ? 'calc(100% - 6px)' : '100%' }}
              title="Vista previa del sitio"
              sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-[#1c1f26] flex items-center justify-center mb-4">
                <Monitor className="h-7 w-7 text-gray-600" />
              </div>
              <p className="text-[0.9rem] text-gray-500 font-medium mb-1">
                Preview no disponible
              </p>
              <p className="text-[0.75rem] text-gray-400 max-w-[240px]">
                Genera contenido con IA para ver la vista previa de tu sitio web aquí
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Device label (for tablet/mobile) ────────────── */}
      {isNarrow && (
        <div className="flex items-center justify-center h-8 shrink-0">
          <span className="text-[0.65rem] text-gray-600 font-medium tracking-wide uppercase">
            {DEVICE_CONFIG[device].label} — {DEVICE_CONFIG[device].width}
          </span>
        </div>
      )}
    </div>
  );
}
