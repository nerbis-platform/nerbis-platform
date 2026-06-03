import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock features module
vi.mock('@/lib/features', () => ({
  features: {
    socialLogin: true,
    passkeys: false,
    rememberMe: false,
  },
}));

// Mock Google OAuth
vi.mock('@react-oauth/google', () => ({
  useGoogleLogin: () => vi.fn(),
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    socialLogin: vi.fn(),
    platformLogin: vi.fn(),
    user: null,
    isAuthenticated: false,
  }),
}));

// Mock sonner
const mockToastInfo = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    info: (...args: unknown[]) => mockToastInfo(...args),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('SocialLoginButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 3 social login buttons', () => {
    render(<SocialLoginButtons mode="login" />);

    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Facebook')).toBeInTheDocument();
  });

  it('uses "Iniciar sesión" label for login mode', () => {
    render(<SocialLoginButtons mode="login" />);

    expect(screen.getByLabelText('Iniciar sesión con Google')).toBeInTheDocument();
    // Apple shows "Próximamente" label when env var is unset
    expect(screen.getByLabelText('Apple — Próximamente')).toBeInTheDocument();
    expect(screen.getByLabelText('Iniciar sesión con Facebook')).toBeInTheDocument();
  });

  it('uses "Registrarse" label for register mode', () => {
    render(<SocialLoginButtons mode="register" />);

    expect(screen.getByLabelText('Registrarse con Google')).toBeInTheDocument();
    expect(screen.getByLabelText('Apple — Próximamente')).toBeInTheDocument();
    expect(screen.getByLabelText('Registrarse con Facebook')).toBeInTheDocument();
  });

  it('shows info toast when Google env var is not configured', async () => {
    const user = userEvent.setup();
    render(<SocialLoginButtons mode="login" />);

    await user.click(screen.getByText('Google'));

    expect(mockToastInfo).toHaveBeenCalledWith('Google login no está configurado');
  });

  it('calls custom onGoogleClick handler when provided', async () => {
    const user = userEvent.setup();
    const onGoogleClick = vi.fn();
    render(<SocialLoginButtons mode="login" onGoogleClick={onGoogleClick} />);

    await user.click(screen.getByText('Google'));

    expect(onGoogleClick).toHaveBeenCalled();
    expect(mockToastInfo).not.toHaveBeenCalled();
  });

  it('disables Apple button when env var is not set', () => {
    render(<SocialLoginButtons mode="login" />);

    const appleBtn = screen.getByLabelText('Apple — Próximamente');
    expect(appleBtn).toBeDisabled();
  });

  it('has accessible section label', () => {
    render(<SocialLoginButtons mode="login" />);

    expect(
      screen.getByRole('region', { name: 'Iniciar sesión con redes sociales' }),
    ).toBeInTheDocument();
  });
});

describe('SocialLoginButtons (feature flag off)', () => {
  it('renders nothing when socialLogin feature is disabled', async () => {
    vi.resetModules();
    vi.doMock('@/lib/features', () => ({
      features: {
        socialLogin: false,
        passkeys: false,
        rememberMe: false,
      },
    }));

    const { SocialLoginButtons: SLB } = await import('@/components/auth/SocialLoginButtons');
    const { container } = render(<SLB mode="login" />);

    expect(container.innerHTML).toBe('');
  });
});
