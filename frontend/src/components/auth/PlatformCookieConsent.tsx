// src/components/auth/PlatformCookieConsent.tsx
// Cookie consent banner para la plataforma NERBIS (páginas de auth)
// Independiente del cookie consent de cada tenant

'use client';

import { useState, useEffect } from 'react';
import { Settings, Shield } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface CookiePreferences {
  essential: boolean;
  performance: boolean;
  functionality: boolean;
}

// Keys independientes de las del tenant
const PLATFORM_CONSENT_KEY = 'nerbis-cookie-consent';
const PLATFORM_PREFERENCES_KEY = 'nerbis-cookie-preferences';

export function PlatformCookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    performance: false,
    functionality: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem(PLATFORM_CONSENT_KEY);
    if (!consent) {
      const timer = setTimeout(() => setShowBanner(true), 1200);
      return () => clearTimeout(timer);
    } else {
      const saved = localStorage.getItem(PLATFORM_PREFERENCES_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setPreferences(JSON.parse(saved));
    }
  }, []);

  const saveConsent = (prefs: CookiePreferences) => {
    localStorage.setItem(PLATFORM_CONSENT_KEY, 'true');
    localStorage.setItem(PLATFORM_PREFERENCES_KEY, JSON.stringify(prefs));
    setPreferences(prefs);
    setShowBanner(false);
    setShowSettings(false);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('platformCookieConsentUpdated', { detail: prefs }));
    }
  };

  const acceptAll = () => {
    saveConsent({ essential: true, performance: true, functionality: true });
  };

  const rejectAll = () => {
    saveConsent({ essential: true, performance: false, functionality: false });
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Banner — estilo NERBIS */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-500"
        style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
      >
        <div className="mx-4 mb-4 max-w-lg rounded-2xl border border-white/10 bg-auth-primary p-5 shadow-2xl sm:mx-auto">
          <div className="flex items-start gap-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-auth-accent/15">
              <Shield className="h-4.5 w-4.5 text-auth-accent" />
            </div>
            <div className="flex-1">
              <p className="text-[0.82rem] font-semibold text-white mb-1">
                Tu privacidad en NERBIS
              </p>
              <p className="text-[0.75rem] leading-relaxed text-white/60">
                Usamos cookies esenciales para que la plataforma funcione correctamente.
                Puedes aceptar cookies opcionales para mejorar tu experiencia.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={rejectAll}
              className="flex-1 h-9 rounded-lg text-[0.78rem] font-medium text-white/70 border border-white/15 hover:bg-white/5 transition-colors cursor-pointer"
            >
              Solo esenciales
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="h-9 w-9 shrink-0 rounded-lg border border-white/15 flex items-center justify-center text-white/50 hover:bg-white/5 transition-colors cursor-pointer"
              title="Configurar"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={acceptAll}
              className="flex-1 h-9 rounded-lg text-[0.78rem] font-medium text-auth-primary bg-auth-accent hover:bg-auth-accent/80 transition-colors cursor-pointer"
            >
              Aceptar todas
            </button>
          </div>
        </div>
      </div>

      {/* Modal de configuración */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md border-0 bg-auth-primary text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Settings className="h-5 w-5 text-auth-accent" />
              Configuración de cookies
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Personaliza qué cookies deseas permitir en la plataforma NERBIS.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {/* Esenciales */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="space-y-0.5">
                <Label className="text-[0.82rem] font-medium text-white">Esenciales</Label>
                <p className="text-[0.72rem] text-white/40">
                  Autenticación, sesión y seguridad. Siempre activas.
                </p>
              </div>
              <Switch checked={true} disabled className="data-[state=checked]:bg-auth-accent" />
            </div>

            {/* Rendimiento */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-white/10">
              <div className="space-y-0.5">
                <Label htmlFor="plat-performance" className="text-[0.82rem] font-medium text-white">Rendimiento</Label>
                <p className="text-[0.72rem] text-white/40">
                  Nos ayudan a mejorar la plataforma.
                </p>
              </div>
              <Switch
                id="plat-performance"
                checked={preferences.performance}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, performance: checked }))
                }
                className="data-[state=checked]:bg-auth-accent"
              />
            </div>

            {/* Funcionalidad */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-white/10">
              <div className="space-y-0.5">
                <Label htmlFor="plat-functionality" className="text-[0.82rem] font-medium text-white">Funcionalidad</Label>
                <p className="text-[0.72rem] text-white/40">
                  Recordar tus preferencias de interfaz.
                </p>
              </div>
              <Switch
                id="plat-functionality"
                checked={preferences.functionality}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, functionality: checked }))
                }
                className="data-[state=checked]:bg-auth-accent"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={rejectAll}
              className="flex-1 h-10 rounded-lg text-[0.82rem] font-medium text-white/70 border border-white/15 hover:bg-white/5 transition-colors cursor-pointer"
            >
              Solo esenciales
            </button>
            <button
              onClick={() => saveConsent(preferences)}
              className="flex-1 h-10 rounded-lg text-[0.82rem] font-medium text-auth-primary bg-auth-accent hover:bg-auth-accent/80 transition-colors cursor-pointer"
            >
              Guardar preferencias
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
