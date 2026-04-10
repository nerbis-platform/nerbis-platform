// src/app/(auth)/reactivate/page.tsx

'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, UserCheck } from 'lucide-react';
import { verifyReactivationOTP } from '@/lib/api/auth';
import { useAuth } from '@/contexts/AuthContext';

const reactivateSchema = z.object({
  code: z.string().length(6, 'El código debe tener 6 dígitos'),
});

type ReactivateFormValues = z.infer<typeof reactivateSchema>;

function ReactivateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const { setUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const form = useForm<ReactivateFormValues>({
    resolver: zodResolver(reactivateSchema),
    defaultValues: {
      code: '',
    },
  });

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      router.push('/login');
    }
  }, [email, router]);

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.slice(0, 6).split('');
      const newOtpDigits = [...otpDigits];
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtpDigits[index + i] = digit;
        }
      });
      setOtpDigits(newOtpDigits);
      form.setValue('code', newOtpDigits.join(''));

      // Focus last filled input or next empty
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else {
      const newOtpDigits = [...otpDigits];
      newOtpDigits[index] = value;
      setOtpDigits(newOtpDigits);
      form.setValue('code', newOtpDigits.join(''));

      // Auto-focus next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const onSubmit = async (data: ReactivateFormValues) => {
    try {
      setIsLoading(true);
      const response = await verifyReactivationOTP(email, data.code);
      setUser(response.user);
      setSuccess(true);
      toast.success('¡Cuenta reactivada exitosamente!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al reactivar cuenta';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <UserCheck className="h-8 w-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl font-semibold tracking-[-0.03em]">¡Bienvenido de vuelta!</CardTitle>
            <CardDescription>
              Tu cuenta ha sido reactivada exitosamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')} className="w-full">
              Ir al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold tracking-[-0.03em] text-center">
            Reactivar cuenta
          </CardTitle>
          <CardDescription className="text-center">
            Ingresa el código de 6 dígitos enviado a{' '}
            <span className="font-medium text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* OTP Input */}
              <FormField
                control={form.control}
                name="code"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-center block">Código de verificación</FormLabel>
                    <FormControl>
                      <div className="flex justify-center gap-2">
                        {otpDigits.map((digit, index) => (
                          <Input
                            key={index}
                            ref={(el) => { inputRefs.current[index] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={digit}
                            onChange={(e) => handleOtpChange(index, e.target.value.replace(/\D/g, ''))}
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            className="w-12 h-12 text-center text-xl font-semibold"
                            disabled={isLoading}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage className="text-center" />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Reactivar mi cuenta'
                )}
              </Button>
            </form>
          </Form>

          <p className="mt-4 text-sm text-muted-foreground text-center">
            El código expira en 10 minutos. Si no lo ves en tu bandeja de entrada, revisa la carpeta de spam.
          </p>

          <div className="mt-4 text-center">
            <Link
              href="/login"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a iniciar sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ReactivatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ReactivateForm />
    </Suspense>
  );
}
