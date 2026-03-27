import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OtpInput } from '@/components/auth/OtpInput';

describe('OtpInput', () => {
  it('renders 6 inputs by default', () => {
    render(<OtpInput value="" onChange={vi.fn()} />);

    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(6);
  });

  it('renders custom number of inputs', () => {
    render(<OtpInput value="" onChange={vi.fn()} length={4} />);

    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(4);
  });

  it('displays existing value in inputs', () => {
    render(<OtpInput value="123" onChange={vi.fn()} />);

    const inputs = screen.getAllByRole('textbox');
    expect(inputs[0]).toHaveValue('1');
    expect(inputs[1]).toHaveValue('2');
    expect(inputs[2]).toHaveValue('3');
    expect(inputs[3]).toHaveValue('');
  });

  it('calls onChange when a digit is entered', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} />);

    const inputs = screen.getAllByRole('textbox');
    await user.click(inputs[0]);
    await user.keyboard('5');

    expect(onChange).toHaveBeenCalled();
  });

  it('has accessible labels for each input', () => {
    render(<OtpInput value="" onChange={vi.fn()} />);

    expect(screen.getByLabelText('Dígito 1 de 6')).toBeInTheDocument();
    expect(screen.getByLabelText('Dígito 6 de 6')).toBeInTheDocument();
  });

  it('wraps inputs in a group with aria-label', () => {
    render(<OtpInput value="" onChange={vi.fn()} />);

    expect(screen.getByRole('group', { name: 'Código de verificación' })).toBeInTheDocument();
  });

  it('disables all inputs when disabled prop is true', () => {
    render(<OtpInput value="" onChange={vi.fn()} disabled />);

    const inputs = screen.getAllByRole('textbox');
    for (const input of inputs) {
      expect(input).toBeDisabled();
    }
  });

  it('handles paste of full code', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} />);

    const inputs = screen.getAllByRole('textbox');
    await user.click(inputs[0]);
    await user.paste('123456');

    expect(onChange).toHaveBeenCalled();
  });
});
