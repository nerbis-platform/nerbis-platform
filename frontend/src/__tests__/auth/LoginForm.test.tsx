import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/auth/LoginForm';

// ─── Mocks ──────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockPlatformLogin = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    platformLogin: mockPlatformLogin,
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
}));

vi.mock('@/lib/features', () => ({
  features: {
    socialLogin: false,
    passkeys: false,
    rememberMe: false,
    useNewAuth: true,
  },
}));

describe('LoginForm', () => {
  const defaultProps = {
    onToggleMode: vi.fn(),
    onForgotPassword: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with title', () => {
    render(<LoginForm {...defaultProps} />);

    expect(screen.getByText('Bienvenido de nuevo')).toBeInTheDocument();
    expect(screen.getByText('Accede a tu cuenta para continuar.')).toBeInTheDocument();
  });

  it('renders email and password fields', () => {
    render(<LoginForm {...defaultProps} />);

    expect(screen.getByText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('tu@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<LoginForm {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('renders forgot password link', () => {
    render(<LoginForm {...defaultProps} />);

    const forgotBtn = screen.getByText('¿Olvidaste tu contraseña?');
    expect(forgotBtn).toBeInTheDocument();
  });

  it('calls onForgotPassword when forgot link is clicked', async () => {
    const user = userEvent.setup();
    render(<LoginForm {...defaultProps} />);

    await user.click(screen.getByText('¿Olvidaste tu contraseña?'));
    expect(defaultProps.onForgotPassword).toHaveBeenCalled();
  });

  it('renders toggle to register link', () => {
    render(<LoginForm {...defaultProps} />);

    expect(screen.getByText('Registra tu negocio')).toBeInTheDocument();
  });

  it('calls onToggleMode when register link is clicked', async () => {
    const user = userEvent.setup();
    render(<LoginForm {...defaultProps} />);

    await user.click(screen.getByText('Registra tu negocio'));
    expect(defaultProps.onToggleMode).toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    mockPlatformLogin.mockResolvedValue(undefined);
    render(<LoginForm {...defaultProps} />);

    await user.type(screen.getByPlaceholderText('tu@email.com'), 'test@email.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'Password1');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => {
      expect(mockPlatformLogin).toHaveBeenCalledWith(
        { email: 'test@email.com', password: 'Password1' },
        undefined,
      );
    });
  });

  it('does not submit with empty fields', async () => {
    const user = userEvent.setup();
    render(<LoginForm {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => {
      expect(mockPlatformLogin).not.toHaveBeenCalled();
    });
  });

  it('has accessible section landmark', () => {
    render(<LoginForm {...defaultProps} />);

    expect(screen.getByRole('region', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('renders help link', () => {
    render(<LoginForm {...defaultProps} />);

    expect(screen.getByText('¿Necesitas ayuda?')).toBeInTheDocument();
  });

  it('does not show social login buttons when feature is off', () => {
    render(<LoginForm {...defaultProps} />);

    expect(screen.queryByText('Google')).not.toBeInTheDocument();
  });
});
