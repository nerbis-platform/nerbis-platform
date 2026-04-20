// src/app/(platform)/terms/page.tsx

import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import { getContactEmail } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Términos de Servicio',
  description:
    'Términos y condiciones de uso de la plataforma NERBIS — website builder, e-commerce y reservas',
};

export default function TermsPage() {
  const contactEmail = getContactEmail();

  return (
    <LegalLayout>
      <h1 className="text-4xl font-bold mb-4 text-neutral-900">Términos de Servicio</h1>
      <p className="text-neutral-500 mb-8">
        Última actualización: Abril 2026
      </p>

      <div className="prose prose-neutral max-w-none space-y-10 text-justify">
            {/* ═══════════════════════════════════════════
                PARTE I — TÉRMINOS GENERALES
                Aplican a todos los Usuarios independientemente
                de su ubicación geográfica.
            ═══════════════════════════════════════════ */}

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                Parte I — Términos Generales
              </h2>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Introducción y aceptación</h2>
              <p className="text-neutral-600 leading-relaxed">
                Estos Términos de Servicio (&quot;Términos&quot;) constituyen un acuerdo legal
                vinculante entre usted (&quot;Usuario&quot;, &quot;usted&quot;) y la entidad de
                NERBIS que corresponda según su ubicación geográfica, conforme a la tabla de la
                Sección 2 (&quot;NERBIS&quot;, &quot;nosotros&quot;, &quot;la Plataforma&quot;).
              </p>
              <p className="text-neutral-600 leading-relaxed">
                Al crear una cuenta, acceder o utilizar cualquiera de nuestros servicios, usted
                acepta estos Términos en su totalidad. Si no está de acuerdo, no debe utilizar la
                Plataforma.
              </p>
              <p className="text-neutral-600 leading-relaxed">
                Para utilizar NERBIS, usted debe tener al menos 18 años de edad o la mayoría de
                edad legal en su jurisdicción, y contar con la capacidad legal para celebrar
                contratos vinculantes. Estos Términos están sujetos a las modificaciones regionales
                de la Parte II, que prevalecen en caso de conflicto.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                2. Entidad contratante y jurisdicción
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                La entidad de NERBIS con la que usted contrata, la ley aplicable y la jurisdicción
                competente dependen del país asociado a su cuenta:
              </p>

              <div className="overflow-x-auto mt-4">
                <table className="min-w-full text-sm text-neutral-600 border">
                  <thead>
                    <tr className="bg-neutral-100">
                      <th className="border px-4 py-2 text-left font-semibold">País del Usuario</th>
                      <th className="border px-4 py-2 text-left font-semibold">Entidad contratante</th>
                      <th className="border px-4 py-2 text-left font-semibold">Ley aplicable</th>
                      <th className="border px-4 py-2 text-left font-semibold">Jurisdicción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border px-4 py-2">Colombia</td>
                      <td className="border px-4 py-2">NERBIS SAS (Bogotá)</td>
                      <td className="border px-4 py-2">Leyes de Colombia</td>
                      <td className="border px-4 py-2">Bogotá, Colombia</td>
                    </tr>
                    <tr>
                      <td className="border px-4 py-2">España / Unión Europea</td>
                      <td className="border px-4 py-2">NERBIS SAS (Bogotá)</td>
                      <td className="border px-4 py-2">Leyes de Colombia</td>
                      <td className="border px-4 py-2">
                        Domicilio del consumidor (Reglamento UE 1215/2012)
                      </td>
                    </tr>
                    <tr>
                      <td className="border px-4 py-2">Resto del mundo</td>
                      <td className="border px-4 py-2">NERBIS SAS (Bogotá)</td>
                      <td className="border px-4 py-2">Leyes de Colombia</td>
                      <td className="border px-4 py-2">Bogotá, Colombia</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-neutral-600 leading-relaxed mt-4">
                Independientemente de la ley aplicable indicada, prevalecerán las normas imperativas
                de protección al consumidor y protección de datos personales del país de residencia
                del Usuario cuando resulten más favorables. La jurisdicción competente no limita su
                derecho a presentar reclamaciones ante las autoridades de protección al consumidor
                de su país.
              </p>
              <p className="text-neutral-600 leading-relaxed">
                <strong>Datos de identificación:</strong> NERBIS SAS, con domicilio en Bogotá,
                Colombia. Correo electrónico:{' '}
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-blue-600 hover:underline"
                >
                  {contactEmail}
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Definiciones</h2>
              <ul className="list-disc list-inside text-neutral-600 space-y-2">
                <li>
                  <strong>Plataforma:</strong> el software, infraestructura y servicios
                  proporcionados por NERBIS, incluyendo el panel de administración, API, sitios web
                  generados y aplicaciones asociadas.
                </li>
                <li>
                  <strong>Servicios:</strong> las funcionalidades ofrecidas a través de la
                  Plataforma, incluyendo el constructor de sitios web, tienda en línea
                  (e-commerce), sistema de reservas y citas, y funcionalidades de inteligencia
                  artificial.
                </li>
                <li>
                  <strong>Usuario:</strong> toda persona natural o jurídica que crea una cuenta y
                  utiliza los Servicios para operar su negocio digital.
                </li>
                <li>
                  <strong>Cliente Final:</strong> toda persona que visita, compra productos o
                  reserva servicios en un sitio web operado por un Usuario a través de la
                  Plataforma.
                </li>
                <li>
                  <strong>Contenido del Usuario:</strong> textos, imágenes, productos, precios,
                  logotipos, datos y cualquier otro material que el Usuario publique o cargue en la
                  Plataforma.
                </li>
                <li>
                  <strong>Tenant:</strong> la instancia aislada asignada a cada Usuario, con su
                  propio subdominio, datos y configuración independiente.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Descripción de los Servicios</h2>
              <p className="text-neutral-600 leading-relaxed">
                NERBIS es una plataforma de software como servicio (SaaS) que permite a los
                Usuarios crear y gestionar su presencia digital. Los Servicios incluyen:
              </p>
              <ul className="list-disc list-inside text-neutral-600 space-y-2">
                <li>
                  <strong>Constructor de sitios web:</strong> herramientas para diseñar y publicar
                  sitios web profesionales, con posibilidad de generación asistida por inteligencia
                  artificial.
                </li>
                <li>
                  <strong>Tienda en línea (e-commerce):</strong> funcionalidades para vender
                  productos y servicios, gestionar inventario, procesar pagos y administrar envíos.
                </li>
                <li>
                  <strong>Sistema de reservas y citas:</strong> herramientas para que los Usuarios
                  gestionen la disponibilidad, agendamiento y administración de citas con sus
                  Clientes Finales.
                </li>
                <li>
                  <strong>Funcionalidades de IA:</strong> generación de contenido, asistencia en el
                  diseño y herramientas inteligentes para optimizar la operación del negocio
                  digital.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                5. Naturaleza de la Plataforma — NERBIS no es un marketplace
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                NERBIS es un facilitador tecnológico. El contrato de compraventa, prestación de
                servicios o reserva de citas se celebra directa y exclusivamente entre el Usuario y
                su Cliente Final. NERBIS no actúa como vendedor, prestador de servicios, agente,
                intermediario ni representante de ninguna de las partes.
              </p>
              <p className="text-neutral-600 leading-relaxed">
                NERBIS no garantiza, respalda ni asume responsabilidad alguna por los productos,
                servicios, precios, disponibilidad, calidad o cumplimiento de las obligaciones del
                Usuario frente a sus Clientes Finales.
              </p>
            </section>

            {/* ─── CUENTA Y ACCESO ─── */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">
                6. Registro y seguridad de la cuenta
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                Para acceder a los Servicios, usted debe crear una cuenta proporcionando
                información veraz, completa y actualizada. Usted es responsable de:
              </p>
              <ul className="list-disc list-inside text-neutral-600 space-y-2">
                <li>
                  Mantener la confidencialidad de sus credenciales de acceso.
                </li>
                <li>
                  Toda la actividad que ocurra bajo su cuenta.
                </li>
                <li>
                  Notificar a NERBIS de inmediato sobre cualquier uso no autorizado.
                </li>
                <li>
                  Mantener sus datos de contacto actualizados.
                </li>
              </ul>
              <p className="text-neutral-600 leading-relaxed">
                NERBIS se reserva el derecho de suspender o cancelar cuentas que contengan
                información falsa o que incumplan estos Términos, previa notificación al Usuario
                cuando las circunstancias lo permitan.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Planes, tarifas y cancelación</h2>
              <p className="text-neutral-600 leading-relaxed">
                NERBIS ofrece diferentes planes de suscripción. Al suscribirse a un plan de pago:
              </p>
              <ul className="list-disc list-inside text-neutral-600 space-y-2">
                <li>
                  Las suscripciones se renuevan automáticamente. NERBIS le notificará antes de cada
                  renovación indicando el monto y la fecha de cargo.
                </li>
                <li>
                  Usted puede cancelar la renovación automática en cualquier momento, sin
                  penalidad, desde su panel de administración o contactando a soporte. La
                  cancelación será efectiva al final del período vigente.
                </li>
                <li>
                  NERBIS puede modificar las tarifas con un aviso previo de al menos 30 días. Si no
                  está de acuerdo, podrá cancelar sin penalidad antes de que entre en vigor el
                  nuevo precio.
                </li>
                <li>
                  Usted es responsable de los impuestos aplicables según su jurisdicción.
                </li>
              </ul>
              <p className="text-neutral-600 leading-relaxed">
                Las comisiones por transacción, si aplican, serán comunicadas antes de la
                activación del servicio.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                8. Derecho de retracto y desistimiento
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                Al contratar los Servicios por medios electrónicos, usted puede tener derecho a
                retractarse sin indicar motivo y sin penalidad, dentro del plazo que establezca la
                legislación de protección al consumidor de su jurisdicción. Los plazos específicos
                para cada región se detallan en la Parte II de estos Términos.
              </p>
              <p className="text-neutral-600 leading-relaxed">
                Para ejercer este derecho, envíe su solicitud a{' '}
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-blue-600 hover:underline"
                >
                  {contactEmail}
                </a>{' '}
                o utilice el mecanismo disponible en su panel de administración. NERBIS procesará el
                reembolso dentro de los 30 días calendario siguientes, utilizando el mismo medio de
                pago empleado en la transacción original.
              </p>
            </section>

            {/* ─── LICENCIA Y USO ─── */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Licencia de uso</h2>
              <p className="text-neutral-600 leading-relaxed">
                Sujeto a estos Términos, NERBIS le otorga una licencia limitada, no exclusiva, no
                transferible, no sublicenciable y revocable para acceder y utilizar los Servicios
                con el propósito de operar su negocio digital. Esta licencia no le otorga ningún
                derecho de propiedad sobre la Plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Uso aceptable</h2>
              <p className="text-neutral-600 leading-relaxed">
                Queda expresamente prohibido:
              </p>
              <ul className="list-disc list-inside text-neutral-600 space-y-2">
                <li>Utilizar la Plataforma para actividades ilegales o fraudulentas.</li>
                <li>Publicar o vender productos o servicios prohibidos por ley.</li>
                <li>Enviar spam, malware o contenido malicioso.</li>
                <li>Intentar acceder a datos o infraestructura de otros tenants.</li>
                <li>Realizar ingeniería inversa o extraer el código fuente.</li>
                <li>Sobrecargar intencionalmente la infraestructura.</li>
                <li>Revender o redistribuir el acceso sin autorización.</li>
                <li>Publicar contenido que promueva odio, discriminación o violencia.</li>
              </ul>
              <p className="text-neutral-600 leading-relaxed">
                NERBIS puede suspender el acceso a Usuarios que incumplan esta política, previa
                notificación cuando las circunstancias lo permitan.
              </p>
            </section>

            {/* ─── CONTENIDO E IP ─── */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Contenido del Usuario</h2>
              <p className="text-neutral-600 leading-relaxed">
                Usted conserva todos los derechos de propiedad intelectual sobre su contenido. Al
                cargarlo, otorga a NERBIS una licencia no exclusiva, mundial, libre de regalías y
                sublicenciable para almacenar, procesar y mostrar dicho contenido como parte de la
                prestación de los Servicios, y para utilizar capturas de su sitio web con fines
                promocionales. Puede solicitar la exclusión del uso promocional escribiendo a{' '}
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-blue-600 hover:underline"
                >
                  {contactEmail}
                </a>
                .
              </p>
              <p className="text-neutral-600 leading-relaxed">
                Esta licencia se extinguirá tras la eliminación del contenido, salvo para copias de
                seguridad razonables. Usted declara y garantiza que tiene los derechos necesarios
                sobre el contenido que publica.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                12. Propiedad intelectual de NERBIS
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                La Plataforma, su código fuente, diseños, plantillas, logotipos, marcas, API y
                tecnología subyacente son propiedad exclusiva de NERBIS o de sus licenciantes.
                Queda prohibido copiar, modificar, crear obras derivadas, realizar ingeniería
                inversa o redistribuir componentes de la Plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">13. Feedback</h2>
              <p className="text-neutral-600 leading-relaxed">
                Todo comentario, idea o sugerencia que envíe sobre los Servicios se licencia a
                NERBIS de forma perpetua, irrevocable, mundial, libre de regalías y sublicenciable
                para usar, modificar e incorporar en los Servicios sin compensación ni atribución.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                14. Derechos de autor e infracciones
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                Si considera que contenido en la Plataforma infringe sus derechos de autor, envíe
                una notificación a{' '}
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-blue-600 hover:underline"
                >
                  {contactEmail}
                </a>{' '}
                con: (a) identificación de la obra infringida, (b) URL del contenido infractor, (c)
                sus datos de contacto, y (d) declaración de buena fe. NERBIS podrá eliminar el
                contenido y, en caso de reincidencia, terminar la cuenta responsable.
              </p>
            </section>

            {/* ─── E-COMMERCE ─── */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">15. Servicios de e-commerce</h2>
              <p className="text-neutral-600 leading-relaxed">
                Al utilizar la tienda en línea, usted actúa como vendedor registrado. Es el único
                responsable de:
              </p>
              <ul className="list-disc list-inside text-neutral-600 space-y-2">
                <li>La veracidad de descripciones, precios e imágenes de productos.</li>
                <li>
                  El cumplimiento de las leyes de protección al consumidor, incluyendo garantías
                  legales, derecho de retracto y deber de información precontractual.
                </li>
                <li>La gestión de envíos, devoluciones, reembolsos y garantías.</li>
                <li>La atención al cliente y resolución de disputas con Clientes Finales.</li>
                <li>Las obligaciones fiscales y tributarias correspondientes.</li>
                <li>
                  Publicar en su sitio su información de identificación (razón social, documento
                  tributario, domicilio, datos de contacto) conforme a las leyes de comercio
                  electrónico de su jurisdicción.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">16. Procesamiento de pagos</h2>
              <p className="text-neutral-600 leading-relaxed">
                NERBIS integra pasarelas de pago de terceros (Stripe, MercadoPago, entre otros).
                NERBIS no es un procesador de pagos ni una entidad financiera. El procesamiento
                está sujeto a los términos de cada proveedor. NERBIS no es responsable por errores,
                retrasos o disputas de pago entre el Usuario, el procesador y los Clientes Finales.
              </p>
            </section>

            {/* ─── RESERVAS ─── */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">
                17. Servicios de reservas y citas
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                Al utilizar el sistema de reservas, usted es responsable de configurar su
                disponibilidad, horarios, políticas de cancelación y no-shows, y garantizar que sus
                servicios cumplen con las regulaciones profesionales de su jurisdicción. NERBIS
                facilita la tecnología pero no garantiza la asistencia de los Clientes Finales ni
                el cumplimiento de citas.
              </p>
            </section>

            {/* ─── MULTI-TENANCY ─── */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">
                18. Subdominios, dominios y aislamiento de datos
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                Cada cuenta opera como un tenant aislado con un subdominio único. Los datos de cada
                Usuario están lógicamente separados y no son accesibles por otros Usuarios. NERBIS
                no comparte datos entre tenants, salvo datos agregados y anonimizados. Cualquier
                intento de acceder a datos de otro tenant constituye una violación grave de estos
                Términos. Al terminar la cuenta, el subdominio y dominio dejarán de funcionar.
              </p>
            </section>

            {/* ─── IA ─── */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">
                19. Funcionalidades de inteligencia artificial
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                NERBIS ofrece funcionalidades de IA (generación de sitios, sugerencias de
                contenido, asistencia inteligente). Al utilizarlas:
              </p>
              <ul className="list-disc list-inside text-neutral-600 space-y-2">
                <li>
                  El contenido generado es un punto de partida. Usted es responsable de revisar,
                  editar y aprobar todo contenido antes de publicarlo.
                </li>
                <li>
                  NERBIS no garantiza la precisión, originalidad ni adecuación legal del contenido
                  generado.
                </li>
                <li>
                  Usted es responsable final del contenido publicado, sea generado por IA o
                  manualmente.
                </li>
                <li>
                  Las funcionalidades de IA pueden usar datos anonimizados y agregados para mejorar
                  el servicio. No se utilizarán datos personales identificables para entrenar
                  modelos sin su consentimiento previo y expreso.
                </li>
              </ul>
              <p className="text-neutral-600 leading-relaxed">
                Las herramientas de IA, incluyendo asistentes conversacionales, tienen carácter
                informativo y no constituyen asesoría profesional de ningún tipo.
              </p>
            </section>

            {/* ─── DATOS Y PRIVACIDAD ─── */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">
                20. Privacidad y protección de datos
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                El tratamiento de datos personales se rige por nuestra{' '}
                <a href="/privacy" className="text-blue-600 hover:underline">
                  Política de Privacidad
                </a>
                , que forma parte integral de estos Términos. NERBIS cumple con la normativa de
                protección de datos aplicable en las jurisdicciones donde opera.
              </p>
              <p className="text-neutral-600 leading-relaxed">
                <strong>Rol de NERBIS como encargado del tratamiento:</strong> respecto a los datos
                de Clientes Finales que el Usuario recopila, NERBIS actúa como encargado del
                tratamiento (data processor) y procesará dichos datos únicamente para la prestación
                de los Servicios. Los términos específicos se rigen por el Acuerdo de Procesamiento
                de Datos (DPA) disponible bajo solicitud.
              </p>
              <p className="text-neutral-600 leading-relaxed">
                Como operador de su propio sitio, usted es responsable de:
              </p>
              <ul className="list-disc list-inside text-neutral-600 space-y-2">
                <li>
                  Publicar una política de privacidad que cumpla con la legislación aplicable en su
                  jurisdicción.
                </li>
                <li>
                  Obtener la autorización previa, expresa e informada de sus Clientes Finales para
                  el tratamiento de sus datos.
                </li>
                <li>
                  Gestionar las solicitudes de derechos de los titulares (acceso, rectificación,
                  supresión, portabilidad, oposición) conforme a la ley aplicable.
                </li>
                <li>
                  Cumplir con las obligaciones de registro de bases de datos cuando su jurisdicción
                  lo exija.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">21. Datos del sistema</h2>
              <p className="text-neutral-600 leading-relaxed">
                NERBIS recopila datos del sistema (logs, telemetría, métricas, estadísticas de uso
                agregadas) que son propiedad de NERBIS y se utilizan para operar, mejorar los
                Servicios y detectar fraude. Estos datos se tratan en forma agregada y anonimizada
                y no incluyen datos personales identificables.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                22. Transferencias internacionales de datos
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                Los Servicios pueden implicar la transferencia de datos a servidores ubicados fuera
                de su país de residencia. NERBIS garantiza que dichas transferencias se realizan con
                las garantías adecuadas exigidas por la legislación aplicable, incluyendo cláusulas
                contractuales tipo, decisiones de adecuación o consentimiento expreso del titular
                cuando corresponda.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">23. Seguridad</h2>
              <p className="text-neutral-600 leading-relaxed">
                NERBIS implementa medidas técnicas y organizativas razonables (cifrado en tránsito
                y en reposo, controles de acceso, monitoreo). En caso de una brecha que afecte
                datos personales, NERBIS notificará a los Usuarios afectados y a las autoridades
                competentes dentro de los plazos legales. Los datos de pago son procesados por
                pasarelas certificadas (PCI DSS) y no se almacenan en la infraestructura de
                NERBIS.
              </p>
            </section>

            {/* ─── TERCEROS ─── */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">
                24. Servicios e integraciones de terceros
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                La Plataforma puede integrarse con servicios de terceros (pasarelas de pago,
                registradores de dominios, analítica, etc.). El uso de estos servicios está sujeto
                a sus propios términos. NERBIS no es responsable por su disponibilidad, seguridad
                ni conducta. La integración no implica respaldo por parte de NERBIS.
              </p>
            </section>

            {/* ─── PROTECCIONES LEGALES ─── */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">25. Exclusión de garantías</h2>
              <p className="text-neutral-600 leading-relaxed font-medium">
                En la máxima medida permitida por la ley aplicable, los Servicios se proporcionan
                &quot;tal cual&quot; y &quot;según disponibilidad&quot;. NERBIS no otorga garantías
                adicionales a las expresamente establecidas en estos Términos, más allá de las
                garantías legales obligatorias que correspondan según la legislación de su
                jurisdicción.
              </p>
              <p className="text-neutral-600 leading-relaxed">
                NERBIS no garantiza que los Servicios serán ininterrumpidos, libres de errores ni
                que producirán resultados comerciales específicos.
              </p>
              <p className="text-neutral-600 leading-relaxed">
                Nada en estos Términos excluye ni limita la responsabilidad de NERBIS por dolo,
                negligencia grave, lesiones personales o fallecimiento, ni ningún otro supuesto que
                la legislación aplicable no permita excluir o limitar. Los derechos del consumidor
                conforme a la legislación imperativa de su jurisdicción prevalecen sobre esta
                cláusula.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                26. Limitación de responsabilidad
              </h2>
              <p className="text-neutral-600 leading-relaxed font-medium">
                En la máxima medida permitida por la ley aplicable y sin perjuicio de los derechos
                irrenunciables del consumidor, NERBIS no será responsable por daños indirectos,
                incidentales, especiales o consecuenciales, incluyendo pérdida de beneficios,
                datos, uso o reputación comercial.
              </p>
              <p className="text-neutral-600 leading-relaxed">
                La responsabilidad total de NERBIS se limitará al mayor de: (a) USD 100 o (b) las
                tarifas pagadas por el Usuario en los 12 meses anteriores al evento. Esta
                limitación no aplica en caso de dolo, negligencia grave ni en los supuestos que la
                legislación imperativa de su jurisdicción no permita limitar.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">27. Indemnización</h2>
              <p className="text-neutral-600 leading-relaxed">
                En la medida permitida por la ley aplicable, usted se compromete a indemnizar a
                NERBIS frente a reclamaciones derivadas de: (a) su uso de los Servicios o
                incumplimiento de estos Términos, (b) su Contenido, (c) disputas con Clientes
                Finales, (d) infracciones de propiedad intelectual, y (e) incumplimiento de leyes
                aplicables.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">28. Confidencialidad</h2>
              <p className="text-neutral-600 leading-relaxed">
                Ambas partes mantendrán la confidencialidad de la información no pública recibida.
                Excepciones: (a) dominio público sin culpa del receptor, (b) recibida de tercero
                sin restricción, (c) desarrollada independientemente, (d) divulgación por orden
                judicial.
              </p>
            </section>

            {/* ─── VIGENCIA Y TERMINACIÓN ─── */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">
                29. Vigencia y terminación
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                <strong>Terminación por el Usuario:</strong> puede cancelar en cualquier momento,
                sin penalidad, desde su panel o contactando a soporte. La cancelación será efectiva
                al final del período de facturación vigente.
              </p>
              <p className="text-neutral-600 leading-relaxed">
                <strong>Terminación por NERBIS:</strong> con 30 días de aviso sin causa, o de forma
                inmediata por violación grave, fraude, riesgo de seguridad o falta de pago
                reiterada (notificando los motivos). En caso de terminación sin causa, se
                reembolsará la parte proporcional no utilizada.
              </p>
              <p className="text-neutral-600 leading-relaxed">
                <strong>Efectos:</strong> (a) desactivación del acceso, (b) sitio web no disponible
                públicamente, (c) datos conservados 30 días para exportación, luego eliminados, (d)
                saldos pendientes vencen inmediatamente.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">30. Supervivencia</h2>
              <p className="text-neutral-600 leading-relaxed">
                Las secciones de propiedad intelectual, limitación de responsabilidad,
                indemnización, confidencialidad y disposiciones generales sobreviven a la
                terminación.
              </p>
            </section>

            {/* ─── GENERAL ─── */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">
                31. Modificaciones a los Términos
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                NERBIS puede modificar estos Términos con al menos 30 días de anticipación por
                correo electrónico y notificación en la Plataforma. Si no está de acuerdo, podrá
                cancelar sin penalidad antes de la entrada en vigor. Las modificaciones sustanciales
                requieren aceptación expresa. Cambios por razones legales o de seguridad podrán
                entrar en vigor inmediatamente.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                32. Resolución de disputas
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                Cualquier controversia se resolverá preferentemente mediante:
              </p>
              <ul className="list-disc list-inside text-neutral-600 space-y-2">
                <li>
                  <strong>Negociación directa</strong> durante 30 días.
                </li>
                <li>
                  <strong>Mediación</strong> si la negociación no resuelve la disputa.
                </li>
                <li>
                  <strong>Jurisdicción</strong> según la tabla de la Sección 2 y las modificaciones
                  de la Parte II. El Usuario consumidor podrá siempre presentar reclamaciones ante
                  las autoridades de protección al consumidor de su país de residencia.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                33. Comunicaciones electrónicas
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                Usted consiente recibir comunicaciones operativas y transaccionales. Las
                comunicaciones comerciales requieren su consentimiento previo y expreso, con opción
                de baja en cada mensaje. Usted es responsable de mantener actualizado su correo
                electrónico.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">34. Disposiciones generales</h2>
              <ul className="list-disc list-inside text-neutral-600 space-y-3">
                <li>
                  <strong>Acuerdo completo:</strong> estos Términos, la Política de Privacidad, la
                  Política de Cookies y el DPA (cuando aplique) constituyen el acuerdo completo.
                </li>
                <li>
                  <strong>Divisibilidad:</strong> si una disposición se considera inválida o
                  abusiva, las restantes continuarán vigentes.
                </li>
                <li>
                  <strong>No renuncia:</strong> no ejercer un derecho no constituye renuncia.
                </li>
                <li>
                  <strong>Cesión:</strong> usted no puede ceder estos Términos sin consentimiento
                  escrito. NERBIS puede cederlos en caso de fusión, adquisición o venta de activos,
                  notificando al Usuario.
                </li>
                <li>
                  <strong>Fuerza mayor:</strong> NERBIS no será responsable por causas fuera de su
                  control razonable.
                </li>
                <li>
                  <strong>Relación entre las partes:</strong> nada crea sociedad, agencia, empleo o
                  franquicia.
                </li>
                <li>
                  <strong>Idioma:</strong> estos Términos se redactan en español. En caso de
                  traducción, prevalece la versión en español.
                </li>
              </ul>
            </section>

            {/* ═══════════════════════════════════════════
                PARTE II — MODIFICACIONES REGIONALES
                Estas secciones complementan y, en caso de
                conflicto, prevalecen sobre la Parte I para
                los Usuarios de cada región.
            ═══════════════════════════════════════════ */}

            <section className="pt-8 border-t-2">
              <h2 className="text-2xl font-semibold mb-4">
                Parte II — Modificaciones Regionales
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                Las siguientes secciones complementan los Términos Generales (Parte I) y
                prevalecen sobre estos en caso de conflicto, según la ubicación del Usuario. Si su
                país no está listado, aplican únicamente los Términos Generales junto con las
                normas imperativas de protección al consumidor de su jurisdicción.
              </p>
            </section>

            {/* ─── COLOMBIA ─── */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">
                35. Colombia
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                Si usted reside en Colombia, se aplican las siguientes modificaciones conforme al
                Estatuto del Consumidor (Ley 1480 de 2011) y la Ley de Habeas Data (Ley 1581 de
                2012):
              </p>
              <ul className="list-disc list-inside text-neutral-600 space-y-2">
                <li>
                  <strong>Derecho de retracto:</strong> usted puede retractarse dentro de los 5
                  días hábiles siguientes a la celebración del contrato (Art. 47, Ley 1480).
                </li>
                <li>
                  <strong>Reversión del pago:</strong> si ha sido objeto de fraude, de una
                  operación no solicitada, o si el servicio no corresponde a lo ofrecido, puede
                  solicitar la reversión del pago dentro de los 5 días hábiles siguientes al
                  conocimiento del hecho (Art. 51, Ley 1480).
                </li>
                <li>
                  <strong>Cláusulas ineficaces:</strong> de conformidad con el Art. 43 de la Ley
                  1480, cualquier cláusula que limite los derechos del consumidor, impida el
                  retracto, o que imponga penalidades por cancelación anticipada, se tendrá por no
                  escrita.
                </li>
                <li>
                  <strong>Protección de datos:</strong> el tratamiento de datos personales requiere
                  autorización previa, expresa e informada del titular. NERBIS mantiene su política
                  de tratamiento de datos conforme a la Ley 1581 de 2012 y el Decreto 1377 de
                  2013.
                </li>
                <li>
                  <strong>Autoridad competente:</strong> la Superintendencia de Industria y Comercio
                  (SIC) es la autoridad de protección al consumidor y de datos personales.
                </li>
              </ul>
            </section>

            {/* ─── ESPAÑA / UE ─── */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">
                36. España y Unión Europea
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                Si usted reside en España o en un Estado miembro de la UE/EEE, se aplican las
                siguientes modificaciones:
              </p>
              <ul className="list-disc list-inside text-neutral-600 space-y-2">
                <li>
                  <strong>Derecho de desistimiento:</strong> usted puede desistir del contrato
                  dentro de los 14 días naturales siguientes a la celebración, sin indicar motivo y
                  sin penalidad (Arts. 102-108, LGDCU / Directiva 2011/83/UE).
                </li>
                <li>
                  <strong>Jurisdicción:</strong> serán competentes los juzgados del domicilio del
                  consumidor (Reglamento UE 1215/2012). Además, puede presentar reclamaciones a
                  través de la plataforma de resolución de litigios en línea de la Comisión Europea
                  (
                  <a
                    href="https://ec.europa.eu/consumers/odr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    ec.europa.eu/consumers/odr
                  </a>
                  ).
                </li>
                <li>
                  <strong>Protección de datos:</strong> NERBIS cumple con el RGPD (Reglamento
                  2016/679) y la LOPDGDD (LO 3/2018). Usted tiene derecho de acceso,
                  rectificación, supresión, limitación, portabilidad y oposición. NERBIS notificará
                  brechas de seguridad en un plazo máximo de 72 horas a la autoridad de control
                  competente.
                </li>
                <li>
                  <strong>Cláusulas abusivas:</strong> cualquier cláusula que sea declarada abusiva
                  conforme a los Arts. 82-91 de la LGDCU será nula de pleno derecho, sin afectar
                  la validez del resto del contrato.
                </li>
                <li>
                  <strong>Información precontractual:</strong> conforme a la LSSI-CE (Ley 34/2002),
                  NERBIS pone a disposición sus datos de identificación, precios con IVA incluido y
                  condiciones del servicio antes de la contratación.
                </li>
              </ul>
            </section>

            {/* ─── MÉXICO ─── */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">
                37. México
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                Si usted reside en México, se aplican las siguientes modificaciones conforme a la
                Ley Federal de Protección al Consumidor (LFPC) y la LFPDPPP:
              </p>
              <ul className="list-disc list-inside text-neutral-600 space-y-2">
                <li>
                  <strong>Renovación automática:</strong> NERBIS le notificará al menos 5 días
                  hábiles antes de cada renovación automática, indicando monto, frecuencia y fecha
                  de cargo. Usted puede cancelar la renovación de forma inmediata y sin penalidad
                  (Art. 76 Bis, LFPC).
                </li>
                <li>
                  <strong>Mecanismo de cancelación:</strong> NERBIS proporciona un mecanismo de
                  cancelación accesible y sencillo, sin obstáculos ni complejidad excesiva.
                </li>
                <li>
                  <strong>Protección de datos:</strong> NERBIS cumple con la LFPDPPP. Se pondrá a
                  disposición el aviso de privacidad en sus modalidades integral, simplificada y
                  corta. Usted tiene derechos ARCO (acceso, rectificación, cancelación, oposición).
                </li>
                <li>
                  <strong>Autoridad competente:</strong> la Procuraduría Federal del Consumidor
                  (PROFECO) es la autoridad de protección al consumidor. El INAI es la autoridad de
                  protección de datos personales.
                </li>
              </ul>
            </section>

            {/* ─── ARGENTINA ─── */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">
                38. Argentina
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                Si usted reside en Argentina, se aplican las siguientes modificaciones conforme a
                la Ley 24.240 de Defensa del Consumidor y el Código Civil y Comercial:
              </p>
              <ul className="list-disc list-inside text-neutral-600 space-y-2">
                <li>
                  <strong>Derecho de revocación:</strong> usted puede revocar la contratación
                  dentro de los 10 días corridos siguientes a la celebración del contrato (Art. 34,
                  Ley 24.240 / Art. 1110, CCyC).
                </li>
                <li>
                  <strong>Botón de arrepentimiento:</strong> NERBIS pone a disposición un enlace
                  visible y accesible para ejercer el derecho de revocación sin necesidad de
                  registro previo ni requisitos adicionales.
                </li>
                <li>
                  <strong>Cláusulas abusivas:</strong> conforme al Art. 37 de la Ley 24.240,
                  cualquier cláusula que desnaturalice las obligaciones de NERBIS, importe renuncia
                  de derechos del consumidor o amplíe los derechos de NERBIS, se tendrá por no
                  escrita.
                </li>
                <li>
                  <strong>Jurisdicción:</strong> serán competentes los juzgados del domicilio del
                  consumidor. No se podrá imponer foro distinto.
                </li>
                <li>
                  <strong>Autoridad competente:</strong> la autoridad de aplicación de la Ley de
                  Defensa del Consumidor de su jurisdicción.
                </li>
              </ul>
            </section>

            {/* ─── CHILE ─── */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">
                39. Chile
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                Si usted reside en Chile, se aplican las siguientes modificaciones conforme a la
                Ley 19.496 sobre Protección de los Derechos de los Consumidores:
              </p>
              <ul className="list-disc list-inside text-neutral-600 space-y-2">
                <li>
                  <strong>Derecho de retracto:</strong> usted puede retractarse dentro de los 10
                  días siguientes a la contratación del servicio (Art. 3 bis, Ley 19.496).
                </li>
                <li>
                  <strong>Protección de datos:</strong> NERBIS cumple con la Ley 19.628 sobre
                  Protección de la Vida Privada. A partir de la entrada en vigencia de la Ley
                  21.719 (diciembre 2026), NERBIS se adecuará a sus disposiciones, incluyendo los
                  derechos de acceso, rectificación, supresión, oposición, portabilidad y bloqueo.
                </li>
                <li>
                  <strong>Autoridad competente:</strong> el Servicio Nacional del Consumidor
                  (SERNAC) es la autoridad de protección al consumidor.
                </li>
              </ul>
            </section>

            {/* ─── CONTACTO ─── */}
            <section className="pt-8 border-t-2">
              <h2 className="text-2xl font-semibold mb-4">40. Contacto</h2>
              <p className="text-neutral-600 leading-relaxed">
                Si tiene preguntas sobre estos Términos de Servicio:
              </p>
              <ul className="list-none text-neutral-600 space-y-1 mt-2">
                <li>
                  <strong>Razón social:</strong> NERBIS SAS
                </li>
                <li>
                  <strong>Domicilio:</strong> Bogotá, Colombia
                </li>
                <li>
                  <strong>Correo electrónico:</strong>{' '}
                  <a
                    href={`mailto:${contactEmail}`}
                    className="text-blue-600 hover:underline"
                  >
                    {contactEmail}
                  </a>
                </li>
              </ul>
            </section>

            <div className="pt-8 border-t">
              <p className="text-sm text-neutral-600">
                Estos Términos de Servicio fueron actualizados por última vez en abril de 2026.
              </p>
              <p className="text-sm text-neutral-600 mt-2">
                Al utilizar NERBIS, usted confirma que ha leído, comprendido y aceptado estos
                Términos, sin perjuicio de los derechos irrenunciables que le correspondan como
                consumidor según la legislación imperativa de su país de residencia.
              </p>
            </div>
      </div>
    </LegalLayout>
  );
}
