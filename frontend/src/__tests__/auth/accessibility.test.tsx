import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { LoginForm } from '@/components/auth/LoginForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { OtpInput } from '@/components/auth/OtpInput';
import { BrandCarousel } from '@/components/auth/BrandCarousel';
import type { BrandSlide } from '@/components/auth/types';

// ─── Mocks ──────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    platformLogin: vi.fn(),
    registerTenant: vi.fn(),
    user: null,
    isAuthenticated: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/api/auth', () => ({
  requestReactivationOTP: vi.fn(),
  platformRequestPasswordResetOTP: vi.fn(),
  platformVerifyPasswordResetOTP: vi.fn(),
}));

vi.mock('@/lib/features', () => ({
  features: {
    socialLogin: true,
    passkeys: false,
    rememberMe: false,
    useNewAuth: true,
  },
}));

// ─── Shared data ────────────────────────────────────────────────

const mockSlides: BrandSlide[] = [
  {
    id: 'slide-1',
    headline: 'Headline One',
    subtitle: 'Subtitle one',
    features: ['Feature A'],
  },
  {
    id: 'slide-2',
    headline: 'Headline Two',
    subtitle: 'Subtitle two',
    features: ['Feature B'],
  },
];

// ─── Helper ─────────────────────────────────────────────────────

function expectNoViolations(results: Awaited<ReturnType<typeof axe>>) {
  const violations = results.violations;
  if (violations.length > 0) {
    const messages = violations.map(
      (v) =>
        `[${v.impact}] ${v.id}: ${v.description}\n  ${v.nodes.map((n) => n.html).join('\n  ')}`,
    );
    throw new Error(`Accessibility violations:\n${messages.join('\n\n')}`);
  }
}

// ─── axe-core accessibility tests ───────────────────────────────

describe('Accessibility (axe-core)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // BrandCarousel uses matchMedia for reduced-motion detection
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        onchange: null,
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('LoginForm has no a11y violations', async () => {
    const { container } = render(
      <LoginForm
        onToggleMode={vi.fn()}
        onForgotPassword={vi.fn()}
      />,
    );

    const results = await axe(container);
    expectNoViolations(results);
  });

  it('ForgotPasswordForm (email step) has no a11y violations', async () => {
    const { container } = render(
      <ForgotPasswordForm onGoToLogin={vi.fn()} />,
    );

    const results = await axe(container);
    expectNoViolations(results);
  });

  it('OtpInput has no a11y violations', async () => {
    const { container } = render(
      <OtpInput value="" onChange={vi.fn()} />,
    );

    const results = await axe(container);
    expectNoViolations(results);
  });

  it('BrandCarousel has no a11y violations', async () => {
    const { container } = render(
      <BrandCarousel slides={mockSlides} />,
    );

    const results = await axe(container);
    expectNoViolations(results);
  });
});
