// src/components/auth/schemas.ts
// Shared Zod validation schemas for auth forms.

import * as z from 'zod';

// ─── Shared Rules ───────────────────────────────────────────────

export const passwordRules = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[a-z]/, 'Debe incluir una minúscula')
  .regex(/[A-Z]/, 'Debe incluir una mayúscula')
  .regex(/[0-9]/, 'Debe incluir un número');

// ─── Login ──────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// ─── Register Business ──────────────────────────────────────────

export const registerBusinessSchema = z
  .object({
    business_name: z
      .string()
      .min(2, 'El nombre del negocio debe tener al menos 2 caracteres'),
    industry: z.string().optional(),
    country: z.string().min(1, 'Selecciona tu país'),
    first_name: z
      .string()
      .min(2, 'El nombre debe tener al menos 2 caracteres'),
    last_name: z
      .string()
      .min(2, 'El apellido debe tener al menos 2 caracteres'),
    email: z.string().email('Email inválido'),
    phone: z
      .string()
      .regex(/^[\d\s]*$/, 'Solo números')
      .optional(),
    password: passwordRules,
    password2: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.password2, {
    message: 'Las contraseñas no coinciden',
    path: ['password2'],
  });

export type RegisterBusinessFormValues = z.infer<
  typeof registerBusinessSchema
>;

// ─── Forgot Password — Email Step ───────────────────────────────

export const forgotEmailSchema = z.object({
  email: z.string().email('Email inválido'),
});

export type ForgotEmailFormValues = z.infer<typeof forgotEmailSchema>;

// ─── Forgot Password — Reset Step ───────────────────────────────

export const forgotResetSchema = z
  .object({
    code: z.string().length(6, 'El código debe tener 6 dígitos'),
    newPassword: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
      .regex(/[a-z]/, 'Debe incluir al menos una minúscula')
      .regex(/[0-9]/, 'Debe incluir al menos un número'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type ForgotResetFormValues = z.infer<typeof forgotResetSchema>;
