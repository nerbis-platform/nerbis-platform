// ─── Conversation script ────────────────────────────────

export type ChatStep = {
  from: 'pipe' | 'user';
  text: string;
  preview?: string; // which preview elements to reveal
  thinking?: string; // text shown while "thinking" before this message
  delay: number; // ms before this message appears
};

export const CONVERSATION: ChatStep[] = [
  {
    from: 'pipe',
    text: '¡Hola! Cuéntame sobre tu negocio y creo tu sitio web en segundos.',
    delay: 400,
  },
  {
    from: 'user',
    text: 'Tengo una tienda de ropa llamada Moda Nerbis. Vendemos ropa urbana para hombres y mujeres.',
    delay: 1400,
  },
  {
    from: 'pipe',
    text: 'Detecté "Moda Nerbis" como marca. Generando nav, hero y paleta de colores...',
    preview: 'nav-hero',
    thinking: 'Analizando nombre y tipo de negocio...',
    delay: 1800,
  },
  {
    from: 'user',
    text: 'Tenemos camisetas, jeans, accesorios y zapatos.',
    delay: 800,
  },
  {
    from: 'pipe',
    text: 'Catálogo creado con 4 categorías y precios sugeridos.',
    preview: 'services',
    thinking: 'Estructurando catálogo de productos...',
    delay: 1600,
  },
  {
    from: 'user',
    text: 'También quiero mostrar fotos de nuestros productos.',
    delay: 1000,
  },
  {
    from: 'pipe',
    text: 'Galería y reseñas de clientes agregadas.',
    preview: 'gallery-reviews',
    thinking: 'Generando galería y social proof...',
    delay: 1400,
  },
  {
    from: 'pipe',
    text: 'Contacto, mapa y redes sociales configurados.',
    preview: 'contact',
    thinking: 'Agregando sección de contacto...',
    delay: 800,
  },
  {
    from: 'pipe',
    text: '¡Tu sitio está listo en modanerbis.nerbis.com!',
    preview: 'publish',
    thinking: 'Publicando sitio...',
    delay: 1200,
  },
];
