import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { PasswordField } from '@/components/auth/PasswordField';
import { Form } from '@/components/ui/form';

function Wrapper({ showStrength = false }: { showStrength?: boolean }) {
  const form = useForm({
    defaultValues: { password: '' },
  });

  return (
    <Form {...form}>
      <form>
        <PasswordField
          name="password"
          label="Contraseña"
          placeholder="••••••••"
          control={form.control as unknown as Control<Record<string, string>>}
          showStrength={showStrength}
        />
      </form>
    </Form>
  );
}

function WrapperWithValue({ value }: { value: string }) {
  const form = useForm({
    defaultValues: { password: value },
  });

  return (
    <Form {...form}>
      <form>
        <PasswordField
          name="password"
          label="Contraseña"
          placeholder="••••••••"
          control={form.control as unknown as Control<Record<string, string>>}
          showStrength
        />
      </form>
    </Form>
  );
}

describe('PasswordField', () => {
  it('renders with label', () => {
    render(<Wrapper />);

    expect(screen.getByText('Contraseña')).toBeInTheDocument();
  });

  it('starts with password hidden (type=password)', () => {
    render(<Wrapper />);

    const input = screen.getByPlaceholderText('••••••••');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('toggles to visible on show button click', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    const toggleButton = screen.getByRole('button', { name: 'Mostrar contraseña' });
    await user.click(toggleButton);

    const input = screen.getByPlaceholderText('••••••••');
    expect(input).toHaveAttribute('type', 'text');
  });

  it('toggles back to hidden on second click', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    const toggleButton = screen.getByRole('button', { name: 'Mostrar contraseña' });
    await user.click(toggleButton);
    const hideButton = screen.getByRole('button', { name: 'Ocultar contraseña' });
    await user.click(hideButton);

    const input = screen.getByPlaceholderText('••••••••');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('shows toggle button with aria-pressed attribute', () => {
    render(<Wrapper />);

    const toggleButton = screen.getByRole('button', { name: 'Mostrar contraseña' });
    expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders strength rules when showStrength is true and has value', () => {
    render(<WrapperWithValue value="Abc12345" />);

    expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Una letra minúscula')).toBeInTheDocument();
    expect(screen.getByText('Una letra mayúscula')).toBeInTheDocument();
    expect(screen.getByText('Un número')).toBeInTheDocument();
  });

  it('does not render strength rules when showStrength is false', () => {
    render(<Wrapper showStrength={false} />);

    expect(screen.queryByText('Mínimo 8 caracteres')).not.toBeInTheDocument();
  });
});
