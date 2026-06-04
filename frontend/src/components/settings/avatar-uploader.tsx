// src/components/settings/avatar-uploader.tsx
// Subida de foto de perfil (avatar) con vista previa optimista, validación
// en cliente (tipo + tamaño) y estados de carga / error accesibles.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Camera, Loader2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { User } from '@/types';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
const ACCEPT_ATTR = 'image/png,image/jpeg,image/webp';
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/** Iniciales a partir del nombre del usuario para el fallback del avatar. */
function getInitials(user: User | null): string {
  if (!user) return '?';
  const source =
    user.full_name?.trim() ||
    `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() ||
    user.email ||
    '';
  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
  return initials || '?';
}

interface AvatarUploaderProps {
  /** Usuario actual (provee la imagen y las iniciales del fallback). */
  user: User | null;
  /** Dispara la subida del archivo. Debe resolver con el usuario actualizado. */
  onUpload: (file: File) => Promise<User>;
  /** Notifica al contenedor cuando el avatar se actualizó (p. ej. setUser). */
  onUploaded?: (user: User) => void;
  /** Indica si la mutación está en curso (si se controla desde el contenedor). */
  isUploading?: boolean;
}

export function AvatarUploader({
  user,
  onUpload,
  onUploaded,
  isUploading: isUploadingProp,
}: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [internalUploading, setInternalUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isUploading = isUploadingProp ?? internalUploading;

  // Revocar cualquier object URL pendiente al desmontar.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  const validate = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
      return 'Formato no permitido. Usa PNG, JPG o WebP.';
    }
    if (file.size > MAX_BYTES) {
      return 'La imagen supera el límite de 2 MB.';
    }
    return null;
  }, []);

  const upload = useCallback(
    async (file: File) => {
      // Vista previa optimista.
      revokePreview();
      const objectUrl = URL.createObjectURL(file);
      previewUrlRef.current = objectUrl;
      setPreview(objectUrl);
      setErrorMessage(null);
      setInternalUploading(true);

      try {
        const updated = await onUpload(file);
        onUploaded?.(updated);
        // La fuente de verdad pasa a ser el usuario actualizado.
        revokePreview();
        setPreview(null);
        toast.success('Foto de perfil actualizada');
      } catch (error) {
        // Revertir vista previa al avatar previo.
        revokePreview();
        setPreview(null);
        const message =
          error instanceof Error
            ? error.message
            : 'No se pudo actualizar la foto.';
        setErrorMessage(message);
        toast.error('No se pudo actualizar la foto', { description: message });
      } finally {
        setInternalUploading(false);
      }
    },
    [onUpload, onUploaded, revokePreview],
  );

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      const validationError = validate(file);
      if (validationError) {
        setErrorMessage(validationError);
        toast.error('Imagen no válida', { description: validationError });
        return;
      }
      void upload(file);
    },
    [upload, validate],
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0]);
    // Permitir volver a seleccionar el mismo archivo.
    event.target.value = '';
  };

  const openPicker = useCallback(() => {
    if (isUploading) return;
    inputRef.current?.click();
  }, [isUploading]);

  const handleAvatarKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPicker();
    }
  };

  const currentImage = preview ?? user?.avatar ?? undefined;
  const initials = getInitials(user);

  return (
    <div className="flex items-center gap-4">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        onChange={handleInputChange}
        className="sr-only"
        aria-label="Cambiar foto de perfil"
        tabIndex={-1}
      />

      <div
        role="button"
        tabIndex={0}
        aria-label="Cambiar foto de perfil"
        aria-disabled={isUploading}
        onClick={openPicker}
        onKeyDown={handleAvatarKeyDown}
        className={cn(
          'group relative rounded-full outline-none',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          isUploading ? 'cursor-default' : 'cursor-pointer',
        )}
      >
        <Avatar className="size-16 border border-border">
          {currentImage ? (
            <AvatarImage src={currentImage} alt="Foto de perfil" />
          ) : null}
          <AvatarFallback className="text-base font-medium text-muted-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Overlay de hover (colapsa con prefers-reduced-motion). */}
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-0 flex items-center justify-center rounded-full',
            'bg-foreground/40 text-background opacity-0 transition-opacity',
            'group-hover:opacity-100 group-focus-visible:opacity-100',
            'motion-reduce:transition-none',
            isUploading && 'opacity-0',
          )}
        >
          <Camera className="size-5" />
        </span>

        {/* Spinner de carga (única excepción de movimiento permitida). */}
        {isUploading ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/40 text-background">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openPicker}
            disabled={isUploading}
          >
            <Camera className="size-3.5" aria-hidden="true" />
            {isUploading ? 'Subiendo…' : 'Cambiar foto'}
          </Button>
          {errorMessage ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={openPicker}
              className="text-[var(--color-text-brand)] hover:bg-accent hover:text-[var(--color-text-brand)]"
            >
              Reintentar
            </Button>
          ) : null}
        </div>

        {errorMessage ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            PNG, JPG o WebP. Máximo 2 MB.
          </p>
        )}
      </div>
    </div>
  );
}
