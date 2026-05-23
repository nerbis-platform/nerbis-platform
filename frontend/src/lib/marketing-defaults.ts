// src/lib/marketing-defaults.ts
//
// Default content for the marketing landing page.
// These values are the exact texts currently hardcoded in the marketing
// components. They serve as fallback when the API does not respond or
// a section has not been seeded in the database yet.

import type { MarketingSections } from '@/types/marketing';

export const MARKETING_DEFAULTS: MarketingSections = {
  hero: {
    is_visible: true,
    content: {
      title_line1: 'Hazlo real!',
      title_line2: 'Tu sitio web, creado por IA',
      subtitle:
        'Solo cuentale tu idea a Pipe. El se encarga del resto.',
      cta_text: 'Empezar gratis',
      cta_href: '/register',
      cta_subtext: 'Sin tarjeta de credito \u00b7 Listo en 30 segundos',
    },
  },

  problem_solution: {
    is_visible: true,
    content: {
      badge: 'Por que NERBIS',
      title: 'Deja atras lo generico',
      before_label: 'Lo que haces hoy',
      after_label: 'Lo que haces con NERBIS',
      comparisons: [
        {
          before: 'Eliges un template generico',
          after: 'Pipe, nuestra IA, genera tu sitio unico',
        },
        {
          before: 'Pasas horas personalizando',
          after: 'Listo en 30 segundos',
        },
        {
          before: 'Necesitas 3 herramientas distintas',
          after: 'Todo integrado: web + tienda + reservas',
        },
        {
          before: 'Tu sitio se ve como mil otros',
          after: 'Diseno personalizado por industria',
        },
      ],
    },
  },

  how_it_works: {
    is_visible: true,
    content: {
      badge: 'Asi de simple',
      title: 'Tres pasos. Cero friccion.',
      steps: [
        {
          step_label: 'Paso 1',
          title: 'Registrate',
          description: 'Solo necesitas tu nombre, industria y pais.',
        },
        {
          step_label: 'Paso 2',
          title: 'Pipe crea tu sitio',
          description:
            'Pipe, nuestro asistente de IA, genera todo en segundos.',
        },
        {
          step_label: 'Paso 3',
          title: 'Personaliza y publica',
          description: 'Edita lo que quieras. O dejalo tal cual.',
        },
      ],
    },
  },

  cta_mid: {
    is_visible: true,
    content: {
      title: 'Listo para empezar?',
      subtitle: 'Crea tu sitio en segundos. Sin tarjeta de credito.',
      cta_text: 'Empezar gratis',
      cta_href: '/register',
    },
  },

  industries: {
    is_visible: true,
    content: {
      badge: 'Verticales',
      title: 'Hecho para tu industria.',
      subtitle:
        'Cada sitio se genera con el contenido, estructura y diseno optimo para tu tipo de negocio.',
      industries: [
        { name: 'Belleza', emoji: '\u2728' },
        { name: 'Restaurantes', emoji: '\uD83C\uDF7D\uFE0F' },
        { name: 'Salud', emoji: '\uD83E\uDE7A' },
        { name: 'Fitness', emoji: '\uD83C\uDFCB\uFE0F' },
        { name: 'Retail', emoji: '\uD83D\uDECD\uFE0F' },
        { name: 'Educacion', emoji: '\uD83C\uDF93' },
        { name: 'Fotografia', emoji: '\uD83D\uDCF7' },
        { name: 'Servicios', emoji: '\uD83D\uDD27' },
        { name: 'Automotriz', emoji: '\uD83D\uDE97' },
        { name: 'Inmobiliaria', emoji: '\uD83C\uDFE0' },
        { name: 'Arte', emoji: '\uD83C\uDFA8' },
        { name: 'Musica', emoji: '\uD83C\uDFB5' },
        { name: 'Clinicas', emoji: '\uD83E\uDE7A' },
        { name: 'Veterinaria', emoji: '\uD83D\uDC3E' },
        { name: 'Floristeria', emoji: '\uD83C\uDF3A' },
        { name: 'Legal', emoji: '\u2696\uFE0F' },
        { name: 'Turismo', emoji: '\u2708\uFE0F' },
        { name: 'Tecnologia', emoji: '\uD83D\uDCBB' },
      ],
      overflow_text: '+7 mas',
    },
  },

  faq: {
    is_visible: true,
    content: {
      badge: 'FAQ',
      title: 'Preguntas frecuentes',
      items: [
        {
          question: '\u00bfQue es NERBIS?',
          answer:
            'NERBIS es una plataforma que utiliza inteligencia artificial para crear tu negocio digital completo en segundos. Pipe, nuestro asistente de IA, disena tu sitio web, configura tu tienda online y prepara todo para que empieces a vender.',
        },
        {
          question: '\u00bfCuanto cuesta usar NERBIS?',
          answer:
            'NERBIS ofrece un plan gratuito para empezar. No necesitas tarjeta de credito. Puedes crear tu tienda, personalizarla y publicarla sin costo.',
        },
        {
          question: '\u00bfCuanto tiempo toma crear mi tienda?',
          answer:
            'Pipe genera tu sitio completo en aproximadamente 30 segundos. Solo necesitas contarle sobre tu negocio y el se encarga del diseno, contenido y configuracion.',
        },
        {
          question: '\u00bfNecesito saber programar?',
          answer:
            'No. NERBIS esta disenado para emprendedores sin conocimientos tecnicos. Pipe crea todo por ti, y el editor visual te permite personalizar sin escribir codigo.',
        },
        {
          question: '\u00bfQue industrias soporta NERBIS?',
          answer:
            'NERBIS soporta mas de 12 industrias incluyendo belleza y bienestar, fitness, gastronomia, moda y retail, salud, educacion y servicios profesionales.',
        },
        {
          question: '\u00bfPuedo usar mi propio dominio?',
          answer:
            'Si. Puedes conectar tu dominio personalizado o usar un subdominio gratuito tunegocio.nerbis.com.',
        },
        {
          question: '\u00bfNERBIS incluye pasarela de pagos?',
          answer:
            'Si. NERBIS se integra con las principales pasarelas de pago de Latinoamerica para que puedas cobrar desde el primer dia.',
        },
        {
          question: '\u00bfQuien es Pipe?',
          answer:
            'Pipe es el asistente de inteligencia artificial de NERBIS. Lleva el nombre en honor a Juan Felipe, familiar del fundador. Pipe analiza tu negocio, disena tu sitio y te ayuda a crecer.',
        },
      ],
    },
  },

  cta_final: {
    is_visible: true,
    content: {
      title_line1: 'Tu negocio merece mas',
      title_line2: 'que un template.',
      cta_text: 'Empezar gratis',
      cta_href: '/register',
      cta_subtext: 'Sin tarjeta de credito. Sin compromisos.',
    },
  },

  header: {
    is_visible: true,
    content: {
      nav_links: [
        { label: 'Producto', href: '/producto' },
        { label: 'Industrias', href: '/industrias' },
        { label: 'Precios', href: '/precios' },
      ],
      cta_text: 'Empezar gratis',
      cta_href: '/register',
      login_text: '\u00bfYa tienes cuenta?',
      login_href: '/login',
    },
  },

  seo: {
    is_visible: true,
    content: {
      title: 'NERBIS \u2014 Tu negocio online en 30 segundos',
      description:
        'NERBIS genera un sitio web profesional y personalizado para tu negocio con inteligencia artificial. Sin codigo. Sin templates genericos.',
    },
  },
};
