// src/app/(tenant)/(shop)/terms/page.tsx

'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useTenantInfo, useTenantContact, useTenantLegal } from '@/contexts/TenantContext';

export default function TermsPage() {
  const tenantInfo = useTenantInfo();
  const contact = useTenantContact();
  const legal = useTenantLegal();

  const responsable = legal?.legal_name || tenantInfo.name;
  const nit = legal?.tax_id || '[NIT pendiente de registro]';
  const direccion = legal?.legal_address || contact?.address || '[Direccion pendiente]';
  const email = contact?.email;
  const telefono = contact?.phone || '[telefono no configurado]';
  const ciudad = contact?.city || 'Colombia';

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container py-12 max-w-4xl">
          <h1 className="text-4xl font-bold mb-8">Terminos y Condiciones</h1>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-left">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Identificacion del proveedor</h2>
              <p className="text-muted-foreground leading-relaxed">
                Este sitio web es operado por <strong>{responsable}</strong>, identificado con
                NIT {nit}, con domicilio en {direccion}, {ciudad}.
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-2">
                <li>Correo electronico: {email ? <a href={`mailto:${email}`} className="text-primary hover:underline">{email}</a> : <span>correo no configurado</span>}</li>
                <li>Telefono: {telefono}</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-2">
                Estos terminos y condiciones regulan el acceso y uso de este sitio web, asi como
                la compra de productos y la contratacion de servicios a traves del mismo, de
                conformidad con la legislacion colombiana vigente.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Aceptacion de los terminos</h2>
              <p className="text-muted-foreground leading-relaxed">
                Al acceder, navegar o utilizar este sitio web, el usuario acepta los presentes
                terminos y condiciones. Si no esta de acuerdo, debera abstenerse de utilizar el
                sitio. La realizacion de un pedido implica la aceptacion integra de estos terminos,
                conforme al articulo 49 de la Ley 1480 de 2011 (Estatuto del Consumidor).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Proceso de compra</h2>
              <p className="text-muted-foreground leading-relaxed">
                El proceso de compra incluye los siguientes pasos:
              </p>
              <ol className="list-decimal list-inside text-muted-foreground space-y-2">
                <li>Seleccion de productos o servicios y adicion al carrito de compras.</li>
                <li>Revision del pedido, cantidades y totales (incluido IVA).</li>
                <li>Registro o inicio de sesion en la plataforma.</li>
                <li>Ingreso de datos de facturacion y envio.</li>
                <li>Seleccion del metodo de pago y confirmacion del pedido.</li>
                <li>Recepcion de confirmacion por correo electronico con el numero de pedido.</li>
              </ol>
              <p className="text-muted-foreground leading-relaxed mt-2">
                Conforme al articulo 49 de la Ley 1480 de 2011, antes de finalizar la compra, el
                consumidor sera informado de forma clara y completa sobre las condiciones generales
                de la transaccion, incluyendo el precio total, las condiciones de entrega y el
                derecho de retracto.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Precios e impuestos</h2>
              <p className="text-muted-foreground leading-relaxed">
                Todos los precios publicados en el sitio web incluyen el Impuesto al Valor Agregado
                (IVA) vigente en Colombia, salvo que se indique lo contrario. Los precios pueden
                variar sin previo aviso, pero los pedidos confirmados se procesaran con el precio
                vigente al momento de la confirmacion.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Derecho de retracto</h2>
              <p className="text-muted-foreground leading-relaxed">
                De conformidad con el articulo 47 de la Ley 1480 de 2011, el consumidor tiene
                derecho a retractarse de la compra dentro de los <strong>cinco (5) dias habiles</strong>{' '}
                siguientes a la entrega del producto o a la celebracion del contrato de servicios,
                siempre que:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>La compra se haya realizado a traves de medios electronicos.</li>
                <li>El producto se devuelva en las mismas condiciones en que fue recibido.</li>
                <li>No se trate de productos perecederos, de uso personal o servicios ya prestados.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-2">
                Para ejercer el derecho de retracto, el consumidor debera comunicarlo a{' '}
                {email ? <a href={`mailto:${email}`} className="text-primary hover:underline">{email}</a> : <span>correo no configurado</span>}{' '}
                dentro del plazo establecido. La devolucion del dinero se realizara en un plazo
                maximo de treinta (30) dias calendario.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Reversion del pago</h2>
              <p className="text-muted-foreground leading-relaxed">
                De conformidad con los articulos 50 y 51 de la Ley 1480 de 2011, el consumidor
                podra solicitar la reversion del pago dentro de los{' '}
                <strong>cinco (5) dias habiles</strong> siguientes a la fecha de la transaccion
                cuando:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>El producto adquirido no corresponda al ofrecido o publicitado.</li>
                <li>El producto llegue defectuoso.</li>
                <li>El producto no sea entregado dentro del plazo estipulado.</li>
                <li>Se haya realizado una transaccion no solicitada o fraudulenta.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-2">
                La solicitud debera presentarse por escrito a{' '}
                {email ? <a href={`mailto:${email}`} className="text-primary hover:underline">{email}</a> : <span>correo no configurado</span>}.
                La entidad financiera tendra un plazo de <strong>quince (15) dias calendario</strong>{' '}
                para realizar la reversion efectiva del pago.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Garantia legal</h2>
              <p className="text-muted-foreground leading-relaxed">
                Todos los productos comercializados gozan de la garantia legal establecida por la
                Ley 1480 de 2011. La garantia legal minima es de un (1) ano para productos nuevos
                y proporcional al precio para productos usados. El consumidor tiene derecho a:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>La reparacion del producto.</li>
                <li>El cambio del producto por uno de las mismas caracteristicas.</li>
                <li>La devolucion total del dinero pagado.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-2">
                Para hacer efectiva la garantia, el consumidor debera presentar la factura o
                comprobante de compra y describir el defecto encontrado.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Peticiones, quejas y reclamos (PQR)</h2>
              <p className="text-muted-foreground leading-relaxed">
                {responsable} dispone de canales para la atencion de peticiones, quejas y reclamos
                conforme a la Ley 1480 de 2011 y la Ley 1755 de 2015:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Correo electronico: {email ? <a href={`mailto:${email}`} className="text-primary hover:underline">{email}</a> : <span>correo no configurado</span>}</li>
                <li>Telefono: {telefono}</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-2">
                Toda PQR recibira un numero de radicado como comprobante. Las peticiones se
                responderan dentro de los quince (15) dias habiles siguientes a su recepcion.
                Los reclamos se atenderan dentro del plazo legal de quince (15) dias habiles.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Proteccion de datos personales</h2>
              <p className="text-muted-foreground leading-relaxed">
                El tratamiento de datos personales se realiza conforme a la Ley 1581 de 2012.
                Para mayor detalle, consulta nuestra{' '}
                <a href="/privacy" className="text-primary hover:underline">
                  Politica de Tratamiento de Datos Personales
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Propiedad intelectual</h2>
              <p className="text-muted-foreground leading-relaxed">
                Todos los contenidos del sitio web (textos, imagenes, logos, diseno, software)
                son propiedad de {responsable} o de sus licenciantes y estan protegidos por la
                Ley 23 de 1982 (Ley de Derechos de Autor) y la Decision 486 de la Comunidad
                Andina. Queda prohibida su reproduccion, distribucion o uso no autorizado.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Comunicaciones comerciales</h2>
              <p className="text-muted-foreground leading-relaxed">
                Conforme a la Ley 2300 de 2023, {responsable} unicamente enviara comunicaciones
                comerciales (correos electronicos, mensajes de texto, llamadas promocionales) a
                quienes hayan otorgado su autorizacion expresa. El usuario podra revocar esta
                autorizacion en cualquier momento utilizando el enlace de cancelacion incluido
                en cada comunicacion o escribiendo a{' '}
                {email ? <a href={`mailto:${email}`} className="text-primary hover:underline">{email}</a> : <span>correo no configurado</span>}.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Legislacion aplicable y jurisdiccion</h2>
              <p className="text-muted-foreground leading-relaxed">
                Estos terminos y condiciones se rigen por la legislacion de la Republica de Colombia.
                Para la resolucion de controversias, las partes se someten a la jurisdiccion de los
                jueces y tribunales de {ciudad}, Colombia, sin perjuicio del derecho del consumidor
                a acudir a la Superintendencia de Industria y Comercio (SIC) o a los mecanismos
                alternativos de solucion de conflictos (Ley 2439 de 2024).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">13. Modificaciones</h2>
              <p className="text-muted-foreground leading-relaxed">
                {responsable} se reserva el derecho de modificar estos terminos y condiciones en
                cualquier momento. Los cambios seran publicados en esta pagina y entraran en
                vigencia a partir de su publicacion.
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
