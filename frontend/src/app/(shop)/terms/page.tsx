// src/app/(shop)/terms/page.tsx

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata = {
  title: 'Términos y Condiciones',
  description: 'Términos, privacidad y responsabilidad del sitio web',
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container py-12 max-w-4xl">
          <h1 className="text-4xl font-bold mb-8">Términos y Condiciones</h1>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-justify">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Protección de datos</h2>
              <p className="text-muted-foreground leading-relaxed">
                Todos los datos de carácter personal que sean facilitados por el Usuario a través
                del envío de un correo electrónico serán tratados con estricta confidencialidad de
                acuerdo con la Ley Orgánica 15/1999, de 13 de diciembre, de Protección de Datos de
                carácter personal. De modo expreso, el Usuario queda informado de que los mismos
                serán incorporados a ficheros existentes en GERDY EMILIEE CASTAÑEDA MENDOZA y que
                tiene derecho de acceso, rectificación, cancelación y oposición del mismo, pudiendo
                ejercitar tales derechos enviando por escrito una solicitud a la dirección de
                RUSLAN VIZAEV DUBILEVSKIY, en la que conste el fichero o ficheros a consultar.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Mediante el envío de un mensaje de correo electrónico por parte del Usuario, el
                remitente presta su consentimiento al tratamiento automatizado de los datos
                incluidos en el mismo. Los datos que se faciliten serán utilizados para fines
                comerciales, siendo sus destinatarios los servicios administrativos, comerciales y
                técnicos de GERDY EMILIEE CASTAÑEDA MENDOZA adoptará las medidas necesarias para
                evitar la alteración, tratamiento, pérdida o acceso no autorizado de los datos de
                carácter personal, teniendo en cuenta el estado de la tecnología, la naturaleza de
                los datos almacenados y los riesgos a que están expuestos, en aras del cumplimiento
                de su obligación de secreto y de su deber de guarda de los mismos.
              </p>
            </section>

            <section>
              <p className="text-muted-foreground leading-relaxed">
                De igual forma, GERDY EMILIEE CASTAÑEDA MENDOZA queda autorizada para enviar al
                Usuario informaciones comerciales y técnicas de sus productos. En el caso de
                comunicaciones comerciales y técnicas enviadas a través de correo electrónico o
                medio equivalente, el Usuario nos presta su consentimiento expreso para el envío de
                publicidad por dicho medio.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Responsabilidad</h2>
              <p className="text-muted-foreground leading-relaxed">
                GERDY EMILIEE CASTAÑEDA MENDOZA no se responsabiliza de la mala utilización que por
                parte de los Usuarios de Internet hagan de los contenidos de la página web, siendo
                el Usuario el único responsable de las infracciones en que pueda incurrir. Del
                mismo modo, rechaza la responsabilidad sobre cualquier información no contenida en
                estas páginas web y, por tanto, no elaborada por GERDY EMILIEE CASTAÑEDA MENDOZA o no
                publicada con su nombre.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                GERDY EMILIEE CASTAÑEDA MENDOZA no será responsable en caso de que existan
                interrupciones del servicio, demoras, errores, mal funcionamiento del mismo y, en
                general, demás inconvenientes que tengan su origen en causas que escapan del control
                de GERDY EMILIEE CASTAÑEDA MENDOZA, y/o debida a una actuación dolosa o culposa del
                Usuario y/o tenga por origen causas de fuerza mayor. Sin perjuicio de lo establecido
                en el artículo 1105 del Código Civil, se entenderán por causas de fuerza mayor,
                además, y a los efectos de las presentes condiciones generales, todos aquellos
                acontecimientos acaecidos fuera del control de GERDY EMILIEE CASTAÑEDA MENDOZA, tales
                como: fallo de terceros, operadores o compañías de servicios, actos de Gobierno,
                falta de acceso a redes de terceros, actos u omisiones de las autoridades públicas,
                aquellos otros producidos como consecuencia de fenómenos naturales, apagones, etc.
                y el ataque de Hackers, o terceros especializados, a la seguridad o integridad del
                sistema informático, siempre que GERDY EMILIEE CASTAÑEDA MENDOZA haya adoptado todas
                las medidas de seguridad existentes de acuerdo con el estado de la técnica.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                En cualquier caso, sea cual fuere su causa, GERDY EMILIEE CASTAÑEDA MENDOZA no
                asumirá responsabilidad alguna ya sea por daños directos o indirectos, daño
                emergente y/o por lucro cesante. GERDY EMILIEE CASTAÑEDA MENDOZA tendrá derecho, sin
                que exista indemnización alguna al Usuario por estos conceptos, a suspender
                temporalmente los servicios y contenidos del Sitio web para efectuar operaciones de
                mantenimiento, mejora o reparación de los mismos.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                GERDY EMILIEE CASTAÑEDA MENDOZA no será responsable de posibles daños y perjuicios
                que se puedan derivar en los equipos de los Usuarios por posibles virus informáticos
                contraídos por el Usuario a causa de su navegación en el Sitio web, o por cualquier
                otro daño derivado de esa navegación.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                GERDY EMILIEE CASTAÑEDA MENDOZA no se hace responsable de la veracidad, falta de
                utilidad o adecuación para un uso específico del presente Sitio web ni de los
                contenidos; de la pérdida de datos o servicios como consecuencia de cualquier
                retraso, falta de entrega, entrega incorrecta de los productos expuestos o
                interrupción del servicio; de la exactitud, calidad o naturaleza de la información
                obtenida a través de sus contenidos.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                En cualquier caso, la información proporcionada en este Sitio web está dirigida a
                complementar y no a reemplazar el asesoramiento que en todo caso debe obtenerse
                directamente de profesionales competentes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Jurisdicción y ley aplicable</h2>
              <p className="text-muted-foreground leading-relaxed">
                Para cualquier controversia relacionada con el presente aviso legal las partes
                aceptan el sometimiento expreso a los juzgados del domicilio fiscal de GERDY
                EMILIEE CASTAÑEDA MENDOZA (España) y la legislación estatal y autonómica
                correspondiente.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
