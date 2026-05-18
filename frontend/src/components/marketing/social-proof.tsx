'use client';

import { useCountUp } from '@/components/website/useCountUp';

interface StatItemProps {
  end: number;
  suffix: string;
  label: string;
}

function StatItem({ end, suffix, label }: StatItemProps) {
  const { ref, display } = useCountUp<HTMLDivElement>({ end, suffix, duration: 2000 });

  return (
    <div ref={ref} className="flex flex-col items-center gap-1 px-6 py-2 sm:px-8">
      <span className="text-2xl font-semibold tabular-nums text-white sm:text-3xl">{display}</span>
      <span className="text-sm text-zinc-500">{label}</span>
    </div>
  );
}

const stats = [
  { end: 25, suffix: '+', label: 'industrias' },
  { end: 30, suffix: 's', label: 'para tu sitio' },
  { end: 100, suffix: '%', label: 'en espanol' },
  { end: 0, suffix: '', label: 'comisiones' },
];

export function SocialProof() {
  return (
    <section className="border-y border-zinc-800/50 bg-zinc-950">
      {/* Trust line */}
      <div className="border-b border-zinc-800/30 py-6">
        <p className="text-center text-sm text-zinc-500">
          La plataforma todo-en-uno para negocios en Latinoamerica
        </p>
      </div>
      {/* Stats */}
      <div className="py-10">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center divide-zinc-800 sm:divide-x">
          {stats.map((stat) => (
            <StatItem key={stat.label} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
}
