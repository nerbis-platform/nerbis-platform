// src/app/(tenant)/(shop)/cookies/page.tsx

'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useTenantInfo, useTenantLegal } from '@/contexts/TenantContext';

export default function CookiesPage() {
  const tenantInfo = useTenantInfo();
  const legal = useTenantLegal();

  const responsable = legal?.legal_name || tenantInfo.name;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container py-12 max-w-4xl">
          <h1 className="text-4xl font-bold mb-8">Politica de Cookies</h1>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Que son las cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                Las cookies son pequenos archivos de texto que los sitios web almacenan en tu
                dispositivo (computador, tablet o celular) cuando los visitas. Se utilizan para
                hacer que los sitios web funcionen de manera mas eficiente y para proporcionar
                informacion a los administradores del sitio.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Marco legal aplicable</h2>
              <p className="text-muted-foreground leading-relaxed">
                En Colombia, el uso de cookies se regula dentro del marco de la proteccion de datos
                personales y las comunicaciones electronicas:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>
                  <strong>Ley 1581 de 2012:</strong> Regimen General de Proteccion de Datos Personales.
                  Los datos recolectados mediante cookies que permitan identificar a una persona son
                  datos personales sujetos a esta ley.
                </li>
                <li>
                  <strong>Ley 2300 de 2023:</strong> Regula las comunicaciones comerciales no deseadas.
                  Las cookies de marketing deben respetar las preferencias del usuario sobre
                  comunicaciones comerciales.
                </li>
                <li>
                  <strong>Decreto 1074 de 2015:</strong> Reglamentacion del tratamiento de datos personales.
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-2">
                {responsable} se compromete a informar de forma clara sobre el uso de cookies y a
                respetar las preferencias del usuario en materia de datos personales.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Que tipos de cookies utilizamos</h2>

              <div className="space-y-6">
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">Cookies Esenciales</h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    Estas cookies son necesarias para el funcionamiento basico del sitio web.
                    Sin ellas, el sitio no funcionaria correctamente.
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Mantener tu sesion iniciada</li>
                    <li>Recordar los productos en tu carrito de compras</li>
                    <li>Procesar pagos de forma segura</li>
                    <li>Recordar tus preferencias de cookies</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">Cookies de Rendimiento</h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    Nos ayudan a entender como los visitantes interactuan con nuestro sitio web,
                    permitiendonos mejorar su funcionamiento.
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Analisis de paginas visitadas</li>
                    <li>Tiempo de permanencia en el sitio</li>
                    <li>Errores que puedan ocurrir</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">Cookies de Funcionalidad</h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    Permiten que el sitio web recuerde las elecciones que haces para ofrecerte
                    una experiencia mas personalizada.
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Preferencias de idioma</li>
                    <li>Region o ubicacion</li>
                    <li>Personalizacion de la interfaz</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">Cookies de Marketing</h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    Se utilizan para mostrar contenido publicitario relevante. Conforme a la
                    Ley 2300 de 2023, estas cookies solo se activan con tu consentimiento y puedes
                    revocar tu autorizacion en cualquier momento.
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Publicidad personalizada</li>
                    <li>Medicion de campanas publicitarias</li>
                    <li>Remarketing</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Como gestionar las cookies</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Puedes controlar o eliminar las cookies cuando lo desees. Puedes eliminar todas las
                cookies que ya estan en tu dispositivo y puedes configurar la mayoria de los
                navegadores para que no las acepten.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Para gestionar tus preferencias de cookies en nuestro sitio, puedes hacer clic en
                el boton de configuracion de cookies que aparece en la parte inferior de la pagina.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Tambien puedes configurar tu navegador para que rechace las cookies o te avise
                cuando se envien. Ten en cuenta que si rechazas las cookies, es posible que algunas
                funciones del sitio web no funcionen correctamente.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Configuracion en navegadores</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <a
                  href="https://support.google.com/chrome/answer/95647"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border rounded-lg p-4 hover:bg-muted transition-colors"
                >
                  <span className="font-medium">Google Chrome</span>
                  <p className="text-sm text-muted-foreground">Configurar cookies en Chrome</p>
                </a>
                <a
                  href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border rounded-lg p-4 hover:bg-muted transition-colors"
                >
                  <span className="font-medium">Mozilla Firefox</span>
                  <p className="text-sm text-muted-foreground">Configurar cookies en Firefox</p>
                </a>
                <a
                  href="https://support.apple.com/es-co/guide/safari/sfri11471/mac"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border rounded-lg p-4 hover:bg-muted transition-colors"
                >
                  <span className="font-medium">Safari</span>
                  <p className="text-sm text-muted-foreground">Configurar cookies en Safari</p>
                </a>
                <a
                  href="https://support.microsoft.com/es-co/microsoft-edge/eliminar-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border rounded-lg p-4 hover:bg-muted transition-colors"
                >
                  <span className="font-medium">Microsoft Edge</span>
                  <p className="text-sm text-muted-foreground">Configurar cookies en Edge</p>
                </a>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Tus derechos</h2>
              <p className="text-muted-foreground leading-relaxed">
                De conformidad con la Ley 1581 de 2012, tienes derecho a conocer, actualizar,
                rectificar y suprimir tus datos personales recolectados mediante cookies, asi como
                a revocar la autorizacion otorgada. Para ejercer estos derechos, consulta nuestra{' '}
                <a href="/privacy" className="text-primary hover:underline">
                  Politica de Tratamiento de Datos Personales
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Actualizaciones de esta politica</h2>
              <p className="text-muted-foreground leading-relaxed">
                Podemos actualizar esta politica de cookies periodicamente para reflejar cambios
                en las cookies que utilizamos o por razones legales o regulatorias.
                Te recomendamos que revises esta pagina regularmente para estar informado sobre
                nuestro uso de cookies.
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
