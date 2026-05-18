'use client';

const industries = [
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
];

export function Industries() {
  return (
    <section id="industries" className="bg-zinc-950 px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="anim-fade-up text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Verticales
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Hecho para tu industria.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
            Cada sitio se genera con el contenido, estructura y diseno optimo para tu tipo de negocio.
          </p>
        </div>

        <div className="anim-fade-up stagger mt-12 flex flex-wrap justify-center gap-2.5">
          {industries.map((industry) => (
            <div
              key={industry.name}
              className="group flex items-center gap-2.5 rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 text-sm transition-all hover:border-zinc-600 hover:bg-zinc-800/80"
            >
              <span className="text-base" role="img" aria-label={industry.name}>
                {industry.emoji}
              </span>
              <span className="text-zinc-400 transition-colors group-hover:text-white">
                {industry.name}
              </span>
            </div>
          ))}
          <div className="flex items-center rounded-full border border-dashed border-zinc-700 px-4 py-2.5 text-sm text-zinc-600">
            +7 mas
          </div>
        </div>
      </div>
    </section>
  );
}
