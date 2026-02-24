'use client';

import type { SectionData } from '@/contexts/WebsiteContentContext';
import {
  HeroSection,
  AboutSection,
  ServicesSection,
  ProductsSection,
  TestimonialsSection,
  PricingSection,
  GallerySection,
  FAQSection,
  ContactSection,
  GenericSection,
} from './sections';

interface SectionRendererProps {
  sectionId: string;
  data: SectionData;
  isAlt: boolean;
  showDivider?: boolean;
}

const SECTION_MAP: Record<string, React.ComponentType<{ data: SectionData }>> = {
  hero: HeroSection,
  about: AboutSection,
  services: ServicesSection,
  products: ProductsSection,
  testimonials: TestimonialsSection,
  pricing: PricingSection,
  gallery: GallerySection,
  faq: FAQSection,
  contact: ContactSection,
};

function SectionDivider() {
  return (
    <div className="section-divider" aria-hidden="true">
      <svg viewBox="0 0 1200 48" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M0 24C200 44 400 4 600 24C800 44 1000 4 1200 24V48H0Z"
          fill="currentColor"
          opacity="0.04"
        />
      </svg>
      <span />
    </div>
  );
}

export function SectionRenderer({ sectionId, data, isAlt, showDivider = false }: SectionRendererProps) {
  if (sectionId === 'header') return null;

  const Component = SECTION_MAP[sectionId];

  if (sectionId === 'hero') {
    return <HeroSection data={data} />;
  }

  const altClass = isAlt ? ' section-alt' : '';
  const revealClass = ' reveal';

  if (Component) {
    return (
      <>
        {showDivider && <SectionDivider />}
        <div className={`${revealClass}${altClass}`.trim()} id={sectionId}>
          <Component data={data} />
        </div>
      </>
    );
  }

  return (
    <>
      {showDivider && <SectionDivider />}
      <div className={`${revealClass}${altClass}`.trim()} id={sectionId}>
        <GenericSection sectionId={sectionId} data={data} />
      </div>
    </>
  );
}
