import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterForm } from '@/components/auth/RegisterForm';

// ─── Mocks ──────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockRegisterTenant = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    registerTenant: mockRegisterTenant,
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

vi.mock('@/lib/features', () => ({
  features: {
    socialLogin: false,
    passkeys: false,
    rememberMe: false,
    useNewAuth: true,
  },
}));

describe('RegisterForm', () => {
  const defaultProps = {
    onToggleMode: vi.fn(),
    onStepChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders step 1 by default', () => {
    render(<RegisterForm {...defaultProps} />);

    expect(screen.getByRole('region', { name: 'Registro de negocio' })).toBeInTheDocument();
  });

  it('announces step 1 for screen readers', () => {
    render(<RegisterForm {...defaultProps} />);

    expect(screen.getByText('Paso 1 de 2: Tu negocio')).toBeInTheDocument();
  });

  it('calls onToggleMode when toggle link is clicked', async () => {
    const user = userEvent.setup();
    render(<RegisterForm {...defaultProps} />);

    const loginLink = screen.getByText('Inicia sesión');
    await user.click(loginLink);

    expect(defaultProps.onToggleMode).toHaveBeenCalled();
  });
});
