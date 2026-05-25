import { getMarketingContent } from '@/lib/api/marketing-content';
import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { MarketingLayoutShell } from '@/components/marketing/layout-shell';
import { FloatingPipe } from '@/components/marketing/floating-pipe';

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sections = await getMarketingContent();

  return (
    <MarketingLayoutShell>
      <MarketingHeader content={sections.header.content} />
      <main className="page-content">{children}</main>
      <FloatingPipe />
      <MarketingFooter />
    </MarketingLayoutShell>
  );
}
