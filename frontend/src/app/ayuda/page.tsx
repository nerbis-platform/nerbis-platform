// src/app/ayuda/page.tsx
// Página de ayuda de NERBIS (plataforma) — accesible sin auth

'use client';

import { useState, useMemo, useId } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  ChevronDown,
  MessageCircle,
  Mail,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';

// ─── Constants ─────────────────────────────────────────────────
const SUPPORT_EMAIL = 'soporte@nerbis.com';
const WHATSAPP_NUMBER = '573001234567'; // TODO: reemplazar con número real de NERBIS

// ─── Help categories ──────────────────────────────────────────
const helpCategories = [
  { emoji: '🚀', title: 'Primeros pasos', categoryKey: 'primeros' },
  { emoji: '🛍️', title: 'Tu tienda online', categoryKey: 'tienda' },
  { emoji: '📅', title: 'Reservas y citas', categoryKey: 'reservas' },
  { emoji: '💳', title: 'Planes y facturación', categoryKey: 'planes' },
  { emoji: '🎨', title: 'Diseño y sitio web', categoryKey: 'diseño' },
  { emoji: '🔐', title: 'Mi cuenta', categoryKey: 'cuenta' },
];

// ─── Platform FAQs ────────────────────────────────────────────
const platformFaqs = [
  {
    question: '¿Cuánto cuesta NERBIS?',
    answer: 'Puedes empezar gratis con nuestro período de prueba, sin necesidad de tarjeta de crédito. Al finalizar, elige el plan que mejor se adapte a tu negocio. Los precios varían según los módulos que necesites.',
    category: 'planes',
  },
  {
    question: '¿Cómo creo mi negocio en NERBIS?',
    answer: 'Regístrate desde la página principal con tu email, completa los datos básicos de tu negocio y en minutos tendrás tu sitio listo. Nuestro asistente con IA genera automáticamente el contenido y diseño inicial basado en tu industria.',
    category: 'primeros',
  },
  {
    question: '¿Puedo personalizar el diseño de mi sitio?',
    answer: 'Sí. Desde tu panel de administración accede al Constructor de Sitio Web donde puedes cambiar colores, tipografía, logo, imágenes y contenido de cada sección. La IA también puede regenerar secciones completas por ti.',
    category: 'diseño',
  },
  {
    question: '¿Puedo tener mi propio dominio?',
    answer: 'Tu negocio recibe automáticamente un subdominio (tunegocio.nerbis.com). También puedes conectar tu dominio propio desde la configuración de tu sitio web.',
    category: 'diseño',
  },
  {
    question: '¿Cómo configuro los métodos de pago?',
    answer: 'Desde tu dashboard ve a la sección de configuración de pagos. Puedes conectar Stripe para aceptar tarjetas de crédito y débito, y configurar otros métodos según tu país.',
    category: 'planes',
  },
  {
    question: '¿Cómo agrego productos o servicios?',
    answer: 'Desde el dashboard, accede a "Productos" o "Servicios" según tu módulo activo. Puedes agregar fotos, precios, descripciones, variantes y gestionar inventario de forma sencilla.',
    category: 'tienda',
  },
  {
    question: '¿Qué pasa cuando termina mi período de prueba?',
    answer: 'Tu información y configuración se mantienen intactas. Podrás elegir un plan pago para continuar. Si no actualizas, tu sitio quedará pausado temporalmente pero no perderás ningún dato.',
    category: 'planes',
  },
  {
    question: '¿Puedo agregar empleados a mi cuenta?',
    answer: 'Sí. Desde la sección de Staff en tu dashboard puedes invitar colaboradores con rol de "staff", con acceso limitado según los permisos que les asignes.',
    category: 'cuenta',
  },
  {
    question: '¿Puedo cancelar o reprogramar citas de mis clientes?',
    answer: 'Sí. Tanto tú como tus clientes pueden gestionar citas desde el panel. Recomendamos hacerlo con al menos 24 horas de anticipación para evitar inconvenientes.',
    category: 'reservas',
  },
  {
    question: '¿NERBIS funciona en mi país?',
    answer: 'NERBIS está disponible en toda Latinoamérica y España. Soportamos múltiples monedas, zonas horarias y métodos de pago locales según tu ubicación.',
    category: 'primeros',
  },
];

export default function AyudaPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [faqFilter, setFaqFilter] = useState<string | null>(null);
  const [showAllFaqs, setShowAllFaqs] = useState(false);
  const searchInputId = useId();

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return platformFaqs;
    const query = searchQuery.toLowerCase();
    return platformFaqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const showSearchResults = searchQuery.trim().length > 0;

  const clearSearch = () => {
    setSearchQuery('');
    setOpenFaq(null);
  };

  return (
    <div className="min-h-screen bg-[var(--auth-bg)]">
      <style>{`
        @keyframes ayuda-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .ayuda-animate {
          animation: ayuda-fade-up 0.5s ease-out both;
        }
        .ayuda-delay-1 { animation-delay: 0.1s; }
        .ayuda-delay-2 { animation-delay: 0.2s; }
        .ayuda-delay-3 { animation-delay: 0.35s; }
      `}</style>

      {/* Header */}
      <header className="bg-white border-b border-[var(--auth-border)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/Isotipo_color_NERBIS.png"
              alt="NERBIS"
              width={28}
              height={28}
              className="transition-transform group-hover:scale-105"
              unoptimized
            />
            <span
              className="text-lg text-[var(--auth-primary)]"
              style={{ fontFamily: 'var(--auth-font-brand)', fontWeight: 700, letterSpacing: '0.18em' }}
            >
              NERBIS
            </span>
          </Link>
          <Link
            href="/login"
            className="text-sm text-[var(--auth-text-muted)] hover:text-[var(--auth-primary)] transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative overflow-hidden py-12 md:py-16"
        style={{
          background: `linear-gradient(135deg, var(--auth-gradient-start) 0%, var(--auth-gradient-mid) 40%, var(--auth-gradient-end) 100%)`,
        }}
      >
        {/* Grid sutil */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Isotipo decorativo */}
        <div className="absolute right-[8%] top-1/2 -translate-y-1/2 pointer-events-none opacity-[0.04] hidden md:block">
          <Image
            src="/Isotipo_color_NERBIS.png"
            alt=""
            width={280}
            height={280}
            className="brightness-0 invert"
            unoptimized
            aria-hidden="true"
          />
        </div>
        {/* Glow accent */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute -bottom-20 left-1/4 w-96 h-96 rounded-full blur-3xl"
            style={{ background: 'rgba(13, 148, 136, 0.08)' }}
          />
        </div>

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h1
            className="ayuda-animate text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-8"
            style={{ color: 'var(--auth-text-on-dark)' }}
          >
            ¿En qué te podemos ayudar?
          </h1>

          {/* Buscador */}
          <div className="ayuda-animate ayuda-delay-1 relative max-w-xl mx-auto mb-4">
            <label htmlFor={searchInputId} className="sr-only">
              Buscar en el centro de ayuda
            </label>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400 pointer-events-none" />
            <input
              id={searchInputId}
              type="search"
              placeholder="Buscar preguntas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 pl-12 pr-4 text-base bg-white shadow-xl border-2 border-transparent outline-none transition-all focus:shadow-2xl focus:border-[var(--auth-accent)]"
              style={{ borderRadius: 'var(--auth-radius-card)' }}
            />
          </div>

          {/* Tags de búsqueda rápida */}
          <div className="ayuda-animate ayuda-delay-2 flex flex-wrap items-center justify-center gap-2 mb-10">
            <span className="text-xs" style={{ color: 'var(--auth-text-on-dark-subtle)' }}>
              Popular:
            </span>
            {['precios', 'dominio propio', 'métodos de pago', 'personalizar sitio', 'agregar productos'].map((tag) => (
              <button
                key={tag}
                onClick={() => setSearchQuery(tag)}
                className="px-3 py-1 rounded-full text-xs transition-all hover:bg-white/15"
                style={{
                  background: 'rgba(255, 255, 255, 0.07)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: 'var(--auth-text-on-dark-muted)',
                }}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Canales de contacto */}
          <div
            className="ayuda-animate ayuda-delay-3 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 backdrop-blur-sm"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola, necesito ayuda con NERBIS')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:text-white hover:bg-white/10"
              style={{ color: 'var(--auth-text-on-dark-muted)' }}
            >
              <MessageCircle className="size-4 text-emerald-400" />
              WhatsApp
              <ExternalLink className="size-3 opacity-50" />
            </a>
            <div className="hidden sm:block w-px h-4" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:text-white hover:bg-white/10"
              style={{ color: 'var(--auth-text-on-dark-muted)' }}
            >
              <Mail className="size-4" />
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Resultados filtrados */}
        {showSearchResults && (
          <section className="py-12">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm" style={{ color: 'var(--auth-text-muted)' }}>
                  {filteredFaqs.length} resultado{filteredFaqs.length !== 1 ? 's' : ''} para &quot;{searchQuery}&quot;
                </p>
                <button
                  onClick={clearSearch}
                  className="text-sm font-medium flex items-center gap-1 text-[var(--auth-primary)] transition-colors hover:opacity-80"
                >
                  <ArrowLeft className="size-3.5" />
                  Ver todo
                </button>
              </div>

              {filteredFaqs.length > 0 ? (
                <div className="space-y-3">
                  {filteredFaqs.map((faq, i) => (
                    <FaqAccordion
                      key={`search-${i}`}
                      faq={faq}
                      isOpen={openFaq === i}
                      onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <span className="text-5xl block mb-4" role="img" aria-label="Sin resultados">🤔</span>
                  <p style={{ color: 'var(--auth-text)' }} className="font-medium mb-1">
                    No encontramos resultados
                  </p>
                  <p className="text-sm" style={{ color: 'var(--auth-text-muted)' }}>
                    Intenta con otras palabras o{' '}
                    <a
                      href={`mailto:${SUPPORT_EMAIL}`}
                      className="font-medium text-[var(--auth-primary)] hover:underline underline-offset-2"
                    >
                      escríbenos directamente
                    </a>
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Contenido principal */}
        {!showSearchResults && (
          <>
            {/* FAQs */}
            <section className="py-14">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-xl md:text-2xl font-bold text-[var(--auth-text)] mb-6 text-center">
                  Preguntas frecuentes
                </h2>

                {/* Filter chips */}
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                  <button
                    onClick={() => { setFaqFilter(null); setShowAllFaqs(false); setOpenFaq(null); }}
                    className="px-3.5 py-1.5 rounded-full text-sm font-medium transition-all"
                    style={{
                      background: faqFilter === null ? 'var(--auth-primary)' : 'color-mix(in srgb, var(--auth-primary) 8%, transparent)',
                      color: faqFilter === null ? 'white' : 'var(--auth-text-muted)',
                    }}
                  >
                    Todas
                  </button>
                  {helpCategories.map((cat) => (
                    <button
                      key={cat.categoryKey}
                      onClick={() => { setFaqFilter(faqFilter === cat.categoryKey ? null : cat.categoryKey); setShowAllFaqs(true); setOpenFaq(null); }}
                      className="px-3.5 py-1.5 rounded-full text-sm font-medium transition-all"
                      style={{
                        background: faqFilter === cat.categoryKey ? 'var(--auth-primary)' : 'color-mix(in srgb, var(--auth-primary) 8%, transparent)',
                        color: faqFilter === cat.categoryKey ? 'white' : 'var(--auth-text-muted)',
                      }}
                    >
                      {cat.emoji} {cat.title}
                    </button>
                  ))}
                </div>

                {/* FAQ list */}
                {(() => {
                  const filtered = faqFilter
                    ? platformFaqs.filter((f) => f.category === faqFilter)
                    : platformFaqs;
                  const visible = showAllFaqs || faqFilter ? filtered : filtered.slice(0, 5);
                  const hasMore = !faqFilter && !showAllFaqs && filtered.length > 5;

                  return (
                    <>
                      <div className="space-y-3">
                        {visible.map((faq, i) => (
                          <FaqAccordion
                            key={`${faqFilter ?? 'all'}-${i}`}
                            faq={faq}
                            isOpen={openFaq === i}
                            onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                          />
                        ))}
                      </div>

                      {hasMore && (
                        <button
                          onClick={() => { setShowAllFaqs(true); setOpenFaq(null); }}
                          className="mt-6 mx-auto flex items-center gap-1.5 text-sm font-medium text-[var(--auth-primary)] hover:underline underline-offset-2 transition-colors"
                        >
                          Ver todas las preguntas ({filtered.length})
                          <ChevronDown className="size-3.5" />
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </section>
          </>
        )}

        {/* CTA de cierre */}
        <section className="pb-16">
          <div className="max-w-2xl mx-auto text-center">
            <div
              className="rounded-2xl p-8 md:p-10 relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, var(--auth-gradient-start) 0%, var(--auth-gradient-end) 100%)`,
              }}
            >
              <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                  backgroundSize: '48px 48px',
                }}
              />
              <div className="relative">
                <h2
                  className="text-xl md:text-2xl font-bold mb-2"
                  style={{ color: 'var(--auth-text-on-dark)' }}
                >
                  ¿Listo para empezar?
                </h2>
                <p className="mb-6 text-sm md:text-base" style={{ color: 'var(--auth-text-on-dark-muted)' }}>
                  Crea tu negocio digital en minutos. Sin tarjeta de crédito.
                </p>
                <Link
                  href="/register-business"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white font-medium text-[var(--auth-primary)] transition-all hover:shadow-lg hover:-translate-y-0.5"
                  style={{ borderRadius: 'var(--auth-radius-card)' }}
                >
                  Crear mi negocio gratis
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--auth-border)] bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-center gap-2">
          <Image src="/Isotipo_color_NERBIS.png" alt="NERBIS" width={18} height={18} unoptimized />
          <span className="text-xs text-[var(--auth-text-muted)]">
            &copy; {new Date().getFullYear()} NERBIS. Todos los derechos reservados.
          </span>
        </div>
      </footer>
    </div>
  );
}

// ─── FAQ Accordion ────────────────────────────────────────────
function FaqAccordion({
  faq,
  isOpen,
  onToggle,
}: {
  faq: { question: string; answer: string };
  isOpen: boolean;
  onToggle: () => void;
}) {
  const id = useId();
  const headerId = `${id}-header`;
  const panelId = `${id}-panel`;

  return (
    <div
      className="bg-white border overflow-hidden transition-all hover:shadow-sm"
      style={{
        borderRadius: 'var(--auth-radius-card)',
        borderColor: isOpen ? 'var(--auth-primary)' : 'var(--auth-border)',
        borderLeftWidth: isOpen ? '3px' : '1px',
      }}
    >
      <button
        id={headerId}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="w-full flex items-center justify-between p-5 text-left font-medium text-[var(--auth-text)] hover:bg-gray-50/50 transition-colors"
      >
        {faq.question}
        <ChevronDown
          className={`size-4.5 shrink-0 ml-4 text-[var(--auth-text-muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        className="grid transition-[grid-template-rows] duration-200"
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 text-[var(--auth-text-muted)] leading-relaxed text-[0.94rem]">
            {faq.answer}
          </div>
        </div>
      </div>
    </div>
  );
}
