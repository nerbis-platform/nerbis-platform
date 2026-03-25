// src/components/auth/types.ts
// Shared TypeScript types for the auth component architecture.

import type { ReactNode } from 'react';
import type { Control, UseFormReturn } from 'react-hook-form';
import type {
  LoginFormValues,
  RegisterBusinessFormValues,
  ForgotEmailFormValues,
  ForgotResetFormValues,
} from './schemas';

// ─── Core Auth Types ────────────────────────────────────────────

export type AuthMode = 'login' | 'register' | 'forgot';
export type ForgotStep = 'email' | 'reset' | 'success';
export type RegisterStep = 1 | 2;

// ─── Brand Panel Types ──────────────────────────────────────────

export interface BrandSlide {
  id: string;
  headline: ReactNode;
  subtitle: ReactNode;
  features: string[];
}

export interface BrandContentMap {
  login: BrandSlide[];
  register: Record<RegisterStep, BrandSlide[]>;
  forgot: Record<ForgotStep, BrandSlide[]>;
}

export interface BrandPanelProps {
  mode: AuthMode;
  step: RegisterStep;
  forgotStep: ForgotStep;
  contentVisible: boolean;
}

export interface BrandCarouselProps {
  slides: BrandSlide[];
  interval?: number;
}

// ─── Main Orchestrator Props ────────────────────────────────────

export interface AuthSplitScreenProps {
  initialMode?: AuthMode;
  redirectTo?: string | null;
}

// ─── Form Component Props ───────────────────────────────────────

export interface LoginFormProps {
  onSubmit: (data: LoginFormValues) => void;
  isLoading: boolean;
  onToggleMode: () => void;
  onForgotPassword: () => void;
}

export interface RegisterFormProps {
  step: RegisterStep;
  onNextStep: () => void;
  onPrevStep: () => void;
  onSubmit: (data: RegisterBusinessFormValues) => void;
  isLoading: boolean;
  onToggleMode: () => void;
}

export interface ForgotPasswordFormProps {
  forgotStep: ForgotStep;
  onGoToLogin: () => void;
}

// ─── Shared Component Props ─────────────────────────────────────

export interface PasswordFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  control: Control<Record<string, string>>;
  disabled?: boolean;
  showStrength?: boolean;
  autoComplete?: string;
}

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export interface SocialLoginButtonsProps {
  mode: 'login' | 'register';
  onGoogleClick?: () => void;
  onAppleClick?: () => void;
  onFacebookClick?: () => void;
  onSwitchToRegister?: (prefill: { email: string; first_name: string; last_name: string; provider?: string; token?: string }) => void;
}

export interface FormDividerProps {
  text?: string;
}

export interface StepIndicatorProps {
  currentStep: RegisterStep;
  totalSteps?: number;
}

export interface SubmitButtonProps {
  isLoading: boolean;
  children: ReactNode;
  disabled?: boolean;
  type?: 'submit' | 'button';
  onClick?: () => void;
}

export interface ReactivateDialogProps {
  open: boolean;
  onClose: () => void;
  onReactivate: () => void;
  isLoading: boolean;
}

// ─── Internal V1 panel props (for backward compat) ──────────────

export interface LoginFormPanelProps {
  form: UseFormReturn<LoginFormValues>;
  onSubmit: (data: LoginFormValues) => void;
  isLoading: boolean;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  onToggleMode: () => void;
  onForgotPassword: () => void;
}

export interface RegisterFormPanelProps {
  form: UseFormReturn<RegisterBusinessFormValues>;
  step: RegisterStep;
  onNextStep: () => void;
  onPrevStep: () => void;
  onSubmit: (data: RegisterBusinessFormValues) => void;
  isLoading: boolean;
  phoneCodeOpen: boolean;
  setPhoneCodeOpen: (v: boolean) => void;
  phoneCountry: string;
  setPhoneCountry: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  showPassword2: boolean;
  setShowPassword2: (v: boolean) => void;
  businessNameExists: boolean;
  checkingName: boolean;
  emailExists: boolean;
  checkingEmail: boolean;
  passwordsMatch: boolean;
  onToggleMode: () => void;
}

export interface ForgotPasswordFormPanelProps {
  forgotStep: ForgotStep;
  email: string;
  emailForm: UseFormReturn<ForgotEmailFormValues>;
  resetForm: UseFormReturn<ForgotResetFormValues>;
  onEmailSubmit: (data: ForgotEmailFormValues) => void;
  onResetSubmit: (data: ForgotResetFormValues) => void;
  onResendCode: () => void;
  onGoToLogin: () => void;
  isLoading: boolean;
  isResending: boolean;
  otpDigits: string[];
  otpInputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  onOtpChange: (index: number, value: string) => void;
  onOtpKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  showNewPassword: boolean;
  setShowNewPassword: (v: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (v: boolean) => void;
}
