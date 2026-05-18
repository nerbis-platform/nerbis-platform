'use client';

import { SOCIAL_NETWORKS } from './SocialIcons';

interface SocialLinksEditorProps {
  links: Record<string, string>;
  onChange: (links: Record<string, string>) => void;
  disabled?: boolean;
}

export default function SocialLinksEditor({
  links,
  onChange,
  disabled = false,
}: SocialLinksEditorProps) {
  const filledCount = SOCIAL_NETWORKS.filter(n => links[n.key]?.trim()).length;

  const updateLink = (key: string, value: string) => {
    onChange({ ...links, [key]: value });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[0.72rem] font-medium text-gray-400 uppercase tracking-wide">
          Redes Sociales
        </p>
        <span className="text-[0.68rem] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {filledCount}/{SOCIAL_NETWORKS.length}
        </span>
      </div>

      <div className="space-y-2">
        {SOCIAL_NETWORKS.map(({ key, icon: Icon, placeholder, color }) => {
          const val = links[key] || '';
          return (
            <div key={key} className="flex items-center gap-2">
              <div
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${color}15` }}
              >
                <Icon className="h-3.5 w-3.5" style={{ color }} />
              </div>
              <input
                type="url"
                value={val}
                onChange={(e) => updateLink(key, e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className="flex-1 h-8 px-2.5 rounded-lg border border-gray-200 text-[0.78rem] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#0D9488] transition-colors disabled:opacity-50"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
