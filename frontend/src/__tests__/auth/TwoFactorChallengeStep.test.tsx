import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TwoFactorChallengeStep } from '@/components/auth/TwoFactorChallengeStep';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockComplete = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    completeTwoFactorChallenge: mockComplete,
    setUser: vi.fn(),
    setTenant: vi.fn(),
    user: null,
    isAuthenticated: false,
  }),
}));

vi.mock('@/lib/api/passkey', () => ({
  isWebAuthnSupported: () => false,
}));

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
    info: vi.fn(),
  },
}));

describe('TwoFactorChallengeStep', () => {
  const defaultProps = {
    challengeToken: 'challenge-abc',
    onBack: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the TOTP input and header copy', () => {
    render(<TwoFactorChallengeStep {...defaultProps} />);
    expect(screen.getByText('Verifica tu identidad')).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Código de verificación' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Verificar' }),
    ).toBeInTheDocument();
  });

  it('submits the TOTP code and calls completeTwoFactorChallenge', async () => {
    const user = userEvent.setup();
    mockComplete.mockResolvedValue(undefined);
    render(<TwoFactorChallengeStep {...defaultProps} />);

    // 6 digit inputs; type into each
    const inputs = screen.getAllByLabelText(/Dígito \d de 6/);
    expect(inputs).toHaveLength(6);
    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i], String(i + 1));
    }

    await user.click(screen.getByRole('button', { name: 'Verificar' }));

    await waitFor(() => {
      expect(mockComplete).toHaveBeenCalledWith(
        'challenge-abc',
        '123456',
        undefined,
      );
    });
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('shows an error and clears the input when the API rejects the code', async () => {
    const user = userEvent.setup();
    mockComplete.mockRejectedValue(new Error('Código 2FA inválido'));
    render(<TwoFactorChallengeStep {...defaultProps} />);

    const inputs = screen.getAllByLabelText(/Dígito \d de 6/);
    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i], '1');
    }
    await user.click(screen.getByRole('button', { name: 'Verificar' }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled();
    });
    // Inputs should be empty again after clear
    const freshInputs = screen.getAllByLabelText(/Dígito \d de 6/);
    freshInputs.forEach((input) => {
      expect((input as HTMLInputElement).value).toBe('');
    });
  });

  it('rejects TOTP submit when the code is incomplete', async () => {
    const user = userEvent.setup();
    render(<TwoFactorChallengeStep {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Verificar' }));
    await waitFor(() => {
      expect(toastError).toHaveBeenCalled();
    });
    expect(mockComplete).not.toHaveBeenCalled();
  });

  it('toggles to backup code mode and accepts an XXXX-XXXX code', async () => {
    const user = userEvent.setup();
    mockComplete.mockResolvedValue(undefined);
    render(<TwoFactorChallengeStep {...defaultProps} />);

    await user.click(
      screen.getByRole('button', { name: 'Usar código de respaldo' }),
    );

    const backupInput = screen.getByLabelText('Código de respaldo');
    await user.type(backupInput, 'abcd-1234');

    await user.click(screen.getByRole('button', { name: 'Verificar' }));

    await waitFor(() => {
      expect(mockComplete).toHaveBeenCalledWith(
        'challenge-abc',
        'ABCD-1234',
        undefined,
      );
    });
  });

  it('calls onBack when the "Volver" link is clicked', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<TwoFactorChallengeStep {...defaultProps} onBack={onBack} />);

    await user.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalled();
  });
});
