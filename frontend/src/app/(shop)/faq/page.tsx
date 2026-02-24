// src/app/(shop)/faq/page.tsx

'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HelpCircle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PageGuard } from '@/components/common/PageGuard';
import { usePageContent } from '@/contexts/WebsiteContentContext';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAIContent {
  title?: string;
  subtitle?: string;
  items?: FAQItem[];
}

const defaultFaqs = [
  {
    category: 'General',
    items: [
      {
        question: '¿Cuáles son los horarios de atención?',
        answer: 'Nuestros horarios varían según la sucursal. Consulta la sección de contacto para ver los horarios específicos de cada ubicación.',
      },
      {
        question: '¿Dónde están ubicados?',
        answer: 'Puedes encontrar nuestra dirección y ubicación exacta en la página de contacto. También puedes ver la ubicación en Google Maps.',
      },
    ],
  },
  {
    category: 'Servicios y Reservas',
    items: [
      {
        question: '¿Cómo puedo agendar una cita?',
        answer: 'Puedes agendar tu cita directamente desde nuestra página de servicios. Selecciona el servicio que deseas, elige la fecha y hora disponible, y confirma tu reserva.',
      },
      {
        question: '¿Puedo cancelar o reprogramar mi cita?',
        answer: 'Sí, puedes cancelar o reprogramar tu cita desde tu panel de usuario. Te recomendamos hacerlo con al menos 24 horas de anticipación.',
      },
      {
        question: '¿Necesito crear una cuenta para reservar?',
        answer: 'Sí, necesitas crear una cuenta para poder gestionar tus reservas, ver tu historial y recibir notificaciones sobre tus citas.',
      },
    ],
  },
  {
    category: 'Productos y Pagos',
    items: [
      {
        question: '¿Qué métodos de pago aceptan?',
        answer: 'Aceptamos tarjetas de crédito y débito, transferencias bancarias y pagos en efectivo en nuestras sucursales.',
      },
      {
        question: '¿Hacen envíos a domicilio?',
        answer: 'Sí, realizamos envíos a nivel nacional. Los tiempos y costos de envío varían según tu ubicación.',
      },
      {
        question: '¿Cuál es la política de devoluciones?',
        answer: 'Tienes hasta 30 días para devolver productos sin uso en su empaque original. Los servicios no son reembolsables una vez realizados.',
      },
    ],
  },
];

export default function FAQPage() {
  const aiContent = usePageContent<FAQAIContent>('faq');

  const hasAIItems = aiContent?.items && aiContent.items.length > 0;

  return (
    <PageGuard page="faq">
      <Header />
      <main className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative py-20 md:py-28 overflow-hidden bg-linear-to-br from-primary/5 via-primary/10 to-background">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-20 right-10 w-72 h-72 bg-primary/15 rounded-full blur-3xl" />
            <div className="absolute bottom-20 left-10 w-96 h-96 bg-blue-300/10 rounded-full blur-3xl" />
          </div>
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <HelpCircle className="h-4 w-4" />
                Centro de ayuda
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                {aiContent?.title || 'Preguntas Frecuentes'}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                {aiContent?.subtitle || 'Encuentra respuestas rápidas a las dudas más comunes. Si no encuentras lo que buscas, contáctanos.'}
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Items */}
        <section className="py-16">
          <div className="container">
            <div className="max-w-3xl mx-auto space-y-12">
              {hasAIItems ? (
                /* FAQ items generados por IA */
                <div className="space-y-4">
                  {aiContent.items!.map((faq, i) => (
                    <details
                      key={i}
                      className="group border rounded-xl overflow-hidden"
                    >
                      <summary className="flex items-center justify-between cursor-pointer p-5 font-medium hover:bg-muted/50 transition-colors">
                        {faq.question}
                        <span className="ml-4 shrink-0 text-muted-foreground group-open:rotate-180 transition-transform">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                        </span>
                      </summary>
                      <div className="px-5 pb-5 text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </div>
                    </details>
                  ))}
                </div>
              ) : (
                /* Fallback: FAQ por categorías hardcodeado */
                defaultFaqs.map((section) => (
                  <div key={section.category}>
                    <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <HelpCircle className="h-5 w-5 text-primary" />
                      </div>
                      {section.category}
                    </h2>
                    <div className="space-y-4">
                      {section.items.map((faq, i) => (
                        <details
                          key={i}
                          className="group border rounded-xl overflow-hidden"
                        >
                          <summary className="flex items-center justify-between cursor-pointer p-5 font-medium hover:bg-muted/50 transition-colors">
                            {faq.question}
                            <span className="ml-4 shrink-0 text-muted-foreground group-open:rotate-180 transition-transform">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                            </span>
                          </summary>
                          <div className="px-5 pb-5 text-muted-foreground leading-relaxed">
                            {faq.answer}
                          </div>
                        </details>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-muted/30">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <MessageCircle className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-3">¿No encontraste tu respuesta?</h2>
              <p className="text-muted-foreground mb-6">
                Nuestro equipo está listo para ayudarte con cualquier duda.
              </p>
              <Button size="lg" asChild>
                <Link href="/contact">Contáctanos</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </PageGuard>
  );
}
