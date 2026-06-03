'use client';

import { Loader2, Sparkles } from 'lucide-react';
import {
  type VariantSwitcherProps,
  SECTION_VARIANTS,
  LayoutIcon,
} from './variant-switcher-helpers';

// Re-export for consumers that import from this file
export { SECTION_VARIANTS, LayoutIcon } from './variant-switcher-helpers';

export default function VariantSwitcher({
  sectionKey,
  currentVariant,
  aiRecommendedVariant,
  onChange,
  isLoading,
}: VariantSwitcherProps) {
  const variants = SECTION_VARIANTS[sectionKey];
  if (!variants) return null;

  return (
    <div className="mb-5">
      <label className="text-[0.72rem] font-medium text-gray-400 uppercase tracking-wide block mb-2">
        Diseño de sección
      </label>
      <div className="grid grid-cols-3 gap-2">
        {variants.map((v) => {
          const isActive = currentVariant === v.id;
          const isRecommended = aiRecommendedVariant === v.id;

          return (
            <button
              key={v.id}
              type="button"
              disabled={isLoading}
              onClick={() => onChange(v.id)}
              className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-lg border-2 transition-all cursor-pointer disabled:opacity-50 ${
                isActive
                  ? 'border-[#1C3B57] bg-[#E2F3F1]/30'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              {isLoading && isActive ? (
                <Loader2 className="h-5 w-5 text-[#1C3B57] animate-spin" />
              ) : (
                <LayoutIcon type={v.icon} isActive={isActive} />
              )}
              <span className={`text-[0.65rem] font-medium leading-tight text-center ${
                isActive ? 'text-[#1C3B57]' : 'text-gray-500'
              }`}>
                {v.label}
              </span>
              {isRecommended && (
                <span className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 bg-[#1C3B57] text-white text-[0.5rem] font-medium px-1.5 py-0.5 rounded-full">
                  <Sparkles className="h-2 w-2" />
                  IA
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
