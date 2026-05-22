import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Industrias — NERBIS',
  description:
    'NERBIS genera sitios optimizados para tu industria: belleza, fitness, gastronomia, retail, salud, educacion y mas.',
};

const industries = [
  {
    name: 'Belleza y Bienestar',
    description:
      'Salones, spas, barberias. Reservas online, galeria de trabajos y resenas de clientes.',
    examples: 'Salones de belleza, Spas, Barberias, Esteticas',
  },
  {
    name: 'Fitness',
    description:
      'Gimnasios, entrenadores, estudios. Horarios de clases, membresias y seguimiento de alumnos.',
    examples: 'Gimnasios, CrossFit, Yoga, Personal trainers',
  },
  {
    name: 'Gastronomia',
    description:
      'Restaurantes, cafeterias, dark kitchens. Menu digital, pedidos online y reservaciones.',
    examples: 'Restaurantes, Cafeterias, Panaderias, Catering',
  },
  {
    name: 'Moda y Retail',
    description:
      'Tiendas de ropa, accesorios, calzado. Catalogo con tallas, colores y carrito de compras.',
    examples: 'Boutiques, Tiendas de ropa, Accesorios, Calzado',
  },
  {
    name: 'Salud',
    description:
      'Consultorios, clinicas, terapeutas. Agenda de citas, perfiles de especialistas y telemedicina.',
    examples: 'Consultorios, Clinicas, Dentistas, Psicologos',
  },
  {
    name: 'Educacion',
    description:
      'Academias, tutores, cursos online. Inscripciones, calendario y contenido educativo.',
    examples: 'Academias, Tutores, Cursos online, Idiomas',
  },
  {
    name: 'Servicios Profesionales',
    description:
      'Abogados, contadores, consultores. Portafolio de servicios, cotizaciones y agenda.',
    examples: 'Abogados, Contadores, Consultores, Arquitectos',
  },
  {
    name: 'Fotografia y Creativos',
    description:
      'Fotografos, disenadores, artistas. Portfolio visual, paquetes de precios y reservas de sesion.',
    examples: 'Fotografos, Disenadores, Videografos, Artistas',
  },
  {
    name: 'Inmobiliaria',
    description:
      'Agentes, desarrolladoras, corredores. Listado de propiedades, tours virtuales y contacto directo.',
    examples: 'Agentes inmobiliarios, Desarrolladoras, Corredores',
  },
  {
    name: 'Automotriz',
    description:
      'Talleres, concesionarios, autopartes. Catalogo de servicios, citas y seguimiento de vehiculos.',
    examples: 'Talleres, Concesionarios, Autopartes, Car wash',
  },
  {
    name: 'Veterinaria y Mascotas',
    description:
      'Veterinarias, pet shops, paseadores. Fichas de pacientes, tienda de productos y citas.',
    examples: 'Veterinarias, Pet shops, Grooming, Paseadores',
  },
  {
    name: 'Turismo y Hospitalidad',
    description:
      'Hoteles, tours, agencias de viaje. Reservas, paquetes turisticos y galerias de destinos.',
    examples: 'Hoteles, Tours, Agencias de viaje, Hostales',
  },
];

export default function IndustriasPage() {
  return (
    <>
      {/* Hero */}
      <section className="px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-32">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="nerbis-display text-4xl text-foreground sm:text-5xl lg:text-6xl">
            Hecho para{' '}
            <span className="text-primary">tu industria</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Pipe conoce las mejores practicas de cada vertical. Genera sitios
            con la estructura, contenido y diseno optimo para tu tipo de
            negocio.
          </p>
        </div>
      </section>

      {/* Industries grid */}
      <section className="border-t border-border px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {industries.map((ind) => (
              <div
                key={ind.name}
                className="group rounded-2xl border border-border bg-background p-6 transition-colors hover:border-primary/30"
              >
                <h3 className="text-lg font-semibold text-foreground">
                  {ind.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {ind.description}
                </p>
                <p className="mt-3 text-xs text-muted-foreground/70">
                  {ind.examples}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-muted/30 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="nerbis-display text-3xl text-foreground sm:text-4xl">
            No ves tu industria?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Pipe se adapta a cualquier tipo de negocio. Cuentale tu idea y el
            genera el sitio perfecto.
          </p>
          <Link
            href="/register"
            className="group mt-8 inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-base font-medium text-white transition-all hover:opacity-90"
            style={{
              background:
                'linear-gradient(135deg, var(--primitive-navy-700) 0%, var(--primitive-brand-600) 100%)',
            }}
          >
            Crear mi tienda gratis
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform group-hover:translate-x-0.5"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>
    </>
  );
}
