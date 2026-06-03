// Style override utilities for the LivePreview iframe.
// Each function injects/updates a <style> tag in the iframe document.

export function applyStyleOverrides(doc: Document, style: string, primary: string) {
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

export function applySpacingOverrides(doc: Document, spacing: string) {
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

export function applyButtonOverrides(doc: Document, buttonStyle: string, primary: string, secondary: string) {
  const id = 'theme-button-overrides';
  let el = doc.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = doc.createElement('style');
    el.id = id;
    doc.head.appendChild(el);
  }

  const s = secondary || 'var(--secondary)';
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

export function applyAnimationOverrides(doc: Document, animation: string) {
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

export function applyShadowOverrides(doc: Document, shadow: string) {
  const id = 'theme-shadow-overrides';
  let el = doc.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = doc.createElement('style');
    el.id = id;
    doc.head.appendChild(el);
  }

  const styles: Record<string, string> = {
    none: `
      .card, .faq-item, .testimonial-card, .stat-card { box-shadow: none !important; }
      .card:hover, .faq-item:hover, .testimonial-card:hover, .stat-card:hover { box-shadow: none !important; }
      .site-header, .site-header.scrolled { box-shadow: none !important; }
      .btn { box-shadow: none !important; }
      .btn:hover { box-shadow: none !important; }
    `,
    subtle: `
      .card, .faq-item, .testimonial-card, .stat-card { box-shadow: 0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04) !important; }
      .card:hover, .faq-item:hover, .testimonial-card:hover, .stat-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.08) !important; }
      .site-header, .site-header.scrolled { box-shadow: 0 1px 4px rgba(0,0,0,.05) !important; }
      .btn { box-shadow: 0 1px 2px rgba(0,0,0,.06) !important; }
      .btn:hover { box-shadow: 0 3px 8px rgba(0,0,0,.1) !important; }
    `,
    medium: `
      .card, .faq-item, .testimonial-card, .stat-card { box-shadow: 0 4px 16px rgba(0,0,0,.08), 0 2px 6px rgba(0,0,0,.04) !important; }
      .card:hover, .faq-item:hover, .testimonial-card:hover, .stat-card:hover { box-shadow: 0 12px 32px rgba(0,0,0,.12) !important; }
      .site-header, .site-header.scrolled { box-shadow: 0 2px 12px rgba(0,0,0,.07) !important; }
      .btn { box-shadow: 0 2px 6px rgba(0,0,0,.08) !important; }
      .btn:hover { box-shadow: 0 6px 16px rgba(0,0,0,.14) !important; }
    `,
    dramatic: `
      .card, .faq-item, .testimonial-card, .stat-card { box-shadow: 0 10px 40px rgba(0,0,0,.12), 0 4px 12px rgba(0,0,0,.06) !important; }
      .card:hover, .faq-item:hover, .testimonial-card:hover, .stat-card:hover { box-shadow: 0 20px 60px rgba(0,0,0,.18), 0 8px 20px rgba(0,0,0,.08) !important; }
      .site-header, .site-header.scrolled { box-shadow: 0 4px 20px rgba(0,0,0,.1) !important; }
      .btn { box-shadow: 0 4px 14px rgba(0,0,0,.12) !important; }
      .btn:hover { box-shadow: 0 8px 28px rgba(0,0,0,.2) !important; transform: translateY(-2px); }
    `,
  };

  el.textContent = styles[shadow] || '';
}

export function applyColorModeOverrides(doc: Document, colorMode: string) {
  const id = 'theme-color-mode-overrides';
  let el = doc.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = doc.createElement('style');
    el.id = id;
    doc.head.appendChild(el);
  }

  if (colorMode === 'dark') {
    el.textContent = `
      body { background: #0f172a !important; color: #e2e8f0 !important; -webkit-font-smoothing: antialiased !important; -moz-osx-font-smoothing: grayscale !important; }
      .section { background-color: transparent !important; }
      .section:nth-child(even) { background: rgba(30,41,59,0.3) !important; }
      .section-subtitle { color: #94a3b8 !important; }
      .section + .section { border-top: 1px solid transparent !important; background-clip: padding-box !important; }
      .card, .bento-item, .faq-item, .testimonial-card, .pricing-card, .contact-card { background: rgba(30,41,59,0.6) !important; backdrop-filter: blur(12px) !important; -webkit-backdrop-filter: blur(12px) !important; border-color: rgba(255,255,255,0.08) !important; }
      .card:hover, .bento-item:hover, .testimonial-card:hover, .pricing-card:hover { border-color: rgba(255,255,255,0.12) !important; box-shadow: 0 12px 40px rgba(0,0,0,0.35), 0 0 16px color-mix(in srgb, var(--primary), transparent 70%) !important; }
      .card h3, .faq-item h3, .testimonial-card h3, .bento-item h3, .pricing-card h3 { color: #f1f5f9 !important; }
      .card p, .card span, .faq-item p, .testimonial-card p, .bento-item p, .pricing-card p { color: #94a3b8 !important; }
      .card .card-icon { background: rgba(255,255,255,.06) !important; border: 1px solid rgba(255,255,255,.08) !important; }
      .card .card-price { background: rgba(255,255,255,.08) !important; }
      .card::before { opacity: 0.7; } .card:hover::before { opacity: 1; }
      .pricing-card--recommended { border-color: var(--primary) !important; box-shadow: 0 0 30px color-mix(in srgb, var(--primary), transparent 60%) !important; }
      .stat-number { color: #f1f5f9 !important; } .stat-label { color: #64748b !important; }
      .site-header { background: rgba(15,23,42,0.85) !important; border-color: rgba(255,255,255,.06) !important; backdrop-filter: blur(20px) saturate(1.4) !important; -webkit-backdrop-filter: blur(20px) saturate(1.4) !important; }
      .site-header.scrolled { background: rgba(15,23,42,0.96) !important; box-shadow: 0 4px 30px rgba(0,0,0,0.3) !important; }
      .site-header nav a { color: #cbd5e1 !important; } .site-header nav a:hover { color: #fff !important; }
      .logo { color: #f1f5f9 !important; }
      .faq-trigger { color: #f1f5f9 !important; } .faq-answer { color: #94a3b8 !important; }
      .author-name { color: #f1f5f9 !important; } .author-role { color: #64748b !important; }
      h1, h2, h3, h4, h5, h6 { color: #f1f5f9 !important; }
      .hero h1, .hero p { color: #fff !important; }
      .section-title { color: #f1f5f9 !important; } .section-label { color: var(--secondary) !important; }
      .hero--centered { background: linear-gradient(135deg, #0f172a, #1e293b) !important; }
      .hero--split { background: #0f172a !important; } .hero--split h1 { color: #f1f5f9 !important; } .hero--split p { color: #94a3b8 !important; }
      .hero--bold { background: #0f172a !important; color: #f1f5f9 !important; }
      .highlight { background: rgba(255,255,255,0.05) !important; border-color: rgba(255,255,255,0.08) !important; }
      .highlight span { color: #cbd5e1 !important; }
      .overlap-card { background: rgba(30,41,59,0.7) !important; border-color: rgba(255,255,255,0.08) !important; }
      .svc-list-item { border-color: rgba(255,255,255,0.06) !important; }
      .svc-featured-main { background: rgba(30,41,59,0.6) !important; border-color: rgba(255,255,255,0.08) !important; }
      .svc-featured-small { background: rgba(30,41,59,0.5) !important; border-color: rgba(255,255,255,0.06) !important; }
      .svc-icon-box { background: rgba(255,255,255,0.06) !important; }
      .catalog-item { background: rgba(30,41,59,0.5) !important; border-color: rgba(255,255,255,0.08) !important; }
      .masonry-item { background: rgba(30,41,59,0.6) !important; border-color: rgba(255,255,255,0.08) !important; }
      .price-table-row { border-color: rgba(255,255,255,0.06) !important; }
      .pricing-table { border-color: rgba(255,255,255,0.08) !important; }
      .pricing-table th { background: rgba(30,41,59,0.8) !important; color: #f1f5f9 !important; border-color: rgba(255,255,255,0.08) !important; }
      .pricing-table td { border-color: rgba(255,255,255,0.06) !important; color: #94a3b8 !important; }
      input, textarea, select { background-color: rgba(15,23,42,0.6) !important; border-color: rgba(255,255,255,0.1) !important; color: #e2e8f0 !important; }
      .btn-primary:hover { box-shadow: 0 0 30px color-mix(in srgb, var(--primary), transparent 60%) !important; }
      .btn-outline { border-color: rgba(255,255,255,0.2) !important; color: #e2e8f0 !important; }
      .btn-outline:hover { background: rgba(255,255,255,0.08) !important; border-color: rgba(255,255,255,0.3) !important; }
      .site-footer { background: rgba(2,6,23,0.8) !important; border-top: 1px solid rgba(255,255,255,0.06) !important; }
      .site-footer h4 { color: #cbd5e1 !important; } .site-footer a { color: #64748b !important; } .site-footer a:hover { color: var(--primary) !important; }
      .footer-brand { color: #f1f5f9 !important; }
      .footer-bottom { border-color: rgba(255,255,255,0.06) !important; color: #475569 !important; }
      .footer-social-link { color: #64748b !important; border-color: rgba(255,255,255,0.08) !important; }
      .footer-social-link:hover { color: var(--primary) !important; box-shadow: 0 0 16px color-mix(in srgb, var(--primary), transparent 70%) !important; }
      hr { border-color: rgba(255,255,255,0.06) !important; }
    `;
  } else {
    el.textContent = `
      body { background: #ffffff !important; color: #1f2937 !important; }
      .section { background-color: transparent !important; }
      .section:nth-child(even) { background: rgba(0,0,0,0.01) !important; }
      .section-subtitle { color: #6b7280 !important; }
      .card, .bento-item, .faq-item, .testimonial-card, .pricing-card, .contact-card { background: #ffffff !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; border-color: #e5e7eb !important; }
      .card:hover, .bento-item:hover, .testimonial-card:hover, .pricing-card:hover { border-color: #d1d5db !important; box-shadow: var(--shadow-md) !important; }
      .card h3, .faq-item h3, .testimonial-card h3, .bento-item h3, .pricing-card h3 { color: #111827 !important; }
      .card p, .card span, .faq-item p, .testimonial-card p, .bento-item p, .pricing-card p { color: #6b7280 !important; }
      .card .card-icon { background: #f3f4f6 !important; border: 1px solid #e5e7eb !important; }
      .card .card-price { background: #f9fafb !important; }
      .pricing-card--recommended { border-color: var(--primary) !important; box-shadow: 0 4px 20px rgba(0,0,0,0.08) !important; }
      .stat-number { color: #111827 !important; } .stat-label { color: #9ca3af !important; }
      .site-header { background: rgba(255,255,255,0.85) !important; border-color: #e5e7eb !important; backdrop-filter: blur(20px) saturate(1.4) !important; -webkit-backdrop-filter: blur(20px) saturate(1.4) !important; }
      .site-header.scrolled { background: rgba(255,255,255,0.96) !important; box-shadow: 0 1px 3px rgba(0,0,0,0.06) !important; }
      .site-header nav a { color: #4b5563 !important; } .site-header nav a:hover { color: #111827 !important; }
      .logo { color: #111827 !important; }
      .faq-trigger { color: #111827 !important; } .faq-answer { color: #6b7280 !important; }
      .author-name { color: #111827 !important; } .author-role { color: #9ca3af !important; }
      h1, h2, h3, h4, h5, h6 { color: #111827 !important; }
      .section-title { color: #111827 !important; } .section-label { color: var(--secondary) !important; }
      .hero--centered { background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary), #000 30%)) !important; }
      .hero--centered h1, .hero--centered p { color: #fff !important; }
      .hero--split { background: #ffffff !important; } .hero--split h1 { color: #111827 !important; } .hero--split p { color: #6b7280 !important; }
      .hero--bold { color: #111827 !important; }
      .highlight { background: #f9fafb !important; border-color: #e5e7eb !important; }
      .highlight span { color: #374151 !important; }
      .overlap-card { background: #ffffff !important; border-color: #e5e7eb !important; }
      .svc-list-item { border-color: #e5e7eb !important; }
      .svc-featured-main { background: #ffffff !important; border-color: #e5e7eb !important; }
      .svc-featured-small { background: #f9fafb !important; border-color: #e5e7eb !important; }
      .svc-icon-box { background: #f3f4f6 !important; }
      .catalog-item { background: #ffffff !important; border-color: #e5e7eb !important; }
      .masonry-item { background: #ffffff !important; border-color: #e5e7eb !important; }
      .price-table-row { border-color: #e5e7eb !important; }
      .pricing-table { border-color: #e5e7eb !important; }
      .pricing-table th { background: #f9fafb !important; color: #111827 !important; border-color: #e5e7eb !important; }
      .pricing-table td { border-color: #e5e7eb !important; color: #6b7280 !important; }
      input, textarea, select { background-color: #ffffff !important; border-color: #d1d5db !important; color: #1f2937 !important; }
      .btn-outline { border-color: #d1d5db !important; color: #374151 !important; }
      .btn-outline:hover { background: #f3f4f6 !important; border-color: #9ca3af !important; }
      .site-footer { background: #f9fafb !important; border-top: 1px solid #e5e7eb !important; }
      .site-footer h4 { color: #374151 !important; } .site-footer a { color: #6b7280 !important; } .site-footer a:hover { color: var(--primary) !important; }
      .footer-brand { color: #111827 !important; }
      .footer-bottom { border-color: #e5e7eb !important; color: #9ca3af !important; }
      .footer-social-link { color: #6b7280 !important; border-color: #e5e7eb !important; }
      .footer-social-link:hover { color: var(--primary) !important; }
      hr { border-color: #e5e7eb !important; }
    `;
  }
}

export function loadGoogleFont(doc: Document, fontName: string) {
  const id = `gfont-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (doc.getElementById(id)) return;
  const link = doc.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@300;400;500;600;700&display=swap`;
  doc.head.appendChild(link);
}

export function getFieldSelectors(section: string, field: string): string[] {
  if (section === 'hero') {
    switch (field) {
      case 'title': return ['h1'];
      case 'subtitle': return ['.hero-subtitle', 'p:first-of-type'];
      case 'cta_text': return ['.btn-primary', '.btn:first-of-type'];
      default: return [];
    }
  }

  if (section === 'header') {
    switch (field) {
      case 'logo_text': return ['.logo', '.logo-text'];
      case 'cta_text': return ['.header-cta'];
      default: return [];
    }
  }

  if (section === 'footer') {
    switch (field) {
      case 'brand_name': return ['.footer-brand'];
      default: return [];
    }
  }

  switch (field) {
    case 'title': return ['.section-title', 'h2:first-of-type'];
    case 'subtitle': return ['.section-subtitle'];
    case 'content': return ['.about-text', '.section-content'];
    case 'cta_text': return ['.btn-primary', '.btn:first-of-type'];
    case 'phone': return ['.contact-phone a', 'a[href^="tel:"]'];
    case 'email': return ['.contact-email a', 'a[href^="mailto:"]'];
    case 'address': return ['.contact-address'];
    default: return [];
  }
}
