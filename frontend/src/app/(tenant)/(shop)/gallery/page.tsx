// src/app/(shop)/gallery/page.tsx

'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Camera, ImageIcon } from 'lucide-react';
import { PageGuard } from '@/components/common/PageGuard';
import { usePageContent } from '@/contexts/WebsiteContentContext';

export default function GalleryPage() {
  const aiContent = usePageContent<{ title?: string; subtitle?: string }>('gallery');

  return (
    <PageGuard page="gallery">
      <Header />
      <main className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative py-20 md:py-28 overflow-hidden bg-linear-to-br from-primary/5 via-primary/10 to-background">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-20 right-10 w-72 h-72 bg-primary/15 rounded-full blur-3xl" />
            <div className="absolute bottom-20 left-10 w-96 h-96 bg-purple-300/10 rounded-full blur-3xl" />
          </div>
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Camera className="h-4 w-4" />
                Nuestro trabajo
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                {aiContent?.title || 'Galería'}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                {aiContent?.subtitle || 'Un vistazo a nuestro trabajo, nuestras instalaciones y lo que nos hace únicos.'}
              </p>
            </div>
          </div>
        </section>

        {/* Gallery - Empty State */}
        <section className="py-16">
          <div className="container">
            <div className="text-center py-20">
              <ImageIcon className="h-16 w-16 text-muted-foreground/30 mx-auto mb-6" />
              <h2 className="text-2xl font-semibold mb-2">Próximamente</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Estamos preparando nuestra galería con las mejores imágenes
                de nuestro trabajo y nuestras instalaciones.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </PageGuard>
  );
}
