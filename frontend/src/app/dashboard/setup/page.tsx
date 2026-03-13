'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { configureModules, ModuleSelection } from '@/lib/api/auth';
import {
  Globe,
  ShoppingCart,
  CalendarCheck,
  Briefcase,
  GraduationCap,
  FileSignature,
  Headset,
  Store,
  UtensilsCrossed,
  BarChart3,
  Bot,
  Workflow,
  ArrowRight,
  LogOut,
  Loader2,
  Check,
  Lock,
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

// ─── Module definitions ──────────────────────────────────────

interface ModuleOption {
  key: keyof ModuleSelection;
  label: string;
  subtitle: string;
  features: string[];
  icon: React.ElementType;
  accentColor: string;
  accentBg: string;
  requiresWebsite?: boolean;
}

interface ComingSoonModule {
  label: string;
  subtitle: string;
  features: string[];
  icon: React.ElementType;
  accentColor: string;
  accentBg: string;
}

const AVAILABLE_MODULES: ModuleOption[] = [
  {
    key: 'has_website',
    label: 'Sitio Web',
    subtitle: 'Presencia online con IA',
    features: ['Generado con inteligencia artificial', 'Diseño personalizado', 'Optimizado para móviles'],
    icon: Globe,
    accentColor: '#1C3B57',
    accentBg: 'rgba(28, 59, 87, 0.06)',
  },
  {
    key: 'has_shop',
    label: 'Tienda Online',
    subtitle: 'Vende productos 24/7',
    features: ['Catálogo de productos', 'Carrito y checkout', 'Gestión de inventario'],
    icon: ShoppingCart,
    accentColor: '#10b981',
    accentBg: 'rgba(16, 185, 129, 0.08)',
    requiresWebsite: true,
  },
  {
    key: 'has_bookings',
    label: 'Reservas',
    subtitle: 'Agenda inteligente',
    features: ['Calendario de citas', 'Gestión de staff', 'Recordatorios automáticos'],
    icon: CalendarCheck,
    accentColor: '#6366f1',
    accentBg: 'rgba(99, 102, 241, 0.08)',
    requiresWebsite: true,
  },
  {
    key: 'has_services',
    label: 'Servicios',
    subtitle: 'Planes y membresías',
    features: ['Servicios vendibles', 'Planes recurrentes', 'Membresías'],
    icon: Briefcase,
    accentColor: '#8b5cf6',
    accentBg: 'rgba(139, 92, 246, 0.08)',
    requiresWebsite: true,
  },
];

const SOFTWARE_MODULES: ComingSoonModule[] = [
  {
    label: 'Academy',
    subtitle: 'LMS y cursos online',
    features: ['Creación de cursos', 'Certificados automáticos', 'Progreso de estudiantes'],
    icon: GraduationCap,
    accentColor: '#f59e0b',
    accentBg: 'rgba(245, 158, 11, 0.08)',
  },
  {
    label: 'Firmas',
    subtitle: 'Firma digital de documentos',
    features: ['Firma electrónica legal', 'Plantillas de contratos', 'Seguimiento de firmas'],
    icon: FileSignature,
    accentColor: '#ec4899',
    accentBg: 'rgba(236, 72, 153, 0.08)',
  },
  {
    label: 'Tickets',
    subtitle: 'CRM y gestión de casos',
    features: ['Mesa de ayuda', 'Asignación de agentes', 'Historial de clientes'],
    icon: Headset,
    accentColor: '#14b8a6',
    accentBg: 'rgba(20, 184, 166, 0.08)',
  },
  {
    label: 'Punto de Venta',
    subtitle: 'POS para tu negocio físico',
    features: ['Cobro en mostrador', 'Control de caja', 'Impresión de recibos'],
    icon: Store,
    accentColor: '#f97316',
    accentBg: 'rgba(249, 115, 22, 0.08)',
  },
  {
    label: 'Restaurante',
    subtitle: 'Menús, pedidos y mesas',
    features: ['Menú digital QR', 'Pedidos online', 'Gestión de mesas'],
    icon: UtensilsCrossed,
    accentColor: '#ef4444',
    accentBg: 'rgba(239, 68, 68, 0.08)',
  },
  {
    label: 'Financiera',
    subtitle: 'Ventas, costos y gastos',
    features: ['Control de ingresos', 'Gestión de gastos', 'Reportes financieros'],
    icon: BarChart3,
    accentColor: '#0ea5e9',
    accentBg: 'rgba(14, 165, 233, 0.08)',
  },
];

const FUTURE_MODULES: ComingSoonModule[] = [
  {
    label: 'Agentes IA',
    subtitle: 'Atención al cliente y recepción de pedidos',
    features: ['Agentes personalizables', 'Recepción de pedidos', 'Servicio al cliente 24/7'],
    icon: Bot,
    accentColor: '#a855f7',
    accentBg: 'rgba(168, 85, 247, 0.08)',
  },
  {
    label: 'Flows',
    subtitle: 'Automatización de procesos',
    features: ['Editor visual de flujos', 'Triggers automáticos', 'Integraciones externas'],
    icon: Workflow,
    accentColor: '#06b6d4',
    accentBg: 'rgba(6, 182, 212, 0.08)',
  },
];

// Modules that require a website
const WEBSITE_DEPENDENT_KEYS: (keyof ModuleSelection)[] = ['has_shop', 'has_bookings', 'has_services'];

// ─── Page component ──────────────────────────────────────────

export default function SetupPage() {
  const { tenant, user, logout, setTenant } = useAuth();
  const router = useRouter();

  const [selected, setSelected] = useState<Record<keyof ModuleSelection, boolean>>(() => ({
    has_website: tenant?.has_website ?? false,
    has_shop: tenant?.has_shop ?? false,
    has_bookings: tenant?.has_bookings ?? false,
    has_services: tenant?.has_services ?? false,
    has_marketing: tenant?.has_marketing ?? false,
  }));

  const hasAnyModule = Object.values(selected).some(Boolean);

  const mutation = useMutation({
    mutationFn: (payload: ModuleSelection) => configureModules(payload),
    onSuccess: (updatedTenant) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('tenant', JSON.stringify(updatedTenant));
      }
      setTenant(updatedTenant);
      toast.success('Configuración guardada');
      if (updatedTenant.has_website) {
        router.push('/dashboard/website-builder');
      } else {
        router.push('/dashboard');
      }
    },
    onError: () => {
      toast.error('Error al guardar. Intenta de nuevo.');
    },
  });

  const handleContinue = () => {
    mutation.mutate(selected);
  };

  const toggleModule = useCallback((key: keyof ModuleSelection) => {
    setSelected((prev) => {
      const next = { ...prev, [key]: !prev[key] };

      // If enabling a module that requires website, auto-enable website
      if (next[key] && WEBSITE_DEPENDENT_KEYS.includes(key) && !next.has_website) {
        next.has_website = true;
      }

      // If disabling website, disable all dependent modules
      if (key === 'has_website' && !next.has_website) {
        for (const depKey of WEBSITE_DEPENDENT_KEYS) {
          next[depKey] = false;
        }
      }

      return next;
    });
  }, []);

  const firstName = user?.first_name || '';

  // Check if website was auto-selected by a dependent module
  const websiteAutoSelected =
    selected.has_website &&
    WEBSITE_DEPENDENT_KEYS.some((k) => selected[k]);

  return (
    <>
      <style jsx global>{`
        @keyframes setup-fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .setup-fade-up { animation: setup-fade-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .setup-delay-1 { animation-delay: 0.08s; opacity: 0; }
        .setup-delay-2 { animation-delay: 0.16s; opacity: 0; }
        .setup-delay-3 { animation-delay: 0.24s; opacity: 0; }
        .setup-delay-4 { animation-delay: 0.32s; opacity: 0; }
        .setup-delay-5 { animation-delay: 0.40s; opacity: 0; }
        @keyframes g-pendulum {
          0%   { transform: rotate(0deg); }
          6%   { transform: rotate(-18deg); }
          15%  { transform: rotate(-18deg); }
          35%  { transform: rotate(0deg); }
          42%  { transform: rotate(0deg); }
          48%  { transform: rotate(18deg); }
          57%  { transform: rotate(18deg); }
          77%  { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }
        .g-pendulum {
          animation: g-pendulum 4.3s cubic-bezier(0.22, 1, 0.36, 1) infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .g-pendulum { animation: none; }
        }
      `}</style>

      <div
        className="min-h-screen"
        style={{ background: '#fafbfc' }}
      >
        {/* Header — misma identidad que Website Builder */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image
                src="/Isotipo_color_NERBIS.png"
                alt="Nerbis"
                width={36}
                height={36}
                className="g-pendulum"
              />
              <span
                className="text-[0.85rem] font-semibold tracking-wide"
                style={{ color: '#1C3B57' }}
              >
                NERBIS
              </span>
            </div>
            <span className="text-[0.72rem] text-gray-400 font-medium tracking-wide">
              PASO 1 DE 2
            </span>
            <button
              type="button"
              onClick={() => logout('/register-business')}
              className="flex items-center gap-1.5 text-[0.72rem] text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Salir
            </button>
          </div>
        </div>

        <div className="w-full max-w-3xl mx-auto px-4 py-12">

          {/* Header */}
          <div className="mb-10 setup-fade-up setup-delay-1 text-center">
            <h1
              className="text-[1.85rem] sm:text-[2.2rem] leading-[1.15] tracking-[-0.025em] mb-2.5"
              style={{ color: '#1C3B57' }}
            >
              <span style={{ fontWeight: 300 }}>
                {firstName ? `${firstName}, ` : ''}elige las herramientas
              </span>
              <br />
              <span style={{ fontWeight: 600 }}>
                para{' '}
                <span style={{ color: '#95D0C9' }}>
                  {tenant?.name || 'tu negocio'}
                </span>
              </span>
            </h1>

            <p className="text-[0.85rem] text-gray-400 leading-relaxed text-center">
              Activa solo lo que necesites — puedes cambiar después.
              <br />
              <span className="text-[#95D0C9] font-medium">Todos los módulos incluyen 14 días gratis.</span>
            </p>
          </div>

          {/* Available modules grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-8 setup-fade-up setup-delay-2">
            {AVAILABLE_MODULES.map((mod) => {
              const isSelected = selected[mod.key];
              const Icon = mod.icon;

              return (
                <button
                  key={mod.key}
                  type="button"
                  onClick={() => toggleModule(mod.key)}
                  className="text-left rounded-xl border-2 transition-all duration-200 cursor-pointer group overflow-hidden"
                  style={{
                    borderColor: isSelected ? mod.accentColor : '#e5e7eb',
                    background: isSelected ? mod.accentBg : '#fff',
                  }}
                >
                  <div className="px-4 py-4">
                    <div className="flex items-center gap-3 mb-2.5">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                        style={{
                          background: isSelected
                            ? `${mod.accentColor}18`
                            : '#f3f4f6',
                        }}
                      >
                        <Icon
                          className="w-4.5 h-4.5 transition-colors"
                          style={{
                            color: isSelected ? mod.accentColor : '#9ca3af',
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className="text-[0.82rem] font-semibold transition-colors"
                            style={{
                              color: isSelected ? '#1C3B57' : '#374151',
                            }}
                          >
                            {mod.label}
                          </p>
                          {mod.key === 'has_website' && websiteAutoSelected && (
                            <span className="text-[0.58rem] font-medium text-[#95D0C9] uppercase tracking-wider">
                              Requerido
                            </span>
                          )}
                        </div>
                        <p className="text-[0.68rem] text-gray-400">
                          {mod.subtitle}
                        </p>
                      </div>
                      <div
                        className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all"
                        style={{
                          borderColor: isSelected ? mod.accentColor : '#d1d5db',
                          background: isSelected ? mod.accentColor : 'transparent',
                        }}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>

                    <div className="pl-12 space-y-1">
                      {mod.features.map((feat) => (
                        <p
                          key={feat}
                          className="text-[0.68rem] text-gray-400 flex items-center gap-1.5"
                        >
                          <span
                            className="w-1 h-1 rounded-full shrink-0"
                            style={{
                              background: isSelected ? mod.accentColor : '#d1d5db',
                            }}
                          />
                          {feat}
                        </p>
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Software section */}
          <div className="mb-6 setup-fade-up setup-delay-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-[0.68rem] text-gray-400 font-medium tracking-wide uppercase">
                Otro software
              </span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SOFTWARE_MODULES.map((mod) => {
                const Icon = mod.icon;
                return (
                  <div
                    key={mod.label}
                    className="text-left rounded-xl border border-gray-200 bg-white opacity-65"
                  >
                    <div className="px-4 py-4">
                      <div className="flex items-center gap-3 mb-2.5">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${mod.accentColor}12` }}
                        >
                          <Icon
                            className="w-4.5 h-4.5"
                            style={{ color: mod.accentColor }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[0.82rem] font-semibold text-gray-500">
                            {mod.label}
                          </p>
                          <p className="text-[0.68rem] text-gray-400">
                            {mod.subtitle}
                          </p>
                        </div>
                        <Lock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      </div>

                      <div className="pl-12 space-y-1">
                        {mod.features.map((feat) => (
                          <p
                            key={feat}
                            className="text-[0.68rem] text-gray-400 flex items-center gap-1.5"
                          >
                            <span
                              className="w-1 h-1 rounded-full shrink-0 bg-gray-300"
                            />
                            {feat}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Future section */}
          <div className="mb-10 setup-fade-up setup-delay-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-[0.68rem] text-gray-400 font-medium tracking-wide uppercase">
                Próximamente
              </span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {FUTURE_MODULES.map((mod) => {
                const Icon = mod.icon;
                return (
                  <div
                    key={mod.label}
                    className="text-left rounded-xl border border-dashed border-gray-200 bg-white opacity-50"
                  >
                    <div className="px-4 py-4">
                      <div className="flex items-center gap-3 mb-2.5">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${mod.accentColor}12` }}
                        >
                          <Icon
                            className="w-4.5 h-4.5"
                            style={{ color: mod.accentColor }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[0.82rem] font-semibold text-gray-500">
                            {mod.label}
                          </p>
                          <p className="text-[0.68rem] text-gray-400">
                            {mod.subtitle}
                          </p>
                        </div>
                        <Lock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      </div>

                      <div className="pl-12 space-y-1">
                        {mod.features.map((feat) => (
                          <p
                            key={feat}
                            className="text-[0.68rem] text-gray-400 flex items-center gap-1.5"
                          >
                            <span
                              className="w-1 h-1 rounded-full shrink-0 bg-gray-300"
                            />
                            {feat}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spacer for sticky CTA */}
          {hasAnyModule && <div className="h-24" />}
        </div>
      </div>

      {/* Sticky CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ease-out"
        style={{
          transform: hasAnyModule ? 'translateY(0)' : 'translateY(100%)',
          opacity: hasAnyModule ? 1 : 0,
        }}
      >
        <div
          className="border-t border-gray-200/80 px-4 py-4"
          style={{ background: 'rgba(250, 251, 252, 0.95)', backdropFilter: 'blur(12px)' }}
        >
          <div className="w-full max-w-3xl mx-auto flex items-center justify-between gap-4">
            <p className="text-[0.72rem] text-gray-400 hidden sm:block">
              {Object.values(selected).filter(Boolean).length} herramienta{Object.values(selected).filter(Boolean).length !== 1 ? 's' : ''} seleccionada{Object.values(selected).filter(Boolean).length !== 1 ? 's' : ''}
            </p>
            <button
              type="button"
              onClick={handleContinue}
              disabled={mutation.isPending}
              className="flex items-center gap-2.5 h-11 px-8 rounded-xl text-white text-[0.85rem] font-medium transition-all duration-150 hover:shadow-lg hover:shadow-[#1C3B57]/10 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
              style={{ background: '#1C3B57' }}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
