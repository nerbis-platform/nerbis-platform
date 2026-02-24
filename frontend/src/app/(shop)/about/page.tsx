// src/app/(shop)/about/page.tsx

'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { WhyChooseUs } from '@/components/common/WhyChooseUs';
import { TeamSection } from '@/components/common/TeamSection';
import { LocationSection } from '@/components/common/LocationSection';
import { CTABooking } from '@/components/common/CTABooking';
import { AboutHero } from '@/components/about/AboutHero';
import { OurStory } from '@/components/about/OurStory';
import { MissionVision } from '@/components/about/MissionVision';
import { OurValues } from '@/components/about/OurValues';
import { PageGuard } from '@/components/common/PageGuard';
import { usePageContent } from '@/contexts/WebsiteContentContext';

interface AboutAIContent {
  title?: string;
  content?: string;
  highlights?: Array<{ title: string; description: string }>;
}

export default function AboutPage() {
  const aiContent = usePageContent<AboutAIContent>('about');

  return (
    <PageGuard page="about">
      <Header />
      <main className="min-h-screen">
        {aiContent?.title || aiContent?.content ? (
          <>
            {/* Hero con contenido IA */}
            <section className="relative py-20 md:py-28 overflow-hidden bg-linear-to-br from-primary/5 via-primary/10 to-background">
              <div className="absolute inset-0 -z-10">
                <div className="absolute top-20 right-10 w-72 h-72 bg-primary/15 rounded-full blur-3xl" />
                <div className="absolute bottom-20 left-10 w-96 h-96 bg-rose-300/10 rounded-full blur-3xl" />
              </div>
              <div className="container">
                <div className="max-w-3xl mx-auto text-center">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                    {aiContent.title || 'Sobre Nosotros'}
                  </h1>
                  {aiContent.content && (
                    <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                      {aiContent.content}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Highlights IA */}
            {aiContent.highlights && aiContent.highlights.length > 0 && (
              <section className="py-16">
                <div className="container">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {aiContent.highlights.map((item, i) => (
                      <div key={i} className="text-center p-6">
                        <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                        <p className="text-muted-foreground">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Componentes reales del negocio */}
            <TeamSection />
            <WhyChooseUs />
            <LocationSection />
            <CTABooking />
          </>
        ) : (
          <>
            {/* Fallback: componentes originales */}
            <AboutHero />
            <OurStory />
            <OurValues />
            <MissionVision />
            <TeamSection />
            <WhyChooseUs />
            <LocationSection />
            <CTABooking />
          </>
        )}
      </main>
      <Footer />
    </PageGuard>
  );
}
