import type { Metadata } from 'next';
import { getMarketingContent } from '@/lib/api/marketing-content';
import { getIndustryGalleryCards } from '@/lib/api/industry-gallery';
import type { MarketingSections } from '@/types/marketing';
import { Hero } from '@/components/marketing/hero';
import { SocialProof } from '@/components/marketing/social-proof';
import { ProblemSolution } from '@/components/marketing/problem-solution';
import { PipeDemo } from '@/components/marketing/pipe-demo';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { FeaturesGrid } from '@/components/marketing/features-grid';
import { CtaMid } from '@/components/marketing/cta-mid';
import { Faq } from '@/components/marketing/faq';
import { CtaFinal } from '@/components/marketing/cta-final';

// ---------------------------------------------------------------------------
// Dynamic SEO metadata (fetched from admin-configurable content)
// ---------------------------------------------------------------------------

export async function generateMetadata(): Promise<Metadata> {
  const sections = await getMarketingContent();
  return {
    title: sections.seo.content.title,
    description: sections.seo.content.description,
  };
}

// ---------------------------------------------------------------------------
// Static JSON-LD — organization info (not admin-configurable)
// ---------------------------------------------------------------------------

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'NERBIS',
  url: 'https://nerbis.com',
  logo: 'https://nerbis.com/icon.svg',
  description:
    'Plataforma que crea tu negocio digital con inteligencia artificial',
  sameAs: [
    'https://twitter.com/nerbisplatform',
    'https://instagram.com/nerbisplatform',
    'https://linkedin.com/company/nerbis',
  ],
};

// ---------------------------------------------------------------------------
// Dynamic JSON-LD builders
// ---------------------------------------------------------------------------

function buildFaqJsonLd(sections: MarketingSections) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: sections.faq.content.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

function buildHowToJsonLd(sections: MarketingSections) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: sections.how_it_works.content.title,
    description: `${sections.how_it_works.content.title} con NERBIS`,
    step: sections.how_it_works.content.steps.map((s) => ({
      '@type': 'HowToStep',
      name: s.title,
      text: s.description,
    })),
  };
}

// ---------------------------------------------------------------------------
// Page component (async Server Component)
// ---------------------------------------------------------------------------

export default async function LandingPage() {
  const [sections, galleryCards] = await Promise.all([
    getMarketingContent(),
    getIndustryGalleryCards(),
  ]);

  return (
    <>
      {/* Organization — always rendered */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd),
        }}
      />

      {/* FAQ structured data — only when section is visible */}
      {sections.faq.is_visible && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildFaqJsonLd(sections)),
          }}
        />
      )}

      {/* HowTo structured data — only when section is visible */}
      {sections.how_it_works.is_visible && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildHowToJsonLd(sections)),
          }}
        />
      )}

      {/* Sections — configurable ones receive content and respect is_visible */}
      {sections.hero.is_visible && <Hero content={sections.hero.content} />}
      <SocialProof cards={galleryCards} />
      {sections.problem_solution.is_visible && (
        <ProblemSolution content={sections.problem_solution.content} />
      )}
      <PipeDemo />
      {sections.how_it_works.is_visible && (
        <HowItWorks content={sections.how_it_works.content} />
      )}
      <FeaturesGrid />
      {sections.cta_mid.is_visible && (
        <CtaMid content={sections.cta_mid.content} />
      )}
{sections.faq.is_visible && <Faq content={sections.faq.content} />}
      {sections.cta_final.is_visible && (
        <CtaFinal content={sections.cta_final.content} />
      )}
    </>
  );
}
