// src/components/auth/index.ts
// Barrel export for all auth V2 components, types, schemas, and hooks.

// ─── Forms ───────────────────────────────────────────────────────
export { LoginForm } from './LoginForm';
export { RegisterForm } from './RegisterForm';
export { RegisterStep1 } from './RegisterStep1';
export { RegisterStep2 } from './RegisterStep2';
export { ForgotPasswordForm } from './ForgotPasswordForm';

// ─── Shared UI Components ────────────────────────────────────────
export { PasswordField } from './PasswordField';
export { OtpInput } from './OtpInput';
export { FormDivider } from './FormDivider';
export { SocialLoginButtons } from './SocialLoginButtons';
export { PasskeyButton } from './PasskeyButton';
export { StepIndicator } from './StepIndicator';
export { SubmitButton } from './SubmitButton';
export { ReactivateDialog } from './ReactivateDialog';

// ─── Brand Panel ─────────────────────────────────────────────────
export { BrandPanel } from './BrandPanel';
export { BrandCarousel } from './BrandCarousel';
export { BrandLogo } from './BrandLogo';
export { brandSlides } from './brand-content';

// ─── Orchestrator ────────────────────────────────────────────────
export { default as AuthSplitScreenV2 } from './AuthSplitScreenV2';

// ─── Types ───────────────────────────────────────────────────────
export type {
  AuthMode,
  ForgotStep,
  RegisterStep,
  BrandSlide,
  BrandContentMap,
  BrandPanelProps,
  BrandCarouselProps,
  AuthSplitScreenProps,
  LoginFormProps,
  RegisterFormProps,
  ForgotPasswordFormProps,
  PasswordFieldProps,
  OtpInputProps,
  SocialLoginButtonsProps,
  FormDividerProps,
  StepIndicatorProps,
  SubmitButtonProps,
  ReactivateDialogProps,
} from './types';

// ─── Schemas & Validation ────────────────────────────────────────
export {
  loginSchema,
  registerBusinessSchema,
  forgotEmailSchema,
  forgotResetSchema,
  passwordRules,
} from './schemas';
export type {
  LoginFormValues,
  RegisterBusinessFormValues,
  ForgotEmailFormValues,
  ForgotResetFormValues,
} from './schemas';

// ─── Constants ───────────────────────────────────────────────────
export {
  industries,
  countries,
  DEFAULT_PHONE_COUNTRY,
  DEBOUNCE_DELAY_MS,
  OTP_LENGTH,
  AUTH_GRADIENT,
  AUTH_RADIAL_GLOW,
} from './constants';
export type { IndustryOption, CountryOption } from './constants';

// ─── Hooks (re-export from hooks barrel) ─────────────────────────
export {
  useReducedMotion,
  useDebounce,
  useOtpLogic,
  useAuthForm,
} from './hooks';
export type { UseOtpLogicOptions, UseOtpLogicReturn, UseAuthFormOptions, UseAuthFormReturn } from './hooks';
