// ─── Constants ─────────────────────────────────────────────────

export const SUPPORT_EMAIL = 'soporte@nerbis.com';
export const WHATSAPP_NUMBER = '573001234567'; // TODO: reemplazar con número real de NERBIS

// ─── Help categories ──────────────────────────────────────────

export const helpCategories = [
  { emoji: '🚀', title: 'Primeros pasos', categoryKey: 'primeros' },
  { emoji: '🛍️', title: 'Tu tienda online', categoryKey: 'tienda' },
  { emoji: '📅', title: 'Reservas y citas', categoryKey: 'reservas' },
  { emoji: '💳', title: 'Planes y facturación', categoryKey: 'planes' },
  { emoji: '🎨', title: 'Diseño y sitio web', categoryKey: 'diseño' },
  { emoji: '🔐', title: 'Mi cuenta', categoryKey: 'cuenta' },
];

// ─── Platform FAQs ────────────────────────────────────────────

export const platformFaqs = [
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
