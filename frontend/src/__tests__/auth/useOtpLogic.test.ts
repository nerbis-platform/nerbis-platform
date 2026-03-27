import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOtpLogic } from '@/components/auth/hooks/useOtpLogic';

describe('useOtpLogic', () => {
  it('initializes with empty values', () => {
    const { result } = renderHook(() => useOtpLogic());

    expect(result.current.values).toEqual(['', '', '', '', '', '']);
    expect(result.current.code).toBe('');
    expect(result.current.isComplete).toBe(false);
  });

  it('respects custom length', () => {
    const { result } = renderHook(() => useOtpLogic({ length: 4 }));

    expect(result.current.values).toHaveLength(4);
  });

  it('updates digit on handleChange', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useOtpLogic({ onChange }));

    act(() => {
      result.current.handleChange(0, '5');
    });

    expect(result.current.values[0]).toBe('5');
    expect(onChange).toHaveBeenCalledWith(expect.stringContaining('5'));
  });

  it('sanitizes non-numeric input', () => {
    const { result } = renderHook(() => useOtpLogic());

    act(() => {
      result.current.handleChange(0, 'a');
    });

    // Non-digit input should be ignored
    expect(result.current.values[0]).toBe('');
  });

  it('detects completion when all digits filled', () => {
    const { result } = renderHook(() => useOtpLogic({ length: 3 }));

    act(() => {
      result.current.handleChange(0, '1');
    });
    act(() => {
      result.current.handleChange(1, '2');
    });
    act(() => {
      result.current.handleChange(2, '3');
    });

    expect(result.current.isComplete).toBe(true);
    expect(result.current.code).toBe('123');
  });

  it('resets all values', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useOtpLogic({ length: 3, onChange }));

    act(() => {
      result.current.handleChange(0, '1');
    });
    act(() => {
      result.current.handleChange(1, '2');
    });
    act(() => {
      result.current.reset();
    });

    expect(result.current.values).toEqual(['', '', '']);
    expect(result.current.code).toBe('');
    expect(result.current.isComplete).toBe(false);
  });

  it('calls onChange on each digit update', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useOtpLogic({ onChange }));

    act(() => {
      result.current.handleChange(0, '7');
    });

    expect(onChange).toHaveBeenCalled();
  });
});
