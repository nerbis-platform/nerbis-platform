// src/components/auth/AuthSplitScreen.tsx

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, ArrowRight, ArrowLeft, Check, ChevronsUpDown, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { requestReactivationOTP, platformRequestPasswordResetOTP, platformVerifyPasswordResetOTP } from '@/lib/api/auth';

// ─── Static Data ───────────────────────────────────────────────

const industries = [
  { value: 'beauty', label: 'Salón de Belleza / Barbería' },
  { value: 'spa', label: 'Spa / Centro de Bienestar' },
  { value: 'nails', label: 'Uñas / Nail Bar' },
  { value: 'gym', label: 'Gimnasio / Fitness' },
  { value: 'yoga', label: 'Yoga / Pilates / Danza' },
  { value: 'clinic', label: 'Clínica / Consultorio Médico' },
  { value: 'dental', label: 'Odontología' },
  { value: 'psychology', label: 'Psicología / Terapias' },
  { value: 'nutrition', label: 'Nutrición / Dietética' },
  { value: 'veterinary', label: 'Veterinaria / Pet Shop' },
  { value: 'restaurant', label: 'Restaurante / Cafetería' },
  { value: 'bakery', label: 'Panadería / Pastelería' },
  { value: 'store', label: 'Tienda / Retail' },
  { value: 'fashion', label: 'Moda / Boutique' },
  { value: 'education', label: 'Academia / Educación' },
  { value: 'coworking', label: 'Coworking / Oficina' },
  { value: 'photography', label: 'Fotografía / Videografía' },
  { value: 'architecture', label: 'Arquitectura / Diseño' },
  { value: 'legal', label: 'Abogados / Consultoría Legal' },
  { value: 'accounting', label: 'Contabilidad / Finanzas' },
  { value: 'marketing', label: 'Marketing / Publicidad' },
  { value: 'tech', label: 'Tecnología / Software' },
  { value: 'real_estate', label: 'Inmobiliaria' },
  { value: 'automotive', label: 'Automotriz / Taller Mecánico' },
  { value: 'events', label: 'Eventos / Wedding Planner' },
  { value: 'travel', label: 'Turismo / Agencia de Viajes' },
  { value: 'services', label: 'Servicios Profesionales' },
  { value: 'other', label: 'Otro' },
];

const countries = [
  { value: 'Colombia', label: 'Colombia', flag: '🇨🇴', code: '+57' },
  { value: 'México', label: 'México', flag: '🇲🇽', code: '+52' },
  { value: 'España', label: 'España', flag: '🇪🇸', code: '+34' },
  { value: 'Perú', label: 'Perú', flag: '🇵🇪', code: '+51' },
  { value: 'Chile', label: 'Chile', flag: '🇨🇱', code: '+56' },
  { value: 'Argentina', label: 'Argentina', flag: '🇦🇷', code: '+54' },
  { value: 'Ecuador', label: 'Ecuador', flag: '🇪🇨', code: '+593' },
  { value: 'Estados Unidos', label: 'Estados Unidos', flag: '🇺🇸', code: '+1' },
  { value: 'Brasil', label: 'Brasil', flag: '🇧🇷', code: '+55' },
  { value: 'Costa Rica', label: 'Costa Rica', flag: '🇨🇷', code: '+506' },
  { value: 'Panamá', label: 'Panamá', flag: '🇵🇦', code: '+507' },
  { value: 'Uruguay', label: 'Uruguay', flag: '🇺🇾', code: '+598' },
  { value: 'Paraguay', label: 'Paraguay', flag: '🇵🇾', code: '+595' },
  { value: 'Bolivia', label: 'Bolivia', flag: '🇧🇴', code: '+591' },
  { value: 'Venezuela', label: 'Venezuela', flag: '🇻🇪', code: '+58' },
  { value: 'Guatemala', label: 'Guatemala', flag: '🇬🇹', code: '+502' },
  { value: 'Honduras', label: 'Honduras', flag: '🇭🇳', code: '+504' },
  { value: 'El Salvador', label: 'El Salvador', flag: '🇸🇻', code: '+503' },
  { value: 'Nicaragua', label: 'Nicaragua', flag: '🇳🇮', code: '+505' },
  { value: 'República Dominicana', label: 'República Dominicana', flag: '🇩🇴', code: '+1' },
  { value: 'Puerto Rico', label: 'Puerto Rico', flag: '🇵🇷', code: '+1' },
  { value: 'Cuba', label: 'Cuba', flag: '🇨🇺', code: '+53' },
];

// ─── Schemas ────────────────────────────────────────────────────

const registerBusinessSchema = z.object({
  business_name: z.string().min(2, 'El nombre del negocio debe tener al menos 2 caracteres'),
  industry: z.string().optional(),
  country: z.string().min(1, 'Selecciona tu país'),
  first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().regex(/^[\d\s]*$/, 'Solo números').optional(),
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[a-z]/, 'Debe incluir una minúscula')
    .regex(/[A-Z]/, 'Debe incluir una mayúscula')
    .regex(/[0-9]/, 'Debe incluir un número'),
  password2: z.string().min(1, 'Confirma tu contraseña'),
}).refine((data) => data.password === data.password2, {
  message: 'Las contraseñas no coinciden',
  path: ['password2'],
});

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

const forgotEmailSchema = z.object({
  email: z.string().email('Email inválido'),
});

const forgotResetSchema = z.object({
  code: z.string().length(6, 'El código debe tener 6 dígitos'),
  newPassword: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
    .regex(/[a-z]/, 'Debe incluir al menos una minúscula')
    .regex(/[0-9]/, 'Debe incluir al menos un número'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type RegisterBusinessFormValues = z.infer<typeof registerBusinessSchema>;
type LoginFormValues = z.infer<typeof loginSchema>;
type ForgotEmailFormValues = z.infer<typeof forgotEmailSchema>;
type ForgotResetFormValues = z.infer<typeof forgotResetSchema>;
type ForgotStep = 'email' | 'reset' | 'success';

// ─── Info Panel Content ─────────────────────────────────────────

interface InfoContentProps {
  mode: 'register' | 'login' | 'forgot';
  step: 1 | 2;
  forgotStep: ForgotStep;
  contentVisible: boolean;
}

function InfoContent({ mode, step, forgotStep, contentVisible }: InfoContentProps) {
  const getContent = () => {
    if (mode === 'forgot') {
      const forgotContents: Record<ForgotStep, { headline: React.ReactNode; subtitle: React.ReactNode; features: string[] }> = {
        email: {
          headline: (
            <>
              Tu cuenta está
              <br />
              <span style={{ fontWeight: 600 }}>segura</span>
              <br />
              <span className="text-[#95D0C9]" style={{ fontWeight: 600 }}>con nosotros.</span>
            </>
          ),
          subtitle: (
            <>
              Te enviaremos un código de verificación
              <br />
              a tu email para restablecer tu contraseña.
            </>
          ),
          features: ['Código de 6 dígitos', 'Expira en 10 min', 'Encriptado'],
        },
        reset: {
          headline: (
            <>
              Crea una nueva
              <br />
              <span style={{ fontWeight: 600 }}>contraseña</span>
              <br />
              <span className="text-[#95D0C9]" style={{ fontWeight: 600 }}>segura.</span>
            </>
          ),
          subtitle: (
            <>
              Ingresa el código que enviamos a tu email
              <br />
              y elige una nueva contraseña.
            </>
          ),
          features: ['Mínimo 8 caracteres', 'Mayúsculas y números'],
        },
        success: {
          headline: (
            <>
              Contraseña
              <br />
              <span style={{ fontWeight: 600 }}>actualizada</span>
              <br />
              <span className="text-[#95D0C9]" style={{ fontWeight: 600 }}>exitosamente.</span>
            </>
          ),
          subtitle: (
            <>
              Tu contraseña ha sido restablecida.
              <br />
              Ya puedes iniciar sesión.
            </>
          ),
          features: ['Cuenta segura', 'Inicia sesión'],
        },
      };
      return forgotContents[forgotStep];
    }
    if (mode === 'login') {
      return {
        headline: (
          <>
            Bienvenido
            <br />
            <span style={{ fontWeight: 600 }}>de vuelta.</span>
            <br />
            <span className="text-[#95D0C9]" style={{ fontWeight: 600 }}>Tu negocio te espera.</span>
          </>
        ),
        subtitle: (
          <>
            Accede a tu panel de control y gestiona
            <br />
            todo desde un solo lugar.
          </>
        ),
        features: ['Panel de admin', 'Website builder', 'Gestión de citas'],
      };
    }
    if (step === 2) {
      return {
        headline: (
          <>
            Casi listo.
            <br />
            <span style={{ fontWeight: 600 }}>Solo falta</span>
            <br />
            <span className="text-[#95D0C9]" style={{ fontWeight: 600 }}>tu cuenta.</span>
          </>
        ),
        subtitle: (
          <>
            Tu información está segura y encriptada.
            <br />
            Nunca compartiremos tus datos con terceros.
          </>
        ),
        features: ['Datos encriptados', 'Sin tarjeta de crédito', 'Cancela cuando quieras'],
      };
    }
    return {
      headline: (
        <>
          Tu negocio.
          <br />
          <span style={{ fontWeight: 600 }}>Tu sitio web.</span>
          <br />
          <span className="text-[#95D0C9]" style={{ fontWeight: 600 }}>En minutos.</span>
        </>
      ),
      subtitle: (
        <>
          Crea tu presencia digital con inteligencia artificial.
          <br />
          Todo lo que necesitas, en un solo lugar.
        </>
      ),
      features: ['Sitio web con IA', 'Reservas y pagos', '14 días gratis'],
    };
  };

  const content = getContent();

  return (
    <div
      className="transition-all duration-300"
      style={{
        opacity: contentVisible ? 1 : 0,
        transform: contentVisible ? 'translateY(0)' : 'translateY(8px)',
      }}
    >
      <h1
        className="text-[2.2rem] lg:text-[3rem] xl:text-[3.5rem] leading-[1.08] tracking-[-0.03em] mb-6 text-white"
        style={{ fontWeight: 300 }}
      >
        {content.headline}
      </h1>

      <p className="text-[0.95rem] leading-[1.7] text-white/60 max-w-sm mb-16 lg:mb-20">
        {content.subtitle}
      </p>

      <div className="flex items-center gap-6 text-[0.75rem] text-white/50 tracking-wide">
        {content.features.map((feature, i) => (
          <span key={feature} className="contents">
            {i > 0 && <span className="w-1 h-1 rounded-full bg-white/30" />}
            <span>{feature}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

interface AuthSplitScreenProps {
  initialMode?: 'register' | 'login' | 'forgot';
  redirectTo?: string | null;
}

export default function AuthSplitScreen({ initialMode = 'register', redirectTo = null }: AuthSplitScreenProps) {
  const router = useRouter();
  const { platformLogin, registerTenant } = useAuth();

  // ── Mode & animation state
  const [mode, setMode] = useState<'register' | 'login' | 'forgot'>(initialMode);
  const [step, setStep] = useState<1 | 2>(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [contentVisible, setContentVisible] = useState(true);

  // ── Register form state
  const [registerLoading, setRegisterLoading] = useState(false);
  const [phoneCodeOpen, setPhoneCodeOpen] = useState(false);
  const [phoneCountry, setPhoneCountry] = useState('Colombia');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegPassword2, setShowRegPassword2] = useState(false);
  const [businessNameExists, setBusinessNameExists] = useState(false);
  const [checkingName, setCheckingName] = useState(false);
  const nameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const emailCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Login form state
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [inactiveAccountData, setInactiveAccountData] = useState<{ email: string; password: string } | null>(null);

  // ── Forgot password state
  const [forgotStep, setForgotStep] = useState<ForgotStep>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotResending, setForgotResending] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // ── Debounced checks
  const checkBusinessName = useCallback(async (name: string) => {
    if (!name || name.trim().length < 2) { setBusinessNameExists(false); return; }
    setCheckingName(true);
    try {
      const res = await fetch(`${API_URL}/api/public/check-business-name/?name=${encodeURIComponent(name.trim())}`);
      if (res.ok) { const data = await res.json(); setBusinessNameExists(data.exists); }
    } catch { /* silent */ } finally { setCheckingName(false); }
  }, [API_URL]);

  const checkTenantEmail = useCallback(async (email: string) => {
    if (!email || !email.includes('@')) { setEmailExists(false); return; }
    setCheckingEmail(true);
    try {
      const res = await fetch(`${API_URL}/api/public/check-tenant-email/?email=${encodeURIComponent(email.trim())}`);
      if (res.ok) { const data = await res.json(); setEmailExists(data.exists); }
    } catch { /* silent */ } finally { setCheckingEmail(false); }
  }, [API_URL]);

  // ── Forms
  const registerForm = useForm<RegisterBusinessFormValues>({
    resolver: zodResolver(registerBusinessSchema),
    defaultValues: {
      business_name: '', industry: '', country: 'Colombia',
      first_name: '', last_name: '', email: '', phone: '',
      password: '', password2: '',
    },
  });

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const forgotEmailForm = useForm<ForgotEmailFormValues>({
    resolver: zodResolver(forgotEmailSchema),
    defaultValues: { email: '' },
  });

  const forgotResetForm = useForm<ForgotResetFormValues>({
    resolver: zodResolver(forgotResetSchema),
    defaultValues: { code: '', newPassword: '', confirmPassword: '' },
  });

  // ── Watchers
  const businessName = registerForm.watch('business_name');
  useEffect(() => {
    if (nameCheckTimer.current) clearTimeout(nameCheckTimer.current);
    if (!businessName || businessName.trim().length < 2) { setBusinessNameExists(false); return; }
    nameCheckTimer.current = setTimeout(() => checkBusinessName(businessName), 600);
    return () => { if (nameCheckTimer.current) clearTimeout(nameCheckTimer.current); };
  }, [businessName, checkBusinessName]);

  const emailValue = registerForm.watch('email');
  useEffect(() => {
    if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current);
    if (!emailValue || !emailValue.includes('@') || !emailValue.includes('.')) { setEmailExists(false); return; }
    emailCheckTimer.current = setTimeout(() => checkTenantEmail(emailValue), 600);
    return () => { if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current); };
  }, [emailValue, checkTenantEmail]);

  const passwordValue = registerForm.watch('password');
  const password2Value = registerForm.watch('password2');
  const passwordsMatch = !password2Value || passwordValue === password2Value;

  // ── Mode toggle with animation
  const toggleMode = (newMode: 'register' | 'login' | 'forgot') => {
    if (isAnimating || mode === newMode) return;
    setContentVisible(false);
    setIsAnimating(true);
    setTimeout(() => {
      setMode(newMode);
      if (newMode === 'register') setStep(1);
      if (newMode === 'forgot') { setForgotStep('email'); setForgotEmail(''); }
      // Update URL without navigation
      const pathMap: Record<string, string> = {
        login: `/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`,
        register: '/register-business',
        forgot: '/forgot-password',
      };
      window.history.replaceState({}, '', pathMap[newMode]);
      setTimeout(() => setContentVisible(true), 100);
    }, 200);
    setTimeout(() => setIsAnimating(false), 700);
  };

  // ── Step change with content fade
  const handleNextStep = async () => {
    const result = await registerForm.trigger(['business_name', 'industry', 'country']);
    if (result) {
      setContentVisible(false);
      setTimeout(() => {
        setStep(2);
        setTimeout(() => setContentVisible(true), 50);
      }, 200);
    }
  };

  const handlePrevStep = () => {
    setContentVisible(false);
    setTimeout(() => {
      setStep(1);
      setTimeout(() => setContentVisible(true), 50);
    }, 200);
  };

  // ── Register submit
  const onRegisterSubmit = async (data: RegisterBusinessFormValues) => {
    try {
      setRegisterLoading(true);
      const result = await registerTenant({
        business_name: data.business_name,
        country: data.country,
        email: data.email,
        password: data.password,
        password2: data.password2,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
      });
      toast.success(result.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al crear el negocio';
      toast.error(message);
    } finally {
      setRegisterLoading(false);
    }
  };

  // ── Login submit
  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      setLoginLoading(true);
      await platformLogin(data, redirectTo || undefined);
      toast.success('¡Bienvenido!');
      setLoginLoading(false);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'ACCOUNT_INACTIVE') {
        setLoginLoading(false);
        setInactiveAccountData({ email: data.email, password: data.password });
        setShowReactivateDialog(true);
        return;
      }
      setLoginLoading(false);
      const message = error instanceof Error ? error.message : 'Error al iniciar sesión';
      toast.error(message);
    }
  };

  // ── Reactivation
  const handleReactivate = async () => {
    if (!inactiveAccountData) return;
    try {
      setLoginLoading(true);
      setShowReactivateDialog(false);
      await requestReactivationOTP({
        ...inactiveAccountData,
        tenant_slug: process.env.NEXT_PUBLIC_TENANT_SLUG || 'gc-belleza',
      });
      toast.success('Te hemos enviado un código de verificación a tu email');
      router.push(`/reactivate?email=${encodeURIComponent(inactiveAccountData.email)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al solicitar reactivación';
      toast.error(message);
    } finally {
      setLoginLoading(false);
      setInactiveAccountData(null);
    }
  };

  // ── Forgot password handlers
  const goToForgotStep = useCallback((newStep: ForgotStep) => {
    setContentVisible(false);
    setTimeout(() => {
      setForgotStep(newStep);
      setTimeout(() => setContentVisible(true), 100);
    }, 200);
  }, []);

  const onForgotEmailSubmit = async (data: ForgotEmailFormValues) => {
    try {
      setForgotLoading(true);
      await platformRequestPasswordResetOTP(data.email);
      setForgotEmail(data.email);
      toast.success('Si el email existe, recibirás un código de verificación');
      goToForgotStep('reset');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al enviar el código';
      toast.error(message);
    } finally {
      setForgotLoading(false);
    }
  };

  const onForgotResetSubmit = async (data: ForgotResetFormValues) => {
    try {
      setForgotLoading(true);
      await platformVerifyPasswordResetOTP(forgotEmail, data.code, data.newPassword);
      toast.success('Contraseña restablecida exitosamente');
      goToForgotStep('success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al restablecer contraseña';
      toast.error(message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotResendCode = async () => {
    try {
      setForgotResending(true);
      await platformRequestPasswordResetOTP(forgotEmail);
      setOtpDigits(['', '', '', '', '', '']);
      forgotResetForm.setValue('code', '');
      toast.success('Nuevo código enviado a tu email');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al reenviar código';
      toast.error(message);
    } finally {
      setForgotResending(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.slice(0, 6).split('');
      const newOtpDigits = [...otpDigits];
      digits.forEach((digit, i) => {
        if (index + i < 6) newOtpDigits[index + i] = digit;
      });
      setOtpDigits(newOtpDigits);
      forgotResetForm.setValue('code', newOtpDigits.join(''));
      const nextIndex = Math.min(index + digits.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
    } else {
      const newOtpDigits = [...otpDigits];
      newOtpDigits[index] = value;
      setOtpDigits(newOtpDigits);
      forgotResetForm.setValue('code', newOtpDigits.join(''));
      if (value && index < 5) otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // ── CSS classes for panel positions
  const isLogin = mode === 'login';
  const isForgot = mode === 'forgot';
  const isRegister = mode === 'register';

  return (
    <>
      <style jsx global>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fade-up 0.3s ease-out forwards; }

        /* Logo G pendulum animation */
        @keyframes g-pendulum {
          0%   { transform: rotate(0deg); }
          6%   { transform: rotate(-18deg); }   /* giro rápido izquierda */
          15%  { transform: rotate(-18deg); }   /* pausa breve */
          35%  { transform: rotate(0deg); }      /* vuelve lento al centro */
          42%  { transform: rotate(0deg); }      /* pausa breve en centro */
          48%  { transform: rotate(18deg); }    /* giro rápido derecha */
          57%  { transform: rotate(18deg); }    /* pausa breve */
          77%  { transform: rotate(0deg); }      /* vuelve lento al centro */
          100% { transform: rotate(0deg); }      /* pausa 1s antes de repetir */
        }
        .g-pendulum {
          animation: g-pendulum 4.3s cubic-bezier(0.22, 1, 0.36, 1) infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .g-pendulum { animation: none; }
        }

        /* Panel slide animations — desktop only (3-way: forgot ← login → register) */
        @media (min-width: 1024px) {
          /* Info/gradient panel (left-0 w-1/2, z-10) */
          .panel-info-forgot { transform: translateX(100%); }
          .panel-info-login { transform: translateX(100%); }
          .panel-info-register { transform: translateX(0%); }

          /* Forgot panel (left-0 w-1/2, z-0) */
          .panel-forgot-forgot { transform: translateX(0%); }
          .panel-forgot-login { transform: translateX(-100%); }
          .panel-forgot-register { transform: translateX(-100%); }

          /* Login panel (left-0 w-1/2, z-0) */
          .panel-login-forgot { transform: translateX(100%); }
          .panel-login-login { transform: translateX(0%); }
          .panel-login-register { transform: translateX(-100%); }

          /* Register panel (left-1/2 w-1/2, z-0) */
          .panel-register-forgot { transform: translateX(100%); }
          .panel-register-login { transform: translateX(100%); }
          .panel-register-register { transform: translateX(0%); }
        }
      `}</style>

      <div
        className="min-h-screen"
        style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif", WebkitFontSmoothing: 'antialiased' }}
      >
        {/* ═══════ DESKTOP LAYOUT ═══════ */}
        <div className="hidden lg:block relative w-full min-h-screen overflow-hidden">

          {/* ── Info Panel (z-10, slides left↔right) ── */}
          <div
            className={`absolute top-0 left-0 w-1/2 h-full z-10 transition-transform duration-700 ease-in-out flex flex-col justify-center px-16 xl:px-24 overflow-hidden ${
              isForgot ? 'panel-info-forgot' : isLogin ? 'panel-info-login' : 'panel-info-register'
            }`}
            style={{
              background: 'linear-gradient(135deg, #1C3B57 0%, #1a3450 40%, #1e4a5e 70%, #265e6a 100%)',
            }}
          >
            {/* Radial glow sutil */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at 20% 80%, rgba(149, 208, 201, 0.15) 0%, transparent 60%)',
              }}
            />

            {/* Logo */}
            <div className="relative flex items-center gap-3.5 mb-16 lg:mb-20">
              <Image src="/Isotipo_color_NERBIS.png" alt="NERBIS" width={34} height={34} className="brightness-0 invert g-pendulum" />
              <span
                className="text-[1.15rem] tracking-[0.18em] text-white"
                style={{ fontFamily: 'var(--font-nunito), sans-serif', fontWeight: 800 }}
              >
                NERBIS
              </span>
            </div>

            <div className="relative">
              <InfoContent mode={mode} step={step} forgotStep={forgotStep} contentVisible={contentVisible} />
            </div>
          </div>

          {/* ── Forgot Form Panel (z-0, left side, slides in from left) ── */}
          <div
            className={`absolute top-0 left-0 w-1/2 h-full z-0 transition-transform duration-700 ease-in-out bg-[#FAFAFA] flex items-center justify-center ${
              isForgot ? 'panel-forgot-forgot' : isLogin ? 'panel-forgot-login' : 'panel-forgot-register'
            }`}
          >
            <div
              className="w-full max-w-[380px] px-8 transition-opacity duration-300"
              style={{ opacity: isForgot ? 1 : 0, pointerEvents: isForgot ? 'auto' : 'none' }}
            >
              <ForgotPasswordFormPanel
                forgotStep={forgotStep}
                email={forgotEmail}
                emailForm={forgotEmailForm}
                resetForm={forgotResetForm}
                onEmailSubmit={onForgotEmailSubmit}
                onResetSubmit={onForgotResetSubmit}
                onResendCode={handleForgotResendCode}
                onGoToLogin={() => toggleMode('login')}
                isLoading={forgotLoading}
                isResending={forgotResending}
                otpDigits={otpDigits}
                otpInputRefs={otpInputRefs}
                onOtpChange={handleOtpChange}
                onOtpKeyDown={handleOtpKeyDown}
                showNewPassword={showForgotNewPassword}
                setShowNewPassword={setShowForgotNewPassword}
                showConfirmPassword={showForgotConfirmPassword}
                setShowConfirmPassword={setShowForgotConfirmPassword}
              />
            </div>
          </div>

          {/* ── Register Form Panel (z-0, right side, slides off-right on login) ── */}
          <div
            className={`absolute top-0 left-1/2 w-1/2 h-full z-0 transition-transform duration-700 ease-in-out bg-[#FAFAFA] flex items-center justify-center ${
              isForgot ? 'panel-register-forgot' : isLogin ? 'panel-register-login' : 'panel-register-register'
            }`}
          >
            <div
              className="w-full max-w-[380px] px-8 transition-opacity duration-300"
              style={{ opacity: isRegister ? 1 : 0, pointerEvents: isRegister ? 'auto' : 'none' }}
            >
              <RegisterFormPanel
                form={registerForm}
                step={step}
                onNextStep={handleNextStep}
                onPrevStep={handlePrevStep}
                onSubmit={onRegisterSubmit}
                isLoading={registerLoading}
                phoneCodeOpen={phoneCodeOpen}
                setPhoneCodeOpen={setPhoneCodeOpen}
                phoneCountry={phoneCountry}
                setPhoneCountry={setPhoneCountry}
                showPassword={showRegPassword}
                setShowPassword={setShowRegPassword}
                showPassword2={showRegPassword2}
                setShowPassword2={setShowRegPassword2}
                businessNameExists={businessNameExists}
                checkingName={checkingName}
                emailExists={emailExists}
                checkingEmail={checkingEmail}
                passwordsMatch={passwordsMatch}
                onToggleMode={() => toggleMode('login')}
              />
            </div>
          </div>

          {/* ── Login Form Panel (z-0, left side, slides in from left) ── */}
          <div
            className={`absolute top-0 left-0 w-1/2 h-full z-0 transition-transform duration-700 ease-in-out bg-[#FAFAFA] flex items-center justify-center ${
              isForgot ? 'panel-login-forgot' : isLogin ? 'panel-login-login' : 'panel-login-register'
            }`}
          >
            <div
              className="w-full max-w-[380px] px-8 transition-opacity duration-300"
              style={{ opacity: isLogin ? 1 : 0, pointerEvents: isLogin ? 'auto' : 'none' }}
            >
              <LoginFormPanel
                form={loginForm}
                onSubmit={onLoginSubmit}
                isLoading={loginLoading}
                showPassword={showLoginPassword}
                setShowPassword={setShowLoginPassword}
                onToggleMode={() => toggleMode('register')}
                onForgotPassword={() => toggleMode('forgot')}
              />
            </div>
          </div>
        </div>

        {/* ═══════ MOBILE LAYOUT ═══════ */}
        <div className="lg:hidden flex flex-col min-h-screen">
          {/* Condensed info */}
          <div
            className="relative px-8 py-10 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #1C3B57 0%, #1a3450 40%, #1e4a5e 70%, #265e6a 100%)',
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at 20% 80%, rgba(149, 208, 201, 0.15) 0%, transparent 60%)',
              }}
            />
            <div className="relative flex items-center gap-3 mb-8">
              <Image src="/Isotipo_color_NERBIS.png" alt="NERBIS" width={30} height={30} className="brightness-0 invert g-pendulum" />
              <span
                className="text-[1.05rem] tracking-[0.18em] text-white"
                style={{ fontFamily: 'var(--font-nunito), sans-serif', fontWeight: 800 }}
              >
                NERBIS
              </span>
            </div>
            <div className="relative">
              <InfoContent mode={mode} step={step} forgotStep={forgotStep} contentVisible={true} />
            </div>
          </div>

          {/* Form */}
          <div className="flex-1 bg-[#FAFAFA] px-8 py-10">
            <div className="w-full max-w-[380px] mx-auto">
              {mode === 'forgot' ? (
                <ForgotPasswordFormPanel
                  forgotStep={forgotStep}
                  email={forgotEmail}
                  emailForm={forgotEmailForm}
                  resetForm={forgotResetForm}
                  onEmailSubmit={onForgotEmailSubmit}
                  onResetSubmit={onForgotResetSubmit}
                  onResendCode={handleForgotResendCode}
                  onGoToLogin={() => toggleMode('login')}
                  isLoading={forgotLoading}
                  isResending={forgotResending}
                  otpDigits={otpDigits}
                  otpInputRefs={otpInputRefs}
                  onOtpChange={handleOtpChange}
                  onOtpKeyDown={handleOtpKeyDown}
                  showNewPassword={showForgotNewPassword}
                  setShowNewPassword={setShowForgotNewPassword}
                  showConfirmPassword={showForgotConfirmPassword}
                  setShowConfirmPassword={setShowForgotConfirmPassword}
                />
              ) : mode === 'register' ? (
                <RegisterFormPanel
                  form={registerForm}
                  step={step}
                  onNextStep={handleNextStep}
                  onPrevStep={handlePrevStep}
                  onSubmit={onRegisterSubmit}
                  isLoading={registerLoading}
                  phoneCodeOpen={phoneCodeOpen}
                  setPhoneCodeOpen={setPhoneCodeOpen}
                  phoneCountry={phoneCountry}
                  setPhoneCountry={setPhoneCountry}
                  showPassword={showRegPassword}
                  setShowPassword={setShowRegPassword}
                  showPassword2={showRegPassword2}
                  setShowPassword2={setShowRegPassword2}
                  businessNameExists={businessNameExists}
                  checkingName={checkingName}
                  emailExists={emailExists}
                  checkingEmail={checkingEmail}
                  passwordsMatch={passwordsMatch}
                  onToggleMode={() => toggleMode('login')}
                />
              ) : (
                <LoginFormPanel
                  form={loginForm}
                  onSubmit={onLoginSubmit}
                  isLoading={loginLoading}
                  showPassword={showLoginPassword}
                  setShowPassword={setShowLoginPassword}
                  onToggleMode={() => toggleMode('register')}
                  onForgotPassword={() => toggleMode('forgot')}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Reactivation Dialog ── */}
      <AlertDialog open={showReactivateDialog} onOpenChange={setShowReactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: '#1C3B57' }}>Cuenta desactivada</AlertDialogTitle>
            <AlertDialogDescription>
              Tu cuenta fue desactivada previamente. ¿Deseas reactivarla?
              <br /><br />
              Al reactivar tu cuenta, recuperarás el acceso a todo tu historial de órdenes, citas y datos personales.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loginLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReactivate}
              disabled={loginLoading}
              style={{ background: '#1C3B57' }}
              className="text-white"
            >
              {loginLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reactivando...
                </>
              ) : (
                'Sí, reactivar mi cuenta'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Register Form Panel ────────────────────────────────────────

interface RegisterFormPanelProps {
  form: ReturnType<typeof useForm<RegisterBusinessFormValues>>;
  step: 1 | 2;
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

function RegisterFormPanel({
  form, step, onNextStep, onPrevStep, onSubmit, isLoading,
  phoneCodeOpen, setPhoneCodeOpen,
  phoneCountry, setPhoneCountry, showPassword, setShowPassword,
  showPassword2, setShowPassword2, businessNameExists, checkingName,
  emailExists, checkingEmail, passwordsMatch, onToggleMode,
}: RegisterFormPanelProps) {
  return (
    <>
      {/* Step + Title */}
      <div className="mb-10">
        <p className="text-[0.7rem] font-semibold text-gray-400 tracking-[0.12em] uppercase mb-4">
          Paso {step} de 2
        </p>
        <h2
          className="text-[1.5rem] tracking-[-0.02em] mb-2"
          style={{ color: '#1C3B57', fontWeight: 600 }}
        >
          {step === 1 ? 'Sobre tu negocio' : 'Crea tu cuenta'}
        </h2>
        <p className="text-[0.85rem] text-gray-400 leading-relaxed">
          {step === 1 ? 'Cuéntanos qué tipo de negocio tienes.' : 'Tus credenciales de administrador.'}
        </p>
        <div className="flex gap-2 mt-6">
          <div className="h-[2px] flex-1 rounded-full" style={{ background: '#1C3B57' }} />
          <div
            className="h-[2px] flex-1 rounded-full transition-colors duration-500"
            style={{ background: step === 2 ? '#1C3B57' : '#E5E7EB' }}
          />
        </div>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {step === 1 && (
            <div className="space-y-5 fade-up">
              <FormField
                control={form.control}
                name="business_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.78rem] font-medium text-gray-500">Nombre del negocio</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Mi Negocio"
                        className="h-11 bg-white border-gray-200 rounded-lg focus:border-gray-400 focus:ring-0 transition-colors placeholder:text-gray-300"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    {businessNameExists && !checkingName && (
                      <p className="text-[0.7rem] text-amber-600 mt-1 fade-up">
                        Este nombre ya existe.{' '}
                        <button type="button" onClick={onToggleMode} className="font-medium underline underline-offset-2 hover:text-amber-800 cursor-pointer">
                          ¿Es tuyo?
                        </button>
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.78rem] font-medium text-gray-500">País</FormLabel>
                    <Select onValueChange={(val) => { field.onChange(val); setPhoneCountry(val); }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="data-[size=default]:h-11 w-full bg-white border-gray-200 rounded-lg text-sm text-gray-900 data-placeholder:text-gray-300 focus:border-gray-400 focus:ring-0 transition-colors [&_svg]:text-gray-400">
                          <SelectValue placeholder="Selecciona">
                            {field.value && (
                              <span className="flex items-center gap-2">
                                <span className="text-base leading-none">{countries.find((c) => c.value === field.value)?.flag}</span>
                                {countries.find((c) => c.value === field.value)?.label}
                              </span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent style={{ '--accent': '#E2F3F1', '--accent-foreground': '#1C3B57' } as React.CSSProperties}>
                        {countries.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            <span className="flex items-center gap-2">
                              <span className="text-base leading-none">{c.flag}</span>
                              {c.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <button
                type="button"
                onClick={onNextStep}
                className="w-full h-11 mt-10 rounded-lg text-white text-[0.85rem] font-medium transition-all duration-150 hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                style={{ background: '#1C3B57' }}
              >
                Continuar
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 fade-up">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[0.78rem] font-medium text-gray-500">Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Tu nombre" className="h-11 bg-white border-gray-200 rounded-lg focus:border-gray-400 focus:ring-0 placeholder:text-gray-300" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[0.78rem] font-medium text-gray-500">Apellido</FormLabel>
                      <FormControl>
                        <Input placeholder="Tu apellido" className="h-11 bg-white border-gray-200 rounded-lg focus:border-gray-400 focus:ring-0 placeholder:text-gray-300" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.78rem] font-medium text-gray-500">Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="correo@tunegocio.com" className="h-11 bg-white border-gray-200 rounded-lg focus:border-gray-400 focus:ring-0 placeholder:text-gray-300" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                    {emailExists && !checkingEmail && (
                      <p className="text-[0.7rem] text-amber-600 mt-1 fade-up">
                        Este email ya está registrado.{' '}
                        <button type="button" onClick={onToggleMode} className="font-medium underline underline-offset-2 hover:text-amber-800 cursor-pointer">
                          Inicia sesión
                        </button>
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => {
                  const currentPhoneCountry = countries.find((c) => c.value === phoneCountry);
                  return (
                    <FormItem>
                      <FormLabel className="text-[0.78rem] font-medium text-gray-500">
                        Teléfono <span className="text-gray-300 font-normal">opcional</span>
                      </FormLabel>
                      <FormControl>
                        <div className="flex h-11 items-center rounded-lg border border-gray-200 bg-white transition-colors focus-within:border-gray-400">
                          <Popover open={phoneCodeOpen} onOpenChange={setPhoneCodeOpen}>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="flex h-full items-center gap-1.5 border-r border-gray-200 px-3 text-sm hover:bg-gray-50 transition-colors rounded-l-lg shrink-0"
                              >
                                <span className="text-base leading-none">{currentPhoneCountry?.flag}</span>
                                <span className="text-gray-500">{currentPhoneCountry?.code}</span>
                                <ChevronsUpDown className="h-3 w-3 text-gray-300" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-52 p-0"
                              align="start"
                              style={{ '--accent': '#E2F3F1', '--accent-foreground': '#1C3B57' } as React.CSSProperties}
                            >
                              <Command>
                                <CommandInput placeholder="Buscar país..." className="text-sm" />
                                <CommandList>
                                  <CommandEmpty className="py-3 text-center text-sm text-gray-400">No encontrado.</CommandEmpty>
                                  <CommandGroup>
                                    {countries.map((c) => (
                                      <CommandItem
                                        key={c.value}
                                        value={c.label}
                                        onSelect={() => { setPhoneCountry(c.value); setPhoneCodeOpen(false); }}
                                        className="text-sm"
                                      >
                                        <Check className={`mr-2 h-3.5 w-3.5 ${phoneCountry === c.value ? 'opacity-100 text-[#95D0C9]' : 'opacity-0'}`} />
                                        <span className="text-base leading-none mr-2">{c.flag}</span>
                                        <span className="flex-1">{c.label}</span>
                                        <span className="text-gray-400 ml-auto">{c.code}</span>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <input
                            placeholder="Número de contacto"
                            inputMode="numeric"
                            className="flex-1 h-full bg-transparent px-3 text-sm outline-none placeholder:text-gray-300"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => { field.onChange(e.target.value.replace(/[^\d\s]/g, '')); }}
                            disabled={isLoading}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => {
                  const pwd = field.value || '';
                  const rules = [
                    { met: pwd.length >= 8, label: '8+ caracteres' },
                    { met: /[a-z]/.test(pwd), label: 'Minúscula' },
                    { met: /[A-Z]/.test(pwd), label: 'Mayúscula' },
                    { met: /[0-9]/.test(pwd), label: 'Número' },
                  ];
                  return (
                    <FormItem>
                      <FormLabel className="text-[0.78rem] font-medium text-gray-500">Contraseña</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            className="h-11 bg-white border-gray-200 rounded-lg focus:border-gray-400 focus:ring-0 pr-10"
                            {...field}
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      {pwd.length > 0 && (
                        <div className="flex gap-3 mt-2">
                          {rules.map((r) => (
                            <span key={r.label} className={`text-[0.65rem] transition-colors ${r.met ? 'text-[#95D0C9]' : 'text-gray-300'}`}>
                              {r.met ? '✓' : '○'} {r.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="password2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.78rem] font-medium text-gray-500">Confirmar contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword2 ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="h-11 bg-white border-gray-200 rounded-lg focus:border-gray-400 focus:ring-0 pr-10"
                          {...field}
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPassword2(!showPassword2)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors cursor-pointer"
                        >
                          {showPassword2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    {field.value && (
                      <p className={`text-[0.65rem] mt-1 transition-colors ${passwordsMatch ? 'text-[#95D0C9]' : 'text-amber-600'}`}>
                        {passwordsMatch ? '✓ Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <p className="text-[0.7rem] text-gray-400 leading-relaxed text-center pt-1">
                Al crear tu cuenta aceptas los{' '}
                <Link href="/terms" className="underline underline-offset-2 hover:text-gray-500">Términos de Servicio</Link>
                {' '}y la{' '}
                <Link href="/privacy" className="underline underline-offset-2 hover:text-gray-500">Política de Privacidad</Link>.
              </p>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onPrevStep}
                  disabled={isLoading}
                  className="h-11 px-5 rounded-lg border border-gray-200 text-gray-400 text-[0.8rem] font-medium transition-all hover:border-gray-300 hover:text-gray-500 active:scale-[0.98] flex items-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={isLoading || emailExists}
                  className="flex-1 h-11 rounded-lg text-white text-[0.85rem] font-medium transition-all duration-150 hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  style={{ background: '#1C3B57' }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Comenzar gratis'
                  )}
                </button>
              </div>

              <p className="text-[0.7rem] text-gray-400 text-center mt-3">
                Tu sitio estará listo en menos de 2 minutos.
              </p>
            </div>
          )}
        </form>
      </Form>

      {/* Toggle link */}
      <div className="mt-10 pt-6 border-t border-gray-100 text-center">
        <p className="text-[0.8rem] text-gray-400">
          ¿Ya tienes cuenta?{' '}
          <button
            type="button"
            onClick={onToggleMode}
            className="text-[#1C3B57] font-medium hover:underline underline-offset-2 cursor-pointer"
          >
            Inicia sesión
          </button>
        </p>
      </div>
    </>
  );
}

// ─── Login Form Panel ───────────────────────────────────────────

interface LoginFormPanelProps {
  form: ReturnType<typeof useForm<LoginFormValues>>;
  onSubmit: (data: LoginFormValues) => void;
  isLoading: boolean;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  onToggleMode: () => void;
  onForgotPassword: () => void;
}

function LoginFormPanel({
  form, onSubmit, isLoading, showPassword, setShowPassword, onToggleMode, onForgotPassword,
}: LoginFormPanelProps) {
  return (
    <>
      {/* Title */}
      <div className="mb-10">
        <h2
          className="text-[1.5rem] tracking-[-0.02em] mb-2"
          style={{ color: '#1C3B57', fontWeight: 600 }}
        >
          Inicia sesión
        </h2>
        <p className="text-[0.85rem] text-gray-400 leading-relaxed">
          Ingresa tus credenciales para acceder.
        </p>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 fade-up">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[0.78rem] font-medium text-gray-500">Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="tu@email.com"
                    className="h-11 bg-white border-gray-200 rounded-lg focus:border-gray-400 focus:ring-0 transition-colors placeholder:text-gray-300"
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="text-[0.78rem] font-medium text-gray-500">Contraseña</FormLabel>
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="text-[0.72rem] text-[#95D0C9] hover:text-[#7abfb7] transition-colors cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="h-11 bg-white border-gray-200 rounded-lg focus:border-gray-400 focus:ring-0 pr-10 transition-colors placeholder:text-gray-300"
                      {...field}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-lg text-white text-[0.85rem] font-medium transition-all duration-150 hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            style={{ background: '#1C3B57' }}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              <>
                Iniciar sesión
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </Form>

      {/* Toggle link */}
      <div className="mt-10 pt-6 border-t border-gray-100 text-center">
        <p className="text-[0.8rem] text-gray-400">
          ¿No tienes cuenta?{' '}
          <button
            type="button"
            onClick={onToggleMode}
            className="text-[#1C3B57] font-medium hover:underline underline-offset-2 cursor-pointer"
          >
            Registra tu negocio
          </button>
        </p>
      </div>

      {/* Back to home */}
      <div className="mt-4 text-center">
        <Link href="/" className="text-[0.78rem] text-gray-400 hover:text-gray-500 transition-colors">
          Volver al inicio
        </Link>
      </div>
    </>
  );
}

// ─── Forgot Password Form Panel ─────────────────────────────────

interface ForgotPasswordFormPanelProps {
  forgotStep: ForgotStep;
  email: string;
  emailForm: ReturnType<typeof useForm<ForgotEmailFormValues>>;
  resetForm: ReturnType<typeof useForm<ForgotResetFormValues>>;
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

function ForgotPasswordFormPanel({
  forgotStep, email, emailForm, resetForm,
  onEmailSubmit, onResetSubmit,
  onResendCode, onGoToLogin, isLoading, isResending,
  otpDigits, otpInputRefs, onOtpChange, onOtpKeyDown,
  showNewPassword, setShowNewPassword, showConfirmPassword, setShowConfirmPassword,
}: ForgotPasswordFormPanelProps) {
  const watchNewPassword = resetForm.watch('newPassword') || '';
  const pwRules = [
    { label: '8+ caracteres', met: watchNewPassword.length >= 8 },
    { label: 'Mayúscula', met: /[A-Z]/.test(watchNewPassword) },
    { label: 'Minúscula', met: /[a-z]/.test(watchNewPassword) },
    { label: 'Número', met: /[0-9]/.test(watchNewPassword) },
  ];
  return (
    <>
      {/* ── Step: Email ── */}
      {forgotStep === 'email' && (
        <>
          <div className="mb-10">
            <h2
              className="text-[1.5rem] tracking-[-0.02em] mb-2"
              style={{ color: '#1C3B57', fontWeight: 600 }}
            >
              Recupera tu contraseña
            </h2>
            <p className="text-[0.85rem] text-gray-400 leading-relaxed">
              Ingresa tu email y te enviaremos un código de verificación.
            </p>
          </div>

          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-5 fade-up">
              <FormField
                control={emailForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.78rem] font-medium text-gray-500">Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="tu@email.com"
                        className="h-11 bg-white border-gray-200 rounded-lg focus:border-gray-400 focus:ring-0 transition-colors placeholder:text-gray-300"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-lg text-white text-[0.85rem] font-medium transition-all duration-150 hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                style={{ background: '#1C3B57' }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar código
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </Form>

          <div className="mt-10 pt-6 border-t border-gray-100 text-center">
            <button
              type="button"
              onClick={onGoToLogin}
              className="inline-flex items-center text-[0.78rem] text-gray-400 hover:text-[#1C3B57] transition-colors cursor-pointer"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Volver a iniciar sesión
            </button>
          </div>
        </>
      )}

      {/* ── Step: Reset (OTP + New Password) ── */}
      {forgotStep === 'reset' && (
        <>
          <div className="mb-10">
            <h2
              className="text-[1.5rem] tracking-[-0.02em] mb-2"
              style={{ color: '#1C3B57', fontWeight: 600 }}
            >
              Nueva contraseña
            </h2>
            <p className="text-[0.85rem] text-gray-400 leading-relaxed">
              Código enviado a{' '}
              <span className="text-[#1C3B57] font-medium">{email}</span>
            </p>
          </div>

          <Form {...resetForm}>
            <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-5 fade-up">
              {/* OTP Input */}
              <FormField
                control={resetForm.control}
                name="code"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-[0.78rem] font-medium text-gray-500">
                      Código de verificación
                    </FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        {otpDigits.map((digit, index) => (
                          <input
                            key={index}
                            ref={(el) => { otpInputRefs.current[index] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={digit}
                            onChange={(e) => onOtpChange(index, e.target.value.replace(/\D/g, ''))}
                            onKeyDown={(e) => onOtpKeyDown(index, e)}
                            className="w-full h-12 text-center text-lg font-semibold bg-white border border-gray-200 rounded-lg focus:border-[#95D0C9] focus:ring-0 focus:outline-none transition-colors text-[#1C3B57]"
                            disabled={isLoading}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* New password */}
              <FormField
                control={resetForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.78rem] font-medium text-gray-500">Nueva contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          className="h-11 bg-white border-gray-200 rounded-lg focus:border-gray-400 focus:ring-0 pr-10 transition-colors placeholder:text-gray-300"
                          {...field}
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    {watchNewPassword.length > 0 && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                        {pwRules.map((rule) => (
                          <span
                            key={rule.label}
                            className={`text-[0.7rem] flex items-center gap-1 transition-colors ${
                              rule.met ? 'text-green-500' : 'text-gray-300'
                            }`}
                          >
                            {rule.met ? <Check className="h-3 w-3" /> : <span className="h-3 w-3 inline-block rounded-full border border-gray-300" />}
                            {rule.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </FormItem>
                )}
              />

              {/* Confirm password */}
              <FormField
                control={resetForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[0.78rem] font-medium text-gray-500">Confirmar contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          className="h-11 bg-white border-gray-200 rounded-lg focus:border-gray-400 focus:ring-0 pr-10 transition-colors placeholder:text-gray-300"
                          {...field}
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-lg text-white text-[0.85rem] font-medium transition-all duration-150 hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                style={{ background: '#1C3B57' }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Restableciendo...
                  </>
                ) : (
                  <>
                    Restablecer contraseña
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </Form>

          {/* Resend + back links */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center space-y-3">
            <button
              type="button"
              onClick={onResendCode}
              disabled={isResending}
              className="text-[0.78rem] text-[#95D0C9] hover:text-[#7abfb7] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isResending ? 'Reenviando...' : '¿No recibiste el código? Reenviar'}
            </button>

            <div>
              <button
                type="button"
                onClick={onGoToLogin}
                className="inline-flex items-center text-[0.78rem] text-gray-400 hover:text-[#1C3B57] transition-colors cursor-pointer"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Volver a iniciar sesión
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Step: Success ── */}
      {forgotStep === 'success' && (
        <div className="text-center fade-up">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <CheckCircle className="h-7 w-7 text-green-500" />
          </div>

          <h2
            className="text-[1.5rem] tracking-[-0.02em] mb-2"
            style={{ color: '#1C3B57', fontWeight: 600 }}
          >
            Contraseña actualizada
          </h2>

          <p className="text-[0.85rem] text-gray-400 mb-8">
            Tu contraseña ha sido restablecida exitosamente
          </p>

          <button
            onClick={onGoToLogin}
            className="w-full h-11 rounded-lg text-white text-[0.85rem] font-medium transition-all duration-150 hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            style={{ background: '#1C3B57' }}
          >
            Iniciar sesión
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
