'use client';

import { PipeAvatar, PipeStatic } from '@/components/pipe-avatar';
import type { PipeMood } from '@/components/pipe-avatar';

interface NerbisWordmarkProps {
  size?: number;
  className?: string;
  variant?: 'full' | 'text';
  pipeMood?: PipeMood;
  pipeSize?: number;
  pipeCalm?: boolean;
}

export function NerbisWordmark({
  size = 18,
  className = '',
  variant = 'text',
  pipeMood = 'idle',
  pipeSize,
  pipeCalm = false,
}: NerbisWordmarkProps) {
  if (variant === 'full') {
    const avatarSize = pipeSize ?? size * 1.8;

    return (
      <span
        className={className}
        style={{
          display: 'inline-flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: `${size * 0.4}px`,
        }}
      >
        <PipeAvatar mood={pipeMood} size={avatarSize} calm={pipeCalm} />
        <span
          style={{
            fontWeight: 800,
            fontSize: `${size}px`,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          NERBIS
        </span>
      </span>
    );
  }

  // variant="text" — wordmark with static Pipe 3D face above
  const dotSize = pipeSize ?? size * 1.2;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: `${size * 0.1}px`,
      }}
    >
      <PipeStatic size={dotSize} />
      <span
        style={{
          fontWeight: 800,
          fontSize: `${size}px`,
          letterSpacing: '-0.05em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        NERBIS
      </span>
    </span>
  );
}
