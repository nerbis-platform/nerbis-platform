import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

// ─── Mocks ──────────────────────────────────────────────────────

const mockRequestOTP = vi.fn();
const mockVerifyOTP = vi.fn();

vi.mock('@/lib/api/auth', () => ({
  platformRequestPasswordResetOTP: (...args: unknown[]) => mockRequestOTP(...args),
  platformVerifyPasswordResetOTP: (...args: unknown[]) => mockVerifyOTP(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('ForgotPasswordForm', () => {
  const defaultProps = {
    onGoToLogin: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequestOTP.mockResolvedValue(undefined);
    mockVerifyOTP.mockResolvedValue(undefined);
  });

  // ── Step: Email ───────────────────────────────────────────────

  it('renders email step by default', () => {
    render(<ForgotPasswordForm {...defaultProps} />);

    expect(screen.getByText('Recupera tu contraseña')).toBeInTheDocument();
    expect(
      screen.getByText('Ingresa tu email y te enviaremos un código de verificación.'),
    ).toBeInTheDocument();
  });

  it('renders email input and submit button', () => {
    render(<ForgotPasswordForm {...defaultProps} />);

    expect(screen.getByPlaceholderText('tu@email.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar código' })).toBeInTheDocument();
  });

  it('renders back to login link', () => {
    render(<ForgotPasswordForm {...defaultProps} />);

    expect(screen.getByText('Volver a iniciar sesión')).toBeInTheDocument();
  });

  it('calls onGoToLogin when back link is clicked', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm {...defaultProps} />);

    await user.click(screen.getByText('Volver a iniciar sesión'));

    expect(defaultProps.onGoToLogin).toHaveBeenCalled();
  });

  it('does not submit with empty email', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Enviar código' }));

    await waitFor(() => {
      expect(mockRequestOTP).not.toHaveBeenCalled();
    });
  });

  it('does not submit with invalid email', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm {...defaultProps} />);

    await user.type(screen.getByPlaceholderText('tu@email.com'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Enviar código' }));

    await waitFor(() => {
      expect(mockRequestOTP).not.toHaveBeenCalled();
    });
  });

  it('submits email and transitions to reset step', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm {...defaultProps} />);

    await user.type(screen.getByPlaceholderText('tu@email.com'), 'test@email.com');
    await user.click(screen.getByRole('button', { name: 'Enviar código' }));

    await waitFor(() => {
      expect(mockRequestOTP).toHaveBeenCalledWith('test@email.com');
    });

    // Should transition to reset step
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Nueva contraseña' })).toBeInTheDocument();
    });
  });

  // ── Step: Reset ───────────────────────────────────────────────

  it('shows email address in reset step', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm {...defaultProps} />);

    await user.type(screen.getByPlaceholderText('tu@email.com'), 'test@email.com');
    await user.click(screen.getByRole('button', { name: 'Enviar código' }));

    await waitFor(() => {
      expect(screen.getByText('test@email.com')).toBeInTheDocument();
    });
  });

  it('shows OTP input in reset step', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm {...defaultProps} />);

    await user.type(screen.getByPlaceholderText('tu@email.com'), 'test@email.com');
    await user.click(screen.getByRole('button', { name: 'Enviar código' }));

    await waitFor(() => {
      expect(
        screen.getByRole('group', { name: 'Código de verificación' }),
      ).toBeInTheDocument();
    });
  });

  it('shows resend code link in reset step', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm {...defaultProps} />);

    await user.type(screen.getByPlaceholderText('tu@email.com'), 'test@email.com');
    await user.click(screen.getByRole('button', { name: 'Enviar código' }));

    await waitFor(() => {
      expect(screen.getByText('¿No recibiste el código? Reenviar')).toBeInTheDocument();
    });
  });

  it('has accessible section landmark', () => {
    render(<ForgotPasswordForm {...defaultProps} />);

    expect(screen.getByRole('region', { name: 'Recuperar contraseña' })).toBeInTheDocument();
  });
});
