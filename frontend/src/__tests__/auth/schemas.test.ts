import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerBusinessSchema,
  forgotEmailSchema,
  forgotResetSchema,
  passwordRules,
} from '@/components/auth/schemas';

// ─── passwordRules ──────────────────────────────────────────────

describe('passwordRules', () => {
  it('rejects passwords shorter than 8 characters', () => {
    const result = passwordRules.safeParse('Ab1');
    expect(result.success).toBe(false);
  });

  it('rejects passwords without a lowercase letter', () => {
    const result = passwordRules.safeParse('ABCDEFG1');
    expect(result.success).toBe(false);
  });

  it('rejects passwords without an uppercase letter', () => {
    const result = passwordRules.safeParse('abcdefg1');
    expect(result.success).toBe(false);
  });

  it('rejects passwords without a number', () => {
    const result = passwordRules.safeParse('Abcdefgh');
    expect(result.success).toBe(false);
  });

  it('accepts a valid password', () => {
    const result = passwordRules.safeParse('Abcdefg1');
    expect(result.success).toBe(true);
  });
});

// ─── loginSchema ────────────────────────────────────────────────

describe('loginSchema', () => {
  it('accepts valid login data', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: '12345678',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: '12345678',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 characters', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: '1234567',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty email', () => {
    const result = loginSchema.safeParse({
      email: '',
      password: '12345678',
    });
    expect(result.success).toBe(false);
  });
});

// ─── registerBusinessSchema ─────────────────────────────────────

describe('registerBusinessSchema', () => {
  const validData = {
    business_name: 'Mi Negocio',
    industry: 'beauty',
    country: 'Colombia',
    first_name: 'Juan',
    last_name: 'Pérez',
    email: 'juan@test.com',
    phone: '3001234567',
    password: 'Abcdefg1',
    password2: 'Abcdefg1',
  };

  it('accepts valid registration data', () => {
    const result = registerBusinessSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = registerBusinessSchema.safeParse({
      ...validData,
      password2: 'Different1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects business_name shorter than 2 chars', () => {
    const result = registerBusinessSchema.safeParse({
      ...validData,
      business_name: 'A',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty country', () => {
    const result = registerBusinessSchema.safeParse({
      ...validData,
      country: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects phone with letters', () => {
    const result = registerBusinessSchema.safeParse({
      ...validData,
      phone: '300abc',
    });
    expect(result.success).toBe(false);
  });

  it('allows empty phone (optional)', () => {
    const result = registerBusinessSchema.safeParse({
      ...validData,
      phone: '',
    });
    expect(result.success).toBe(true);
  });

  it('allows omitted industry (optional)', () => {
    const result = registerBusinessSchema.safeParse({
      ...validData,
      industry: undefined,
    });
    expect(result.success).toBe(true);
  });

  it('rejects weak password (no uppercase)', () => {
    const result = registerBusinessSchema.safeParse({
      ...validData,
      password: 'abcdefg1',
      password2: 'abcdefg1',
    });
    expect(result.success).toBe(false);
  });
});

// ─── forgotEmailSchema ──────────────────────────────────────────

describe('forgotEmailSchema', () => {
  it('accepts valid email', () => {
    const result = forgotEmailSchema.safeParse({ email: 'test@email.com' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = forgotEmailSchema.safeParse({ email: 'invalid' });
    expect(result.success).toBe(false);
  });
});

// ─── forgotResetSchema ──────────────────────────────────────────

describe('forgotResetSchema', () => {
  const validData = {
    code: '123456',
    newPassword: 'Abcdefg1',
    confirmPassword: 'Abcdefg1',
  };

  it('accepts valid reset data', () => {
    const result = forgotResetSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects code with wrong length', () => {
    const result = forgotResetSchema.safeParse({
      ...validData,
      code: '12345',
    });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched passwords', () => {
    const result = forgotResetSchema.safeParse({
      ...validData,
      confirmPassword: 'Different1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects weak newPassword', () => {
    const result = forgotResetSchema.safeParse({
      ...validData,
      newPassword: 'weakpass',
      confirmPassword: 'weakpass',
    });
    expect(result.success).toBe(false);
  });
});
