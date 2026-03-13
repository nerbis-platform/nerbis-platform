'use client';

import { type LucideIcon } from 'lucide-react';

interface SubComponentToggleProps {
  label: string;
  description: string;
  icon: LucideIcon;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: React.ReactNode;
}

export default function SubComponentToggle({
  label,
  description,
  icon: Icon,
  enabled,
  onToggle,
  children,
}: SubComponentToggleProps) {
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => onToggle(!enabled)}
        className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer"
      >
        <div className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${
          enabled ? 'bg-[#E2F3F1]' : 'bg-gray-100'
        }`}>
          <Icon className={`h-3.5 w-3.5 transition-colors ${
            enabled ? 'text-[#1C3B57]' : 'text-gray-400'
          }`} />
        </div>
        <div className="flex-1 text-left">
          <p className={`text-[0.78rem] font-medium transition-colors ${
            enabled ? 'text-[#1C3B57]' : 'text-gray-600'
          }`}>
            {label}
          </p>
          <p className="text-[0.65rem] text-gray-400 leading-tight">{description}</p>
        </div>
        {/* Switch */}
        <div className={`relative w-9 h-5 rounded-full transition-colors ${
          enabled ? 'bg-[#1C3B57]' : 'bg-gray-200'
        }`}>
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
            enabled ? 'translate-x-4' : 'translate-x-0.5'
          }`} />
        </div>
      </button>

      {/* Expandable content */}
      <div
        className="overflow-hidden transition-all duration-200"
        style={{
          maxHeight: enabled ? '500px' : '0px',
          opacity: enabled ? 1 : 0,
        }}
      >
        <div className="px-3.5 pb-3.5 pt-1 space-y-2.5 border-t border-gray-100">
          {children}
        </div>
      </div>
    </div>
  );
}
