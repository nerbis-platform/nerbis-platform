/**
 * Plantillas de secciones con contenido pre-llenado por variante.
 *
 * Cada template define: sección, variante, y contenido de ejemplo
 * listo para usar al agregar una nueva sección desde la biblioteca.
 */

export interface SectionTemplate {
  sectionId: string;
  variant: string;
  content: Record<string, unknown>;
}

/**
 * Contenido pre-llenado por sección + variante.
 * La key es `${sectionId}:${variantId}`, el value es el content.
 */
export const SECTION_TEMPLATES: Record<string, Record<string, unknown>> = {
  // ── Hero ─────────────────────────────────────────
  'hero:centered': {
    title: 'Bienvenido a tu nuevo sitio web',
    subtitle: 'Creamos experiencias digitales que conectan con tu audiencia y hacen crecer tu negocio.',
    cta_text: 'Comenzar ahora',
    cta_link: '#contact',
  },
  'hero:split-image': {
    title: 'Impulsa tu negocio al siguiente nivel',
    subtitle: 'Soluciones profesionales diseñadas para potenciar tu presencia digital.',
    cta_text: 'Conoce más',
    cta_link: '#about',
    image: '',
  },
  'hero:fullwidth-image': {
    title: 'Tu visión, nuestra pasión',
    subtitle: 'Transformamos ideas en experiencias digitales memorables.',
    cta_text: 'Ver servicios',
    cta_link: '#services',
  },
  'hero:bold-typography': {
    title: 'Hacemos lo extraordinario posible',
    subtitle: 'Innovación y creatividad al servicio de tu marca.',
    cta_text: 'Descubrir',
    cta_link: '#about',
  },
  'hero:diagonal-split': {
    title: 'Diseño que inspira resultados',
    subtitle: 'Combinamos creatividad y estrategia para impulsar tu marca.',
    cta_text: 'Empezar',
    cta_link: '#contact',
  },
  'hero:glassmorphism': {
    title: 'El futuro de tu negocio empieza aquí',
    subtitle: 'Tecnología de vanguardia para una experiencia única.',
    cta_text: 'Explorar',
    cta_link: '#services',
  },

  // ── About ────────────────────────────────────────
  'about:text-only': {
    title: 'Sobre Nosotros',
    content: 'Somos un equipo apasionado por crear soluciones que marcan la diferencia. Con años de experiencia en el mercado, nos dedicamos a ofrecer productos y servicios de la más alta calidad.',
    highlights: ['Más de 10 años de experiencia', 'Equipo profesional certificado', 'Compromiso con la excelencia'],
  },
  'about:split-image': {
    title: 'Nuestra Historia',
    content: 'Desde nuestros inicios, hemos trabajado con la misión de transformar la manera en que las empresas conectan con sus clientes. Cada proyecto es una oportunidad para superar expectativas.',
    highlights: ['Innovación constante', 'Atención personalizada', 'Resultados medibles'],
    image: '',
  },
  'about:stats-banner': {
    title: 'Sobre Nosotros',
    content: 'Nuestros números hablan por sí solos. Cada cifra representa el compromiso que tenemos con nuestros clientes.',
    highlights: ['500+ Proyectos completados', '98% Clientes satisfechos', '15 Años de experiencia'],
  },
  'about:timeline': {
    title: 'Nuestra Trayectoria',
    content: 'Un recorrido de crecimiento constante y evolución profesional.',
    highlights: ['2010 - Fundación de la empresa', '2015 - Expansión regional', '2020 - Transformación digital'],
  },
  'about:overlapping-cards': {
    title: 'Lo que nos define',
    content: 'Tres pilares fundamentales guían todo lo que hacemos.',
    highlights: ['Calidad sin compromisos', 'Innovación continua', 'Servicio excepcional'],
  },
  'about:fullwidth-banner': {
    title: 'Comprometidos con tu éxito',
    content: 'Creemos que cada negocio tiene una historia única que merece ser contada de la mejor manera posible.',
    highlights: ['Visión global', 'Ejecución local', 'Impacto real'],
  },
  'about:asymmetric': {
    title: 'Conoce nuestro equipo',
    content: 'Profesionales dedicados a hacer realidad tu visión. Combinamos talento, experiencia y pasión en cada proyecto.',
    highlights: ['Equipo multidisciplinario', 'Metodologías ágiles', 'Comunicación transparente'],
    image: '',
  },

  // ── Services ─────────────────────────────────────
  'services:grid-cards': {
    title: 'Nuestros Servicios',
    subtitle: 'Soluciones integrales para tu negocio',
    items: [
      { title: 'Consultoría', description: 'Asesoría estratégica para optimizar tus procesos y alcanzar tus objetivos.', icon: 'briefcase' },
      { title: 'Desarrollo', description: 'Soluciones tecnológicas a medida para digitalizar tu negocio.', icon: 'code' },
      { title: 'Diseño', description: 'Creamos experiencias visuales que cautivan y convierten.', icon: 'palette' },
    ],
  },
  'services:grid-cards-image': {
    title: 'Nuestros Servicios',
    subtitle: 'Descubre todo lo que podemos hacer por ti',
    items: [
      { title: 'Consultoría Estratégica', description: 'Planificación y estrategia para el crecimiento de tu negocio.', image: '' },
      { title: 'Desarrollo Digital', description: 'Aplicaciones y plataformas que impulsan tu operación.', image: '' },
      { title: 'Marketing Digital', description: 'Estrategias que conectan tu marca con tu audiencia ideal.', image: '' },
    ],
  },
  'services:list-detailed': {
    title: 'Nuestros Servicios',
    subtitle: 'Cada servicio diseñado para generar resultados',
    items: [
      { title: 'Consultoría', description: 'Análisis profundo de tu negocio para identificar oportunidades de mejora y crecimiento sostenible.' },
      { title: 'Desarrollo', description: 'Creación de soluciones digitales personalizadas con las últimas tecnologías del mercado.' },
      { title: 'Soporte', description: 'Acompañamiento continuo para garantizar el funcionamiento óptimo de tus sistemas.' },
    ],
  },
  'services:featured-highlight': {
    title: 'Nuestros Servicios',
    subtitle: 'Lo mejor que podemos ofrecer',
    items: [
      { title: 'Servicio Premium', description: 'Nuestra solución más completa para empresas que buscan resultados extraordinarios.', featured: true },
      { title: 'Consultoría', description: 'Asesoría experta para tu negocio.' },
      { title: 'Desarrollo', description: 'Soluciones digitales a medida.' },
      { title: 'Soporte', description: 'Asistencia técnica 24/7.' },
    ],
  },
  'services:horizontal-scroll': {
    title: 'Servicios',
    subtitle: 'Explora nuestras soluciones',
    items: [
      { title: 'Consultoría', description: 'Estrategia y planificación para tu negocio.' },
      { title: 'Desarrollo', description: 'Soluciones tecnológicas innovadoras.' },
      { title: 'Diseño', description: 'Experiencias visuales impactantes.' },
      { title: 'Marketing', description: 'Estrategias digitales efectivas.' },
    ],
  },
  'services:icon-minimal': {
    title: 'Servicios',
    subtitle: 'Simple, efectivo, profesional',
    items: [
      { title: 'Estrategia', description: 'Planificación basada en datos.', icon: 'target' },
      { title: 'Diseño', description: 'Interfaces intuitivas y atractivas.', icon: 'palette' },
      { title: 'Desarrollo', description: 'Código limpio y escalable.', icon: 'code' },
      { title: 'Soporte', description: 'Asistencia cuando la necesites.', icon: 'headphones' },
    ],
  },
  'services:bento-grid': {
    title: 'Nuestros Servicios',
    subtitle: 'Un ecosistema completo de soluciones',
    items: [
      { title: 'Consultoría', description: 'Estrategia integral para tu crecimiento.' },
      { title: 'Desarrollo Web', description: 'Sitios y apps de alta calidad.' },
      { title: 'Diseño UX/UI', description: 'Experiencias centradas en el usuario.' },
      { title: 'Marketing', description: 'Campañas que generan resultados.' },
      { title: 'Soporte', description: 'Acompañamiento continuo.' },
    ],
  },

  // ── Products ─────────────────────────────────────
  'products:grid-cards': {
    title: 'Nuestros Productos',
    subtitle: 'Calidad que se nota',
    items: [
      { title: 'Producto Estrella', description: 'Nuestro producto más popular y mejor valorado.', price: '' },
      { title: 'Producto Premium', description: 'La mejor opción para quienes buscan lo máximo.', price: '' },
      { title: 'Producto Básico', description: 'Ideal para comenzar con lo esencial.', price: '' },
    ],
  },
  'products:grid-cards-image': {
    title: 'Catálogo',
    subtitle: 'Descubre nuestra selección',
    items: [
      { title: 'Producto 1', description: 'Descripción del producto.', image: '', price: '' },
      { title: 'Producto 2', description: 'Descripción del producto.', image: '', price: '' },
      { title: 'Producto 3', description: 'Descripción del producto.', image: '', price: '' },
    ],
  },
  'products:showcase-large': {
    title: 'Destacados',
    subtitle: 'Lo mejor de nuestra colección',
    items: [
      { title: 'Producto Destacado', description: 'Una pieza única diseñada para impresionar.', image: '' },
      { title: 'Edición Especial', description: 'Disponible por tiempo limitado.', image: '' },
    ],
  },
  'products:catalog-compact': {
    title: 'Catálogo Completo',
    subtitle: 'Explora todas nuestras opciones',
    items: [
      { title: 'Producto A', price: '' },
      { title: 'Producto B', price: '' },
      { title: 'Producto C', price: '' },
      { title: 'Producto D', price: '' },
    ],
  },
  'products:masonry-staggered': {
    title: 'Productos',
    subtitle: 'Nuestra colección completa',
    items: [
      { title: 'Producto 1', image: '' },
      { title: 'Producto 2', image: '' },
      { title: 'Producto 3', image: '' },
      { title: 'Producto 4', image: '' },
    ],
  },
  'products:price-table': {
    title: 'Menú / Carta',
    subtitle: 'Nuestras opciones y precios',
    items: [
      { title: 'Opción 1', description: 'Descripción breve.', price: '$0.00' },
      { title: 'Opción 2', description: 'Descripción breve.', price: '$0.00' },
      { title: 'Opción 3', description: 'Descripción breve.', price: '$0.00' },
    ],
  },
  'products:bento-grid': {
    title: 'Productos',
    subtitle: 'Descubre nuestras categorías',
    items: [
      { title: 'Categoría Principal', description: 'Nuestra línea más popular.' },
      { title: 'Novedades', description: 'Lo más reciente.' },
      { title: 'Ofertas', description: 'Precios especiales.' },
    ],
  },

  // ── Gallery ──────────────────────────────────────
  'gallery:masonry': {
    title: 'Galería',
    subtitle: 'Nuestro trabajo habla por sí solo',
    items: [
      { title: 'Proyecto 1', image: '' },
      { title: 'Proyecto 2', image: '' },
      { title: 'Proyecto 3', image: '' },
      { title: 'Proyecto 4', image: '' },
      { title: 'Proyecto 5', image: '' },
      { title: 'Proyecto 6', image: '' },
    ],
  },
  'gallery:grid-uniform': {
    title: 'Galería',
    subtitle: 'Explora nuestro portafolio',
    items: [
      { title: 'Imagen 1', image: '' },
      { title: 'Imagen 2', image: '' },
      { title: 'Imagen 3', image: '' },
      { title: 'Imagen 4', image: '' },
      { title: 'Imagen 5', image: '' },
      { title: 'Imagen 6', image: '' },
    ],
  },
  'gallery:slider': {
    title: 'Galería',
    subtitle: 'Desliza para explorar',
    items: [
      { title: 'Imagen 1', image: '' },
      { title: 'Imagen 2', image: '' },
      { title: 'Imagen 3', image: '' },
      { title: 'Imagen 4', image: '' },
    ],
  },

  // ── Testimonials ─────────────────────────────────
  'testimonials:cards-grid': {
    title: 'Lo que dicen nuestros clientes',
    items: [
      { name: 'María García', role: 'CEO, Empresa ABC', content: 'Un servicio excepcional. Superaron todas nuestras expectativas.', rating: 5 },
      { name: 'Carlos López', role: 'Director, Startup XYZ', content: 'Profesionalismo y calidad en cada detalle. Totalmente recomendados.', rating: 5 },
      { name: 'Ana Martínez', role: 'Fundadora, Marca 123', content: 'Transformaron nuestra visión en realidad. Estamos encantados con los resultados.', rating: 5 },
    ],
  },
  'testimonials:carousel': {
    title: 'Testimonios',
    items: [
      { name: 'María García', role: 'CEO, Empresa ABC', content: 'Un servicio excepcional que transformó nuestro negocio. No podríamos estar más satisfechos.', rating: 5 },
      { name: 'Carlos López', role: 'Director, Startup XYZ', content: 'Profesionalismo y dedicación en cada paso del proyecto. Los resultados hablan por sí solos.', rating: 5 },
    ],
  },
  'testimonials:single-highlight': {
    title: 'Testimonios',
    items: [
      { name: 'María García', role: 'CEO, Empresa ABC', content: 'Trabajar con este equipo ha sido una de las mejores decisiones para nuestro negocio. Su profesionalismo, creatividad y compromiso son incomparables.', rating: 5 },
    ],
  },

  // ── FAQ ──────────────────────────────────────────
  'faq:classic': {
    title: 'Preguntas Frecuentes',
    items: [
      { question: '¿Cuáles son sus horarios de atención?', answer: 'Atendemos de lunes a viernes de 9:00 a 18:00 hrs. También puedes contactarnos por correo electrónico en cualquier momento.' },
      { question: '¿Ofrecen garantía en sus servicios?', answer: 'Sí, todos nuestros servicios incluyen garantía de satisfacción. Trabajamos hasta que estés completamente satisfecho con los resultados.' },
      { question: '¿Cómo puedo solicitar una cotización?', answer: 'Puedes solicitar una cotización a través de nuestro formulario de contacto o llamándonos directamente. Respondemos en menos de 24 horas.' },
    ],
  },
  'faq:side-by-side': {
    title: 'Preguntas Frecuentes',
    items: [
      { question: '¿Cuáles son sus horarios?', answer: 'Lunes a viernes de 9:00 a 18:00 hrs.' },
      { question: '¿Ofrecen garantía?', answer: 'Sí, garantía de satisfacción en todos nuestros servicios.' },
      { question: '¿Cómo cotizar?', answer: 'Contáctanos por formulario, email o teléfono.' },
    ],
  },
  'faq:cards': {
    title: 'Preguntas Frecuentes',
    items: [
      { question: '¿Cuáles son sus horarios de atención?', answer: 'Lunes a viernes de 9:00 a 18:00 hrs.' },
      { question: '¿Ofrecen garantía?', answer: 'Sí, garantía de satisfacción en todos nuestros servicios.' },
      { question: '¿Cómo solicitar cotización?', answer: 'A través de nuestro formulario de contacto.' },
      { question: '¿Hacen envíos?', answer: 'Sí, realizamos envíos a todo el país.' },
    ],
  },

  // ── Pricing ──────────────────────────────────────
  'pricing:cards': {
    title: 'Planes y Precios',
    subtitle: 'Elige el plan perfecto para ti',
    items: [
      { title: 'Básico', price: '$99/mes', description: 'Ideal para empezar', features: ['Característica 1', 'Característica 2', 'Soporte por email'] },
      { title: 'Profesional', price: '$199/mes', description: 'Para negocios en crecimiento', features: ['Todo de Básico', 'Característica premium', 'Soporte prioritario'], featured: true },
      { title: 'Empresarial', price: 'Contactar', description: 'Soluciones a medida', features: ['Todo de Profesional', 'Personalización total', 'Gerente dedicado'] },
    ],
  },
  'pricing:comparison-table': {
    title: 'Compara nuestros planes',
    subtitle: 'Encuentra el que mejor se adapte a tus necesidades',
    items: [
      { title: 'Básico', price: '$99/mes', features: ['5 usuarios', '10 GB', 'Soporte email'] },
      { title: 'Pro', price: '$199/mes', features: ['25 usuarios', '100 GB', 'Soporte 24/7'], featured: true },
      { title: 'Enterprise', price: 'Contactar', features: ['Ilimitado', '1 TB', 'Soporte dedicado'] },
    ],
  },
  'pricing:minimal-list': {
    title: 'Precios',
    subtitle: 'Transparentes y competitivos',
    items: [
      { title: 'Consultoría inicial', price: 'Gratis' },
      { title: 'Plan mensual', price: '$99/mes' },
      { title: 'Plan anual', price: '$899/año' },
    ],
  },

  // ── Contact ──────────────────────────────────────
  'contact:cards-grid': {
    title: 'Contacto',
    subtitle: 'Estamos aquí para ayudarte',
    phone: '+52 (555) 000-0000',
    email: 'info@tuempresa.com',
    address: 'Tu dirección aquí',
    hours: 'Lunes a Viernes, 9:00 - 18:00',
  },
  'contact:split-form': {
    title: 'Contáctanos',
    subtitle: 'Envíanos un mensaje y te responderemos a la brevedad',
    phone: '+52 (555) 000-0000',
    email: 'info@tuempresa.com',
    address: 'Tu dirección aquí',
  },
  'contact:centered-minimal': {
    title: 'Hablemos',
    subtitle: '¿Tienes un proyecto en mente? Nos encantaría escucharte.',
    phone: '+52 (555) 000-0000',
    email: 'info@tuempresa.com',
  },

  // ── Team ─────────────────────────────────────────
  'team:default': {
    title: 'Nuestro Equipo',
    subtitle: 'Conoce a las personas detrás de nuestro éxito',
    items: [
      { name: 'Juan Pérez', role: 'Director General', image: '' },
      { name: 'María García', role: 'Directora Creativa', image: '' },
      { name: 'Carlos López', role: 'Director de Tecnología', image: '' },
    ],
  },

  // ── Blog ─────────────────────────────────────────
  'blog:default': {
    title: 'Blog',
    subtitle: 'Últimas noticias y artículos',
    items: [
      { title: 'Artículo de ejemplo', excerpt: 'Una breve descripción del contenido de este artículo.', date: '2024-01-15' },
      { title: 'Segundo artículo', excerpt: 'Otro artículo interesante para tus lectores.', date: '2024-01-10' },
    ],
  },
};

/**
 * Obtener el contenido por defecto para una sección sin variante específica.
 * Usa la primera variante disponible.
 */
export function getDefaultContent(sectionId: string): Record<string, unknown> | null {
  // Buscar cualquier template que empiece con este sectionId
  const prefix = `${sectionId}:`;
  const key = Object.keys(SECTION_TEMPLATES).find(k => k.startsWith(prefix));
  return key ? { ...SECTION_TEMPLATES[key] } : null;
}

/**
 * Obtener el contenido para una sección + variante específica.
 */
export function getTemplateContent(sectionId: string, variant: string): Record<string, unknown> | null {
  const key = `${sectionId}:${variant}`;
  return SECTION_TEMPLATES[key] ? { ...SECTION_TEMPLATES[key] } : null;
}
