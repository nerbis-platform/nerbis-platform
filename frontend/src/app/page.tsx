// src/app/page.tsx

import { PublishedWebsite } from '@/components/website/PublishedWebsite';
import { Hero } from '@/components/common/Hero';
import { ServiceCategories } from '@/components/common/ServiceCategories';
import { FeaturedServices } from '@/components/common/FeaturedServices';
import { WhyChooseUs } from '@/components/common/WhyChooseUs';
import { FeaturedProducts } from '@/components/common/FeaturedProducts';
import { TeamSection } from '@/components/common/TeamSection';
import { LocationSection } from '@/components/common/LocationSection';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

function DefaultHome() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <ServiceCategories />
        <FeaturedServices />
        <WhyChooseUs />
        <FeaturedProducts />
        <TeamSection />
        <LocationSection />
      </main>
      <Footer />
    </>
  );
}

export default function HomePage() {
  return <PublishedWebsite fallback={<DefaultHome />} />;
}
