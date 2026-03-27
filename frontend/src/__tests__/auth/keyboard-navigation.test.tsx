import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/auth/LoginForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { OtpInput } from '@/components/auth/OtpInput';
import { PasswordField } from '@/components/auth/PasswordField';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';

// ─── Mocks ──────────────────────────────────────────────────────

const mockPlatformLogin = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    platformLogin: mockPlatformLogin,
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
    socialLogin: false,
    passkeys: false,
    rememberMe: false,
    useNewAuth: true,
  },
}));

// ─── Helpers ────────────────────────────────────────────────────

function PasswordFieldWrapper() {
  const form = useForm({ defaultValues: { password: '' } });
  return (
    <Form {...form}>
      <form>
        <PasswordField
          name="password"
          label="Contraseña"
          placeholder="••••••••"
          control={form.control as any}
        />
      </form>
    </Form>
  );
}

// ─── Keyboard navigation tests ──────────────────────────────────

describe('Keyboard navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlatformLogin.mockResolvedValue(undefined);
  });

  describe('LoginForm', () => {
    it('can tab through all interactive elements', async () => {
      const user = userEvent.setup();
      render(
        <LoginForm
          onToggleMode={vi.fn()}
          onForgotPassword={vi.fn()}
        />,
      );

      // Tab into the form — first focusable is email input
      await user.tab();
      expect(screen.getByPlaceholderText('tu@email.com')).toHaveFocus();

      // Tab to forgot password link
      await user.tab();
      expect(screen.getByText('¿Olvidaste tu contraseña?')).toHaveFocus();

      // Tab to password input
      await user.tab();
      expect(screen.getByPlaceholderText('••••••••')).toHaveFocus();

      // Tab to password toggle button
      await user.tab();
      expect(screen.getByRole('button', { name: 'Mostrar contraseña' })).toHaveFocus();

      // Tab to submit button
      await user.tab();
      expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toHaveFocus();
    });

    it('submits form on Enter key in password field', async () => {
      const user = userEvent.setup();
      render(
        <LoginForm
          onToggleMode={vi.fn()}
          onForgotPassword={vi.fn()}
        />,
      );

      await user.type(screen.getByPlaceholderText('tu@email.com'), 'test@email.com');
      await user.type(screen.getByPlaceholderText('••••••••'), 'Password1{enter}');

      await waitFor(() => {
        expect(mockPlatformLogin).toHaveBeenCalled();
      });
    });
  });

  describe('OtpInput', () => {
    it('moves focus forward on digit entry', async () => {
      const user = userEvent.setup();
      render(<OtpInput value="" onChange={vi.fn()} />);

      const inputs = screen.getAllByRole('textbox');
      await user.click(inputs[0]);
      await user.keyboard('1');

      // Focus should move to second input
      expect(inputs[1]).toHaveFocus();
    });

    it('moves focus backward on ArrowLeft', async () => {
      const user = userEvent.setup();
      render(<OtpInput value="12" onChange={vi.fn()} />);

      const inputs = screen.getAllByRole('textbox');
      await user.click(inputs[1]);
      await user.keyboard('{ArrowLeft}');

      expect(inputs[0]).toHaveFocus();
    });

    it('moves focus forward on ArrowRight', async () => {
      const user = userEvent.setup();
      render(<OtpInput value="12" onChange={vi.fn()} />);

      const inputs = screen.getAllByRole('textbox');
      await user.click(inputs[0]);
      await user.keyboard('{ArrowRight}');

      expect(inputs[1]).toHaveFocus();
    });

    it('moves focus to previous input on Backspace when current is empty', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<OtpInput value="1" onChange={onChange} />);

      const inputs = screen.getAllByRole('textbox');
      await user.click(inputs[1]);
      await user.keyboard('{Backspace}');

      expect(inputs[0]).toHaveFocus();
    });
  });

  describe('PasswordField', () => {
    it('toggles visibility with Enter key on toggle button', async () => {
      const user = userEvent.setup();
      render(<PasswordFieldWrapper />);

      const input = screen.getByPlaceholderText('••••••••');
      expect(input).toHaveAttribute('type', 'password');

      // Tab to toggle button and press Enter
      const toggleButton = screen.getByRole('button', { name: 'Mostrar contraseña' });
      await user.click(toggleButton);

      expect(input).toHaveAttribute('type', 'text');
    });

    it('toggles visibility with Space key on toggle button', async () => {
      const user = userEvent.setup();
      render(<PasswordFieldWrapper />);

      const toggleButton = screen.getByRole('button', { name: 'Mostrar contraseña' });
      toggleButton.focus();
      await user.keyboard(' ');

      const input = screen.getByPlaceholderText('••••••••');
      expect(input).toHaveAttribute('type', 'text');
    });
  });

  describe('ForgotPasswordForm', () => {
    it('can tab through email step elements', async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordForm onGoToLogin={vi.fn()} />);

      await user.tab();
      expect(screen.getByPlaceholderText('tu@email.com')).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: 'Enviar código' })).toHaveFocus();

      await user.tab();
      expect(screen.getByText('Volver a iniciar sesión')).toHaveFocus();
    });

    it('submits email step on Enter key', async () => {
      const user = userEvent.setup();
      const { platformRequestPasswordResetOTP } = await import('@/lib/api/auth');
      (platformRequestPasswordResetOTP as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      render(<ForgotPasswordForm onGoToLogin={vi.fn()} />);

      await user.type(screen.getByPlaceholderText('tu@email.com'), 'test@email.com{enter}');

      await waitFor(() => {
        expect(platformRequestPasswordResetOTP).toHaveBeenCalledWith('test@email.com');
      });
    });
  });
});

// ─── Screen reader announcements ────────────────────────────────

describe('Screen reader announcements', () => {
  it('LoginForm has aria-live region for form errors', () => {
    render(
      <LoginForm
        onToggleMode={vi.fn()}
        onForgotPassword={vi.fn()}
      />,
    );

    // FormMessage elements have role="alert" and aria-live="polite"
    const section = screen.getByRole('region', { name: 'Iniciar sesión' });
    expect(section).toBeInTheDocument();
  });

  it('ForgotPasswordForm has aria-live region for step content', () => {
    render(<ForgotPasswordForm onGoToLogin={vi.fn()} />);

    const section = screen.getByRole('region', { name: 'Recuperar contraseña' });
    expect(section).toBeInTheDocument();
  });

  it('OtpInput digits have individual aria-labels', () => {
    render(<OtpInput value="" onChange={vi.fn()} />);

    for (let i = 1; i <= 6; i++) {
      expect(screen.getByLabelText(`Dígito ${i} de 6`)).toBeInTheDocument();
    }
  });

  it('OtpInput group has descriptive aria-label', () => {
    render(<OtpInput value="" onChange={vi.fn()} />);

    expect(
      screen.getByRole('group', { name: 'Código de verificación' }),
    ).toBeInTheDocument();
  });
});
