// src/app/(tenant)/(shop)/privacy/page.tsx

'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useTenantInfo, useTenantContact, useTenantLegal } from '@/contexts/TenantContext';

export default function PrivacyPage() {
  const tenantInfo = useTenantInfo();
  const contact = useTenantContact();
  const legal = useTenantLegal();

  const responsable = legal?.legal_name || tenantInfo.name;
  const nit = legal?.tax_id || '[NIT pendiente de registro]';
  const direccion = legal?.legal_address || contact?.address || '[Direccion pendiente]';
  const email = contact?.email || '[correo no configurado]';
  const ciudad = contact?.city || 'Colombia';

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container py-12 max-w-4xl">
          <h1 className="text-4xl font-bold mb-8">Politica de Tratamiento de Datos Personales</h1>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-justify">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Responsable del tratamiento</h2>
              <p className="text-muted-foreground leading-relaxed">
                <strong>{responsable}</strong>, identificado con NIT {nit}, con domicilio en{' '}
                {direccion}, {ciudad} (en adelante, &ldquo;el Responsable&rdquo;), es el responsable del
                tratamiento de los datos personales recolectados a traves de este sitio web, de conformidad
                con la Ley 1581 de 2012, el Decreto 1074 de 2015 (Capitulo 25 y 26) y demas normas
                concordantes vigentes en Colombia.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-2">
                Correo de contacto para asuntos de datos personales:{' '}
                <a href={`mailto:${email}`} className="text-primary hover:underline">{email}</a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Finalidades del tratamiento</h2>
              <p className="text-muted-foreground leading-relaxed">
                Los datos personales seran tratados para las siguientes finalidades:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Gestionar la relacion contractual derivada de la compra de productos o la prestacion de servicios.</li>
                <li>Procesar pedidos, pagos, devoluciones y garantias.</li>
                <li>Gestionar reservas y citas de servicios.</li>
                <li>Atender peticiones, quejas, reclamos y sugerencias (PQR).</li>
                <li>Enviar comunicaciones comerciales y promocionales, cuando medie autorizacion expresa del titular.</li>
                <li>Cumplir obligaciones legales, contables y tributarias.</li>
                <li>Mejorar la experiencia del usuario y la calidad de los servicios ofrecidos.</li>
                <li>Prevenir fraudes y garantizar la seguridad de las transacciones.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Datos recolectados</h2>
              <p className="text-muted-foreground leading-relaxed">
                {responsable} podra recolectar los siguientes datos personales:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Datos de identificacion: nombre completo, tipo y numero de documento de identidad.</li>
                <li>Datos de contacto: correo electronico, numero de telefono, direccion.</li>
                <li>Datos de facturacion: direccion de envio, informacion de pago (procesada de forma segura por terceros autorizados).</li>
                <li>Datos de navegacion: direccion IP, tipo de navegador, cookies (consulta nuestra Politica de Cookies).</li>
                <li>Datos de uso del servicio: historial de compras, citas agendadas, preferencias.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-2">
                No se recolectan datos sensibles (origen racial o etnico, orientacion politica, convicciones
                religiosas, datos biometricos, datos de salud) salvo que la naturaleza del servicio lo
                requiera y medie autorizacion expresa y reforzada del titular.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Autorizacion y consentimiento</h2>
              <p className="text-muted-foreground leading-relaxed">
                De conformidad con el articulo 9 de la Ley 1581 de 2012, la recoleccion de datos personales
                requiere la autorizacion previa, expresa e informada del titular. Esta autorizacion se
                obtendra mediante:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Aceptacion expresa al registrarse en el sitio web.</li>
                <li>Aceptacion al completar formularios de contacto o compra.</li>
                <li>Consentimiento separado para comunicaciones comerciales (opcional).</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-2">
                El titular podra revocar su autorizacion en cualquier momento, salvo que exista un deber
                legal o contractual que impida la supresion de los datos.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Derechos del titular</h2>
              <p className="text-muted-foreground leading-relaxed">
                De acuerdo con los articulos 8 y 15 de la Ley 1581 de 2012, el titular de los datos
                personales tiene los siguientes derechos:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><strong>Conocer:</strong> acceder a sus datos personales que hayan sido objeto de tratamiento.</li>
                <li><strong>Actualizar:</strong> solicitar la actualizacion de datos incompletos o inexactos.</li>
                <li><strong>Rectificar:</strong> corregir la informacion que resulte inexacta o incompleta.</li>
                <li><strong>Suprimir:</strong> solicitar la eliminacion de datos cuando no exista obligacion legal de conservarlos.</li>
                <li><strong>Revocar:</strong> revocar la autorizacion otorgada para el tratamiento de datos.</li>
                <li><strong>Oponerse:</strong> oponerse al tratamiento de datos para finalidades no autorizadas.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-2">
                Para ejercer estos derechos, el titular podra enviar su solicitud a{' '}
                <a href={`mailto:${email}`} className="text-primary hover:underline">{email}</a>,
                indicando su nombre completo, numero de identificacion, descripcion de la solicitud y datos
                de contacto. El Responsable atendera la solicitud dentro de los diez (10) dias habiles
                siguientes a su recepcion, conforme al articulo 15 de la Ley 1581 de 2012.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Conservacion de los datos</h2>
              <p className="text-muted-foreground leading-relaxed">
                Los datos personales se conservaran durante el tiempo necesario para cumplir las finalidades
                del tratamiento y, con posterioridad, durante los plazos exigidos por la normativa aplicable
                (obligaciones fiscales, contables o de garantia legal). Una vez cumplidas las finalidades y
                transcurridos los plazos legales, los datos seran suprimidos de forma segura.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Transferencia internacional de datos</h2>
              <p className="text-muted-foreground leading-relaxed">
                Para la prestacion de servicios tecnologicos (alojamiento, procesamiento de pagos, envio
                de comunicaciones), los datos personales podran ser transferidos a paises que cuenten con
                niveles adecuados de proteccion de datos conforme a la evaluacion de la Superintendencia
                de Industria y Comercio (SIC), o en su defecto, mediante contratos que garanticen el
                cumplimiento de la Ley 1581 de 2012. El titular sera informado y debera autorizar dicha
                transferencia.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Seguridad de la informacion</h2>
              <p className="text-muted-foreground leading-relaxed">
                El Responsable ha implementado medidas tecnicas, humanas y administrativas razonables para
                proteger los datos personales contra acceso no autorizado, perdida, alteracion, destruccion
                o uso indebido, conforme al principio de seguridad establecido en el articulo 4, literal g),
                de la Ley 1581 de 2012. Los pagos se procesan a traves de plataformas certificadas PCI DSS
                y en ningun momento se almacenan datos completos de tarjetas de credito en nuestros sistemas.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Menores de edad</h2>
              <p className="text-muted-foreground leading-relaxed">
                Este sitio web no esta dirigido a menores de 18 anos. No se recolectan ni tratan
                intencionalmente datos personales de menores de edad. En caso de que un menor suministre
                datos, estos seran eliminados al ser detectados, conforme al articulo 7 de la Ley 1581 de
                2012. Si eres menor de 18 anos, no debes facilitar datos personales sin la autorizacion de
                tu representante legal.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Autoridad de control</h2>
              <p className="text-muted-foreground leading-relaxed">
                La autoridad competente para la proteccion de datos personales en Colombia es la{' '}
                <strong>Superintendencia de Industria y Comercio (SIC)</strong>.
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-2">
                <li>Direccion: Carrera 13 No. 27-00, pisos 1 al 7, Bogota D.C.</li>
                <li>Telefono: (601) 587 0000</li>
                <li>Linea gratuita: 018000 910165</li>
                <li>
                  Sitio web:{' '}
                  <a
                    href="https://www.sic.gov.co"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    www.sic.gov.co
                  </a>
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-2">
                El titular puede presentar quejas ante la SIC cuando considere que se han vulnerado sus
                derechos, previo tramite de consulta o reclamo ante el Responsable del tratamiento.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Marco legal</h2>
              <p className="text-muted-foreground leading-relaxed">
                Esta politica se rige por las siguientes normas colombianas:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Constitucion Politica de Colombia, articulo 15 (derecho a la intimidad y habeas data).</li>
                <li>Ley 1266 de 2008 (habeas data financiero).</li>
                <li>Ley 1581 de 2012 (Regimen General de Proteccion de Datos Personales).</li>
                <li>Decreto 1074 de 2015, Capitulos 25 y 26 (reglamentacion de la Ley 1581).</li>
                <li>Ley 2300 de 2023 (regulacion de comunicaciones comerciales no deseadas).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Cambios en esta politica</h2>
              <p className="text-muted-foreground leading-relaxed">
                {responsable} se reserva el derecho de modificar esta politica en cualquier momento.
                Los cambios seran informados a traves de este sitio web y, cuando corresponda, mediante
                notificacion directa al titular. Te recomendamos revisarla periodicamente.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">13. Contacto</h2>
              <p className="text-muted-foreground leading-relaxed">
                Para cualquier consulta, solicitud o reclamo relacionado con el tratamiento de datos
                personales, puedes escribir a{' '}
                <a href={`mailto:${email}`} className="text-primary hover:underline">{email}</a>.
              </p>
            </section>

            <p className="text-sm text-muted-foreground pt-8 border-t">
              Ultima actualizacion: Mayo 2026
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
