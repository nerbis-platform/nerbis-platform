// src/types/marketing.ts
//
// TypeScript interfaces for marketing landing page content.
// Each section maps to a MarketingSection record in the backend DB.

// ──────────────────────────────────────────────────────────────────────
// Section content types
// ──────────────────────────────────────────────────────────────────────

export interface HeroContent {
  title_line1: string;
  title_line2: string;
  subtitle: string;
  cta_text: string;
  cta_href: string;
  cta_subtext: string;
}

export interface ProblemSolutionContent {
  badge: string;
  title: string;
  before_label: string;
  after_label: string;
  comparisons: {
    before: string;
    after: string;
  }[];
}

export interface HowItWorksStep {
  step_label: string;
  title: string;
  description: string;
}

export interface HowItWorksContent {
  badge: string;
  title: string;
  steps: HowItWorksStep[];
}

export interface CtaMidContent {
  title: string;
  subtitle: string;
  cta_text: string;
  cta_href: string;
}

export interface IndustryItem {
  name: string;
  emoji: string;
}

export interface IndustriesContent {
  badge: string;
  title: string;
  subtitle: string;
  industries: IndustryItem[];
  overflow_text: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqContent {
  badge: string;
  title: string;
  items: FaqItem[];
}

export interface CtaFinalContent {
  title_line1: string;
  title_line2: string;
  cta_text: string;
  cta_href: string;
  cta_subtext: string;
}

export interface NavLink {
  label: string;
  href: string;
}

export interface HeaderContent {
  nav_links: NavLink[];
  cta_text: string;
  cta_href: string;
  login_text: string;
  login_href: string;
}

export interface SeoContent {
  title: string;
  description: string;
}

// ──────────────────────────────────────────────────────────────────────
// Section wrapper (mirrors backend MarketingSection model)
// ──────────────────────────────────────────────────────────────────────

export interface MarketingSectionData<T = unknown> {
  content: T;
  is_visible: boolean;
}

// ──────────────────────────────────────────────────────────────────────
// All marketing sections as a dict
// ──────────────────────────────────────────────────────────────────────

export interface MarketingSections {
  hero: MarketingSectionData<HeroContent>;
  problem_solution: MarketingSectionData<ProblemSolutionContent>;
  how_it_works: MarketingSectionData<HowItWorksContent>;
  cta_mid: MarketingSectionData<CtaMidContent>;
  industries: MarketingSectionData<IndustriesContent>;
  faq: MarketingSectionData<FaqContent>;
  cta_final: MarketingSectionData<CtaFinalContent>;
  header: MarketingSectionData<HeaderContent>;
  seo: MarketingSectionData<SeoContent>;
}

// Section key union type for type-safe access
export type MarketingSectionKey = keyof MarketingSections;
