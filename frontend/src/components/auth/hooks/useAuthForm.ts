// src/components/auth/hooks/useAuthForm.ts
// Shared auth form logic: React Hook Form + Zod validation + loading state.

'use client';

import { useState, useCallback } from 'react';
import {
  useForm,
  type UseFormReturn,
  type DefaultValues,
  type FieldValues,
  type Resolver,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type * as z from 'zod';

export interface UseAuthFormOptions<T extends FieldValues> {
  /** Zod schema for validation. */
  schema: z.ZodType<T>;
  /** Default form values. */
  defaultValues: DefaultValues<T>;
  /** Async submit handler — called after successful validation. */
  onSubmit: (data: T) => Promise<void> | void;
}

export interface UseAuthFormReturn<T extends FieldValues> {
  /** React Hook Form instance (register, control, formState, etc.). */
  form: UseFormReturn<T>;
  /** Whether the form is currently submitting. */
  isLoading: boolean;
  /** Form submit handler — pass to <form onSubmit={handleSubmit}>. */
  handleSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
}

/**
 * Wraps `useForm` with Zod resolver, loading state management, and
 * error handling via toast. Generic enough for login, register, and
 * forgot-password forms.
 *
 * @example
 * ```tsx
 * const { form, isLoading, handleSubmit } = useAuthForm({
 *   schema: loginSchema,
 *   defaultValues: { email: '', password: '' },
 *   onSubmit: async (data) => { await login(data); },
 * });
 * ```
 */
export function useAuthForm<T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
}: UseAuthFormOptions<T>): UseAuthFormReturn<T> {
  const [isLoading, setIsLoading] = useState(false);

  // Cast required: Zod v4 generic types don't align 1:1 with react-hook-form's
  // Resolver generics. The runtime behavior is correct — only the type layer
  // needs the bridge.
  const form = useForm<T>({
    resolver: zodResolver(schema as Parameters<typeof zodResolver>[0]) as Resolver<T>,
    defaultValues,
  });

  const handleSubmit = useCallback(
    async (e?: React.BaseSyntheticEvent) => {
      await form.handleSubmit(async (data) => {
        setIsLoading(true);
        try {
          await onSubmit(data as T);
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : 'Ocurrió un error inesperado';
          toast.error(message);
        } finally {
          setIsLoading(false);
        }
      })(e);
    },
    [form, onSubmit],
  );

  return { form: form as UseFormReturn<T>, isLoading, handleSubmit };
}
