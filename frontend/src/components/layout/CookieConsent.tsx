// src/components/layout/CookieConsent.tsx
// Cookie consent banner para cada TENANT (tienda/negocio)
// Cada tenant puede personalizar la identidad visual
// Se usa en las páginas del negocio (shop), NO en las de auth (plataforma)

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Cookie, Settings } from 'lucide-react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface CookiePreferences {
  essential: boolean; // Siempre true, no se puede cambiar
  performance: boolean;
  functionality: boolean;
  marketing: boolean;
}

// Keys con prefijo "tenant-" para no colisionar con las de la plataforma NERBIS
const TENANT_CONSENT_KEY = 'tenant-cookie-consent';
const TENANT_PREFERENCES_KEY = 'tenant-cookie-preferences';

export function TenantCookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    performance: false,
    functionality: false,
    marketing: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem(TENANT_CONSENT_KEY);
    if (!consent) {
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    } else {
      const savedPreferences = localStorage.getItem(TENANT_PREFERENCES_KEY);
      if (savedPreferences) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPreferences(JSON.parse(savedPreferences));
      }
    }
  }, []);

  const saveConsent = (prefs: CookiePreferences) => {
    localStorage.setItem(TENANT_CONSENT_KEY, 'true');
    localStorage.setItem(TENANT_PREFERENCES_KEY, JSON.stringify(prefs));
    setPreferences(prefs);
    setShowBanner(false);
    setShowSettings(false);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tenantCookieConsentUpdated', { detail: prefs }));
    }
  };

  const acceptAll = () => {
    saveConsent({
      essential: true,
      performance: true,
      functionality: true,
      marketing: true,
    });
  };

  const rejectAll = () => {
    saveConsent({
      essential: true,
      performance: false,
      functionality: false,
      marketing: false,
    });
  };

  const savePreferences = () => {
    saveConsent(preferences);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Banner principal */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t shadow-lg animate-in slide-in-from-bottom duration-300">
        <div className="container max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Cookie className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">Utilizamos cookies</p>
                <p className="text-sm text-muted-foreground">
                  Usamos cookies para mejorar tu experiencia, analizar el tráfico y personalizar el contenido.
                  Puedes aceptar todas, rechazarlas o{' '}
                  <button
                    onClick={() => setShowSettings(true)}
                    className="text-primary hover:underline font-medium"
                  >
                    configurar tus preferencias
                  </button>.
                  Lee nuestra{' '}
                  <Link href="/cookies" className="text-primary hover:underline font-medium">
                    política de cookies
                  </Link>.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={rejectAll}
                className="flex-1 sm:flex-none"
              >
                Rechazar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="flex-1 sm:flex-none"
              >
                <Settings className="h-4 w-4 mr-1" />
                Configurar
              </Button>
              <Button
                size="sm"
                onClick={acceptAll}
                className="flex-1 sm:flex-none"
              >
                Aceptar todas
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de configuración */}
      <ResponsiveDialog open={showSettings} onOpenChange={setShowSettings}>
        <ResponsiveDialogContent className="sm:max-w-lg">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración de cookies
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Personaliza qué tipos de cookies deseas permitir. Las cookies esenciales
              no se pueden desactivar ya que son necesarias para el funcionamiento del sitio.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-4 py-4">
            {/* Esenciales */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div className="space-y-1">
                <Label className="font-medium">Cookies Esenciales</Label>
                <p className="text-sm text-muted-foreground">
                  Necesarias para el funcionamiento básico del sitio.
                </p>
              </div>
              <Switch checked={true} disabled />
            </div>

            {/* Rendimiento */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="performance" className="font-medium">Cookies de Rendimiento</Label>
                <p className="text-sm text-muted-foreground">
                  Nos ayudan a entender cómo usas el sitio.
                </p>
              </div>
              <Switch
                id="performance"
                checked={preferences.performance}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, performance: checked }))
                }
              />
            </div>

            {/* Funcionalidad */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="functionality" className="font-medium">Cookies de Funcionalidad</Label>
                <p className="text-sm text-muted-foreground">
                  Permiten recordar tus preferencias.
                </p>
              </div>
              <Switch
                id="functionality"
                checked={preferences.functionality}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, functionality: checked }))
                }
              />
            </div>

            {/* Marketing */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="marketing" className="font-medium">Cookies de Marketing</Label>
                <p className="text-sm text-muted-foreground">
                  Usadas para mostrarte anuncios relevantes.
                </p>
              </div>
              <Switch
                id="marketing"
                checked={preferences.marketing}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, marketing: checked }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={rejectAll}>
              Rechazar todas
            </Button>
            <Button onClick={savePreferences}>
              Guardar preferencias
            </Button>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}

// Backward compatibility — el export anterior se mantiene
// pero redirige al nuevo nombre
export { TenantCookieConsent as CookieConsent };
