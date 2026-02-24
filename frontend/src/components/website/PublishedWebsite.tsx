'use client';

import type { ReactNode } from 'react';
import { usePublishedWebsite } from '@/contexts/WebsiteContentContext';
import { WebsiteShell } from './WebsiteShell';
import { SectionRenderer } from './SectionRenderer';

interface PublishedWebsiteProps {
  fallback: ReactNode;
}

export function PublishedWebsite({ fallback }: PublishedWebsiteProps) {
  const website = usePublishedWebsite();

  if (!website) return <>{fallback}</>;

  const { content, theme, seo, media } = website;

  // Section order from AI-generated content
  const sectionOrder: string[] = Array.isArray(content._section_order)
    ? content._section_order
    : Object.keys(content).filter(k => k !== '_section_order');

  // Filter to sections that actually have data
  const activeSections = sectionOrder.filter(
    (id) => id !== '_section_order' && id in content
  );

  // Track alt index for alternating backgrounds (skip hero)
  let altIndex = 0;
  let nonHeroCount = 0;

  return (
    <WebsiteShell
      theme={theme}
      seo={seo}
      media={media}
      content={content}
      sections={activeSections}
    >
      {activeSections.map((sectionId) => {
        const isHero = sectionId === 'hero';
        const isAlt = !isHero && altIndex++ % 2 === 1;
        const showDivider = !isHero && nonHeroCount++ > 0;
        return (
          <SectionRenderer
            key={sectionId}
            sectionId={sectionId}
            data={content[sectionId]}
            isAlt={isAlt}
            showDivider={showDivider}
          />
        );
      })}
    </WebsiteShell>
  );
}
