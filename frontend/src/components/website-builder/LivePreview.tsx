'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Monitor, Tablet, Smartphone, RefreshCw, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import {
  applyStyleOverrides,
  applySpacingOverrides,
  applyButtonOverrides,
  applyAnimationOverrides,
  applyShadowOverrides,
  applyColorModeOverrides,
  loadGoogleFont,
  getFieldSelectors,
} from './styleOverrides';

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
  activeSection?: string;
  onSectionClick?: (sectionId: string) => void;
  onRefresh?: () => void;
  themeOverrides?: ThemeOverrides;
  contentOverrides?: Record<string, Record<string, unknown>>;
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

export default function LivePreview({
  htmlContent,
  isLoading,
  activeSection,
  onSectionClick,
  onRefresh,
  themeOverrides,
  contentOverrides,
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
      // Only accept messages from same origin (srcdoc iframes)
      if (e.origin !== window.location.origin && e.origin !== 'null') return;
      if (e.data?.type === 'section-click' && e.data.sectionId && onSectionClick) {
        onSectionClick(e.data.sectionId);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSectionClick]);

  // Inject theme overrides into iframe CSS variables (live preview)
  const themeOverridesRef = useRef(themeOverrides);
  useEffect(() => { themeOverridesRef.current = themeOverrides; }, [themeOverrides]);

  const applyThemeToIframe = useCallback(() => {
    const overrides = themeOverridesRef.current;
    if (!overrides || !iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc?.documentElement) return;

    const root = doc.documentElement;

    // Reset inline styles to avoid stale values from previous theme (e.g. dark→light undo)
    doc.body.style.background = '';
    doc.body.style.backgroundColor = '';
    doc.body.style.backgroundAttachment = '';

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

  // ─── Live content overrides (direct DOM manipulation) ────
  const contentOverridesRef = useRef(contentOverrides);
  useEffect(() => { contentOverridesRef.current = contentOverrides; }, [contentOverrides]);

  const applyContentToIframe = useCallback(() => {
    const overrides = contentOverridesRef.current;
    if (!overrides || !iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;

    for (const [section, fields] of Object.entries(overrides)) {
      const sectionEl = doc.querySelector(`[data-section="${section}"]`);
      if (!sectionEl) continue;

      for (const [field, value] of Object.entries(fields)) {
        const selectors = getFieldSelectors(section, field);
        for (const sel of selectors) {
          const el = sectionEl.querySelector(sel);
          if (el) {
            el.textContent = String(value ?? '');
            break;
          }
        }
      }
    }
  }, []);

  // Apply content overrides when they change
  useEffect(() => {
    applyContentToIframe();
  }, [contentOverrides, applyContentToIframe]);

  // Inject a script to intercept all link clicks inside the iframe (prevent navigation)
  const injectLinkInterceptor = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;

    const scriptId = 'gv-link-interceptor';
    if (doc.getElementById(scriptId)) return;

    const script = doc.createElement('script');
    script.id = scriptId;
    script.textContent = `
      document.addEventListener('click', function(e) {
        var link = e.target.closest('a');
        if (link) {
          e.preventDefault();
          e.stopPropagation();
          // If clicked inside a section, notify parent for section selection
          var section = e.target.closest('[data-section]');
          if (section) {
            window.parent.postMessage({ type: 'section-click', sectionId: section.dataset.section }, '*');
          }
        }
      }, true);
      // Also block form submissions
      document.addEventListener('submit', function(e) {
        e.preventDefault();
        e.stopPropagation();
      }, true);
    `;
    doc.body.appendChild(script);
  }, []);

  // Re-apply when iframe loads (srcDoc is async)
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => {
      applyThemeToIframe();
      applyContentToIframe();
      injectLinkInterceptor();
    };
    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [applyThemeToIframe, applyContentToIframe, injectLinkInterceptor, htmlContent]);

  // ─── Scroll to & highlight active section in iframe ────
  const activeSectionRef = useRef(activeSection);
  useEffect(() => { activeSectionRef.current = activeSection; }, [activeSection]);

  const applyActiveSectionHighlight = useCallback(() => {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;

    // Inject highlight styles once
    const styleId = 'active-section-highlight';
    let styleEl = doc.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = doc.createElement('style');
      styleEl.id = styleId;
      doc.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      [data-section].gv-section-active {
        outline: 2px solid #0D9488 !important;
        outline-offset: -2px;
        transition: outline-color 0.3s ease;
      }
      [data-section].gv-section-active::after {
        content: '';
        position: absolute;
        inset: 0;
        background: rgba(13, 148, 136, 0.06);
        pointer-events: none;
        border-radius: inherit;
        animation: gvHighlightFade 1.5s ease-out forwards;
      }
      @keyframes gvHighlightFade {
        0% { background: rgba(13, 148, 136, 0.12); }
        100% { background: rgba(13, 148, 136, 0.03); }
      }
    `;

    // Remove previous highlight
    doc.querySelectorAll('[data-section].gv-section-active').forEach(el => {
      el.classList.remove('gv-section-active');
    });

    const sectionId = activeSectionRef.current;
    if (!sectionId) return;

    const target = doc.querySelector(`[data-section="${sectionId}"]`) as HTMLElement | null;
    if (!target) return;

    // Ensure section is position:relative for the ::after pseudo-element
    if (getComputedStyle(target).position === 'static') {
      target.style.position = 'relative';
    }

    target.classList.add('gv-section-active');
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  useEffect(() => {
    applyActiveSectionHighlight();
  }, [activeSection, applyActiveSectionHighlight]);

  // Also apply on iframe load
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => {
      applyActiveSectionHighlight();
    };
    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [applyActiveSectionHighlight, htmlContent]);

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
              {siteUrl || 'tusitio.nerbis.com'}
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
                <Loader2 className="h-5 w-5 text-[#0D9488] animate-spin" />
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
              sandbox="allow-scripts allow-same-origin"
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
