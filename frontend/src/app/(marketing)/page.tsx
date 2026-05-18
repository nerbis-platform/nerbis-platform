import type { Metadata } from 'next';
import { Hero } from '@/components/marketing/hero';
import { SocialProof } from '@/components/marketing/social-proof';
import { ProblemSolution } from '@/components/marketing/problem-solution';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { FeaturesGrid } from '@/components/marketing/features-grid';
import { Industries } from '@/components/marketing/industries';
import { CtaMid } from '@/components/marketing/cta-mid';
import { CtaFinal } from '@/components/marketing/cta-final';

export const metadata: Metadata = {
  title: 'NERBIS — Tu negocio online en 30 segundos',
  description:
    'NERBIS genera un sitio web profesional y personalizado para tu negocio con inteligencia artificial. Sin codigo. Sin templates genericos.',
};

export default function LandingPage() {
  return (
    <>
      <Hero />
      <SocialProof />
      <ProblemSolution />
      <HowItWorks />
      <FeaturesGrid />
      <CtaMid />
      <Industries />
      <CtaFinal />
    </>
  );
}
