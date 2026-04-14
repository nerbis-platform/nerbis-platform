// src/components/auth/types.ts
// Shared TypeScript types for the auth component architecture.

import type { ReactNode } from 'react';
import type { Control } from 'react-hook-form';
import type {
  LoginFormValues,
  RegisterBusinessFormValues,
} from './schemas';

// ─── Core Auth Types ────────────────────────────────────────────

export type AuthMode = 'login' | 'register' | 'forgot' | 'reactivate';
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

export interface AuthPrefill {
  email: string;
  first_name: string;
  last_name: string;
  avatar?: string;
  provider?: string;
  token?: string;
}

export interface SocialLoginButtonsProps {
  mode: 'login' | 'register';
  onGoogleClick?: () => void;
  onAppleClick?: () => void;
  onFacebookClick?: () => void;
  onSwitchToRegister?: (prefill: AuthPrefill) => void;
  /**
   * Se invoca cuando el backend responde que el usuario tiene 2FA activo.
   * Permite al formulario padre mostrar el paso de verificación TOTP
   * en lugar de persistir tokens.
   */
  onTwoFactorRequired?: (challengeToken: string, methods: string[]) => void;
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

