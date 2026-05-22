import type { Metadata } from 'next';
import { Hero } from '@/components/marketing/hero';
import { SocialProof } from '@/components/marketing/social-proof';
import { ProblemSolution } from '@/components/marketing/problem-solution';
import { PipeDemo } from '@/components/marketing/pipe-demo';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { FeaturesGrid } from '@/components/marketing/features-grid';
import { Industries } from '@/components/marketing/industries';
import { CtaMid } from '@/components/marketing/cta-mid';
import { Showcase } from '@/components/marketing/showcase';
import { Faq } from '@/components/marketing/faq';
import { CtaFinal } from '@/components/marketing/cta-final';

export const metadata: Metadata = {
  title: 'NERBIS — Tu negocio online en 30 segundos',
  description:
    'NERBIS genera un sitio web profesional y personalizado para tu negocio con inteligencia artificial. Sin codigo. Sin templates genericos.',
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'NERBIS',
  url: 'https://nerbis.com',
  logo: 'https://nerbis.com/icon.svg',
  description:
    'Plataforma que crea tu negocio digital con inteligencia artificial',
  sameAs: [
    'https://twitter.com/nerbisplatform',
    'https://instagram.com/nerbisplatform',
    'https://linkedin.com/company/nerbis',
  ],
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '¿Que es NERBIS?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'NERBIS es una plataforma que utiliza inteligencia artificial para crear tu negocio digital completo en segundos. Pipe, nuestro asistente de IA, disena tu sitio web, configura tu tienda online y prepara todo para que empieces a vender.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Cuanto cuesta usar NERBIS?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'NERBIS ofrece un plan gratuito para empezar. No necesitas tarjeta de credito. Puedes crear tu tienda, personalizarla y publicarla sin costo.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Cuanto tiempo toma crear mi tienda?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Pipe genera tu sitio completo en aproximadamente 30 segundos. Solo necesitas contarle sobre tu negocio y el se encarga del diseno, contenido y configuracion.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Necesito saber programar?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. NERBIS esta disenado para emprendedores sin conocimientos tecnicos. Pipe crea todo por ti, y el editor visual te permite personalizar sin escribir codigo.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Que industrias soporta NERBIS?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'NERBIS soporta mas de 12 industrias incluyendo belleza y bienestar, fitness, gastronomia, moda y retail, salud, educacion y servicios profesionales.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Puedo usar mi propio dominio?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Si. Puedes conectar tu dominio personalizado o usar un subdominio gratuito tunegocio.nerbis.com.',
      },
    },
    {
      '@type': 'Question',
      name: '¿NERBIS incluye pasarela de pagos?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Si. NERBIS se integra con las principales pasarelas de pago de Latinoamerica para que puedas cobrar desde el primer dia.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Quien es Pipe?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Pipe es el asistente de inteligencia artificial de NERBIS. Lleva el nombre en honor a Juan Felipe, familiar del fundador. Pipe analiza tu negocio, disena tu sitio y te ayuda a crecer.',
      },
    },
  ],
};

const howToJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'Como crear tu tienda online con NERBIS',
  description:
    'Crea tu negocio digital en 3 simples pasos con la ayuda de Pipe, tu asistente de IA.',
  step: [
    {
      '@type': 'HowToStep',
      name: 'Registrate',
      text: 'Crea tu cuenta gratis y cuentale a Pipe sobre tu negocio.',
    },
    {
      '@type': 'HowToStep',
      name: 'Pipe crea tu sitio',
      text: 'En 30 segundos, Pipe disena tu sitio web completo con contenido personalizado.',
    },
    {
      '@type': 'HowToStep',
      name: 'Personaliza y publica',
      text: 'Ajusta los detalles con el editor visual y publica tu tienda online.',
    },
  ],
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(howToJsonLd),
        }}
      />
      <Hero />
      <SocialProof />
      <ProblemSolution />
      <PipeDemo />
      <HowItWorks />
      <Showcase />
      <FeaturesGrid />
      <CtaMid />
      <Industries />
      <Faq />
      <CtaFinal />
    </>
  );
}
