'use client';

import { useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ChevronDown } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: '¿Que es NERBIS?',
    answer:
      'NERBIS es una plataforma que utiliza inteligencia artificial para crear tu negocio digital completo en segundos. Pipe, nuestro asistente de IA, disena tu sitio web, configura tu tienda online y prepara todo para que empieces a vender.',
  },
  {
    question: '¿Cuanto cuesta usar NERBIS?',
    answer:
      'NERBIS ofrece un plan gratuito para empezar. No necesitas tarjeta de credito. Puedes crear tu tienda, personalizarla y publicarla sin costo.',
  },
  {
    question: '¿Cuanto tiempo toma crear mi tienda?',
    answer:
      'Pipe genera tu sitio completo en aproximadamente 30 segundos. Solo necesitas contarle sobre tu negocio y el se encarga del diseno, contenido y configuracion.',
  },
  {
    question: '¿Necesito saber programar?',
    answer:
      'No. NERBIS esta disenado para emprendedores sin conocimientos tecnicos. Pipe crea todo por ti, y el editor visual te permite personalizar sin escribir codigo.',
  },
  {
    question: '¿Que industrias soporta NERBIS?',
    answer:
      'NERBIS soporta mas de 12 industrias incluyendo belleza y bienestar, fitness, gastronomia, moda y retail, salud, educacion y servicios profesionales.',
  },
  {
    question: '¿Puedo usar mi propio dominio?',
    answer:
      'Si. Puedes conectar tu dominio personalizado o usar un subdominio gratuito tunegocio.nerbis.com.',
  },
  {
    question: '¿NERBIS incluye pasarela de pagos?',
    answer:
      'Si. NERBIS se integra con las principales pasarelas de pago de Latinoamerica para que puedas cobrar desde el primer dia.',
  },
  {
    question: '¿Quien es Pipe?',
    answer:
      'Pipe es el asistente de inteligencia artificial de NERBIS. Lleva el nombre en honor a Juan Felipe, familiar del fundador. Pipe analiza tu negocio, disena tu sitio y te ayuda a crecer.',
  },
];

function FaqAccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="faq-item invisible border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-foreground/80"
        aria-expanded={isOpen}
      >
        <span className="text-base font-medium text-foreground sm:text-lg">
          {item.question}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        ref={contentRef}
        className="grid transition-all duration-200 ease-out"
        style={{
          gridTemplateRows: isOpen ? '1fr' : '0fr',
        }}
      >
        <div className="overflow-hidden">
          <p className="pb-5 text-base leading-relaxed text-muted-foreground">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export function Faq() {
  const sectionRef = useRef<HTMLElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = useCallback((index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  }, []);

  useGSAP(
    () => {
      if (!sectionRef.current) return;

      const mm = gsap.matchMedia();

      mm.add(
        {
          reduced: '(prefers-reduced-motion: reduce)',
          normal: '(prefers-reduced-motion: no-preference)',
        },
        (context) => {
          const { reduced } = context.conditions as {
            reduced: boolean;
            normal: boolean;
          };

          if (reduced) {
            gsap.set('.faq-heading, .faq-item', { autoAlpha: 1 });
            return;
          }

          // Heading
          gsap.from('.faq-heading', {
            y: 40,
            autoAlpha: 0,
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: '.faq-heading',
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          });

          // FAQ items stagger
          ScrollTrigger.batch('.faq-item', {
            onEnter: (batch) => {
              gsap.from(batch, {
                y: 20,
                autoAlpha: 0,
                stagger: 0.08,
                duration: 0.5,
                ease: 'power2.out',
              });
            },
            start: 'top 90%',
          });
        }
      );
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="faq"
      className="bg-background px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-3xl">
        <div className="faq-heading invisible text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            FAQ
          </p>
          <h2 className="nerbis-display mt-4 text-3xl text-foreground sm:text-4xl lg:text-5xl">
            Preguntas frecuentes
          </h2>
        </div>

        <div className="mt-12">
          {faqs.map((item, index) => (
            <FaqAccordionItem
              key={item.question}
              item={item}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
