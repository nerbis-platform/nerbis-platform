// src/app/accept-invitation/[token]/page.tsx

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getInvitationDetail, acceptInvitation } from '@/lib/api/team';
import {
  Shield,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  EyeOff,
} from 'lucide-react';
import Image from 'next/image';
import type { AcceptInvitationData } from '@/types';

export default function AcceptInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const token = params.token as string;

  const [formData, setFormData] = useState<AcceptInvitationData>({
    first_name: '',
    last_name: '',
    password: '',
    password2: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const { data: invitation, isLoading, error } = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => getInvitationDetail(token),
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: (data: AcceptInvitationData) => acceptInvitation(token, data),
    onSuccess: () => {
      // acceptInvitation() ya guarda tokens, user y tenant en localStorage
      setAccepted(true);
      toast({
        title: 'Bienvenido al equipo',
        description: `Te has unido a ${invitation?.tenant_name}`,
      });
      // Redirigir al dashboard — AuthProvider cargará la sesión de localStorage
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    },
    onError: (error: Error & { errors?: Record<string, string[]> }) => {
      const passwordError = error.errors?.password?.[0];
      toast({
        title: 'Error',
        description: passwordError || error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.password2) {
      toast({
        title: 'Error',
        description: 'Las contraseñas no coinciden',
        variant: 'destructive',
      });
      return;
    }
    acceptMutation.mutate(formData);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 space-y-4">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error or not found
  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Invitación no encontrada</h2>
            <p className="text-muted-foreground mb-6">
              Este enlace de invitación no es válido o ha expirado.
            </p>
            <Button onClick={() => router.push('/login')}>
              Ir a iniciar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already accepted/cancelled/expired
  if (!invitation.is_valid) {
    const statusConfig: Record<string, { icon: React.ReactNode; title: string; desc: string }> = {
      accepted: {
        icon: <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />,
        title: 'Invitación ya aceptada',
        desc: 'Esta invitación ya fue utilizada. Si ya tienes cuenta, inicia sesión.',
      },
      cancelled: {
        icon: <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />,
        title: 'Invitación cancelada',
        desc: 'Esta invitación fue cancelada por el administrador.',
      },
      expired: {
        icon: <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-4" />,
        title: 'Invitación expirada',
        desc: 'Esta invitación ha expirado. Solicita una nueva al administrador.',
      },
    };
    const config = statusConfig[invitation.status] || statusConfig.expired;

    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            {config.icon}
            <h2 className="text-xl font-bold mb-2">{config.title}</h2>
            <p className="text-muted-foreground mb-6">{config.desc}</p>
            <Button onClick={() => router.push('/login')}>
              Ir a iniciar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Bienvenido al equipo</h2>
            <p className="text-muted-foreground mb-2">
              Te has unido a <strong>{invitation.tenant_name}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Redirigiendo al panel...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {invitation.tenant_logo && (
            <Image
              src={invitation.tenant_logo}
              alt={invitation.tenant_name}
              width={48}
              height={48}
              className="mx-auto mb-2 object-contain"
            />
          )}
          <CardTitle className="text-2xl">Únete a {invitation.tenant_name}</CardTitle>
          <CardDescription>
            <strong>{invitation.invited_by_name}</strong> te ha invitado como{' '}
            <Badge variant={invitation.role === 'admin' ? 'default' : 'secondary'} className="gap-1 ml-1">
              {invitation.role === 'admin' ? (
                <ShieldCheck className="h-3 w-3" />
              ) : (
                <Shield className="h-3 w-3" />
              )}
              {invitation.role_display}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombre</Label>
                <Input
                  id="first_name"
                  placeholder="Tu nombre"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Apellido</Label>
                <Input
                  id="last_name"
                  placeholder="Tu apellido"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={invitation.email} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password2">Confirmar contraseña</Label>
              <Input
                id="password2"
                type={showPassword ? 'text' : 'password'}
                placeholder="Repite tu contraseña"
                value={formData.password2}
                onChange={(e) => setFormData({ ...formData, password2: e.target.value })}
                required
                minLength={8}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? 'Creando cuenta...' : 'Aceptar invitación'}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Al aceptar, crearás una cuenta en {invitation.tenant_name}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
