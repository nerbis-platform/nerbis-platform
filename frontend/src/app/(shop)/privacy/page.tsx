// src/app/(shop)/privacy/page.tsx

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata = {
  title: 'Política de Privacidad',
  description: 'Información sobre el tratamiento de datos personales en España',
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container py-12 max-w-4xl">
          <h1 className="text-4xl font-bold mb-8">Política de Privacidad</h1>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-justify">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Responsable del tratamiento</h2>
              <p className="text-muted-foreground leading-relaxed">
                GERDY EMILIEE CASTAÑEDA MENDOZA es la responsable del tratamiento de los datos
                personales recogidos a través de este sitio web, de conformidad con el Reglamento
                (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018, de Protección de Datos Personales y
                garantía de los derechos digitales (LOPDGDD).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Finalidades del tratamiento</h2>
              <p className="text-muted-foreground leading-relaxed">
                Los datos personales se tratan con las siguientes finalidades:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Gestionar solicitudes realizadas por el usuario.</li>
                <li>Prestar servicios y gestionar pedidos o reservas.</li>
                <li>Enviar comunicaciones comerciales cuando exista consentimiento.</li>
                <li>Mejorar la experiencia del usuario y la calidad del servicio.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Legitimación</h2>
              <p className="text-muted-foreground leading-relaxed">
                La base legal para el tratamiento de los datos puede ser el consentimiento del
                usuario, la ejecución de un contrato o la aplicación de medidas precontractuales,
                así como el cumplimiento de obligaciones legales.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Conservación de los datos</h2>
              <p className="text-muted-foreground leading-relaxed">
                Los datos se conservarán durante el tiempo necesario para cumplir la finalidad para
                la que se recabaron y, en su caso, durante los plazos exigidos por la normativa
                aplicable.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Destinatarios</h2>
              <p className="text-muted-foreground leading-relaxed">
                No se cederán datos a terceros salvo obligación legal o cuando sea necesario para la
                prestación del servicio, en cuyo caso se formalizarán los acuerdos de encargo de
                tratamiento correspondientes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Derechos de las personas usuarias</h2>
              <p className="text-muted-foreground leading-relaxed">
                El usuario puede ejercer los derechos de acceso, rectificación, supresión,
                limitación, oposición y portabilidad enviando una solicitud a través del correo
                electrónico de contacto. Asimismo, tiene derecho a presentar una reclamación ante la
                Agencia Española de Protección de Datos (AEPD).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Seguridad de la información</h2>
              <p className="text-muted-foreground leading-relaxed">
                Se han adoptado medidas técnicas y organizativas adecuadas para garantizar la
                seguridad de los datos personales y evitar su pérdida, alteración o acceso no
                autorizado.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Menores de edad</h2>
              <p className="text-muted-foreground leading-relaxed">
                Este sitio web no está dirigido a menores de 14 años. Si eres menor de 14 años, no
                debes facilitar datos personales sin el consentimiento de tus padres o tutores.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Cambios en esta política</h2>
              <p className="text-muted-foreground leading-relaxed">
                Podemos actualizar esta política para reflejar cambios legales o mejoras del
                servicio. Te recomendamos revisarla periódicamente.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Contacto</h2>
              <p className="text-muted-foreground leading-relaxed">
                Para cualquier consulta sobre esta política de privacidad, puedes escribir a{' '}
                <a
                  href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL}`}
                  className="text-primary hover:underline"
                >
                  {process.env.NEXT_PUBLIC_CONTACT_EMAIL}
                </a>.
              </p>
            </section>

            <p className="text-sm text-muted-foreground pt-8 border-t">
              Última actualización: Enero 2025
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
