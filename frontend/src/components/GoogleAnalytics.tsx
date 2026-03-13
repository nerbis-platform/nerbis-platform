// src/components/GoogleAnalytics.tsx
// Google Analytics integrado con el consentimiento de cookies.
// Solo se carga si el usuario aceptó cookies de "rendimiento".

'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

// Keys del cookie consent (deben coincidir con PlatformCookieConsent.tsx)
const PLATFORM_CONSENT_KEY = 'nerbis-cookie-consent';
const PLATFORM_PREFERENCES_KEY = 'nerbis-cookie-preferences';

function hasPerformanceConsent(): boolean {
  if (typeof window === 'undefined') return false;

  const consent = localStorage.getItem(PLATFORM_CONSENT_KEY);
  if (!consent) return false;

  const prefs = localStorage.getItem(PLATFORM_PREFERENCES_KEY);
  if (!prefs) return false;

  try {
    const parsed = JSON.parse(prefs);
    return parsed.performance === true;
  } catch {
    return false;
  }
}

export function GoogleAnalytics() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // Check initial consent
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAllowed(hasPerformanceConsent());

    // Listen for consent changes
    const handleConsent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setAllowed(detail?.performance === true);
    };

    window.addEventListener('platformCookieConsentUpdated', handleConsent);
    return () => window.removeEventListener('platformCookieConsentUpdated', handleConsent);
  }, []);

  if (!GA_ID || !allowed) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            page_path: window.location.pathname,
            anonymize_ip: true
          });
        `}
      </Script>
    </>
  );
}
