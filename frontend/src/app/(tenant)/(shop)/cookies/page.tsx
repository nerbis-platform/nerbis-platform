// src/app/(shop)/cookies/page.tsx

import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Política de cookies',
  description: 'Información sobre el uso de cookies en nuestro sitio web',
};

export default function CookiesPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container py-12 max-w-4xl">
          <h1 className="text-4xl font-bold mb-8">Política de Cookies</h1>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">¿Qué son las cookies?</h2>
              <p className="text-muted-foreground leading-relaxed">
                Las cookies son pequeños archivos de texto que los sitios web almacenan en tu
                dispositivo (ordenador, tablet o móvil) cuando los visitas. Se utilizan ampliamente
                para hacer que los sitios web funcionen de manera más eficiente, así como para
                proporcionar información a los propietarios del sitio.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">¿Qué tipos de cookies utilizamos?</h2>

              <div className="space-y-6">
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">Cookies Esenciales</h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    Estas cookies son necesarias para el funcionamiento básico del sitio web.
                    Sin ellas, el sitio no funcionaría correctamente.
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Mantener tu sesión iniciada</li>
                    <li>Recordar los productos en tu carrito de compras</li>
                    <li>Procesar pagos de forma segura</li>
                    <li>Recordar tus preferencias de cookies</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">Cookies de Rendimiento</h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    Nos ayudan a entender cómo los visitantes interactúan con nuestro sitio web,
                    permitiéndonos mejorar su funcionamiento.
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Análisis de páginas visitadas</li>
                    <li>Tiempo de permanencia en el sitio</li>
                    <li>Errores que puedan ocurrir</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">Cookies de Funcionalidad</h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    Permiten que el sitio web recuerde las elecciones que haces para ofrecerte
                    una experiencia más personalizada.
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Preferencias de idioma</li>
                    <li>Región o ubicación</li>
                    <li>Personalización de la interfaz</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">Cookies de Marketing</h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    Se utilizan para rastrear a los visitantes en los sitios web con el fin de
                    mostrar anuncios relevantes y atractivos.
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Publicidad personalizada</li>
                    <li>Medición de campañas publicitarias</li>
                    <li>Remarketing</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">¿Cómo gestionar las cookies?</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Puedes controlar y/o eliminar las cookies como desees. Puedes eliminar todas las
                cookies que ya están en tu dispositivo y puedes configurar la mayoría de los
                navegadores para que no las acepten.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Para gestionar tus preferencias de cookies en nuestro sitio, puedes hacer clic en
                el botón de configuración de cookies que aparece en la parte inferior de la página.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                También puedes configurar tu navegador para que rechace las cookies o te avise
                cuando se envíen. Ten en cuenta que si rechazas las cookies, es posible que algunas
                funciones del sitio web no funcionen correctamente.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Configuración en navegadores</h2>
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
                  href="https://support.apple.com/es-es/guide/safari/sfri11471/mac"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border rounded-lg p-4 hover:bg-muted transition-colors"
                >
                  <span className="font-medium">Safari</span>
                  <p className="text-sm text-muted-foreground">Configurar cookies en Safari</p>
                </a>
                <a
                  href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
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
              <h2 className="text-2xl font-semibold mb-4">Actualizaciones de esta política</h2>
              <p className="text-muted-foreground leading-relaxed">
                Podemos actualizar esta política de cookies periódicamente para reflejar cambios
                en las cookies que utilizamos o por otras razones operativas, legales o regulatorias.
                Te recomendamos que revises esta página regularmente para estar informado sobre
                nuestro uso de cookies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Contacto</h2>
              <p className="text-muted-foreground leading-relaxed">
                Si tienes alguna pregunta sobre nuestra política de cookies, puedes contactarnos a
                través de nuestro formulario de contacto o enviando un correo electrónico a{' '}
                <a href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL}`} className="text-primary hover:underline">
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