// src/components/cart/CouponInput.tsx

'use client';

import { useState } from 'react';
import { Tag, X, Loader2, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/contexts/CartContext';

export function CouponInput() {
  const [code, setCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { appliedCoupon, couponError, couponWarnings, isPendingCoupon, applyCoupon, removeCoupon } = useCart();

  const handleApply = async () => {
    if (!code.trim()) return;

    setIsApplying(true);
    setSuccessMessage(null);

    const success = await applyCoupon(code.trim());

    if (success) {
      setSuccessMessage('Cupón aplicado correctamente');
      setCode('');
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000);
    }

    setIsApplying(false);
  };

  const handleRemove = async () => {
    await removeCoupon();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  };

  // Si hay un cupón aplicado, mostrar información del cupón
  if (appliedCoupon) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-foreground truncate">
                  Cupón: <span className="text-primary">{appliedCoupon.code}</span>
                </p>
                {isPendingCoupon && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded shrink-0">
                    Pendiente
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {appliedCoupon.discount_display} de descuento
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            className="text-muted-foreground hover:text-destructive shrink-0 h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-3 pt-3 border-t border-primary/20">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {isPendingCoupon ? 'Descuento estimado:' : 'Descuento aplicado:'}
            </span>
            <span className="font-medium text-primary">-${appliedCoupon.discount_amount}</span>
          </div>
        </div>

        {/* Advertencias para cupón pendiente */}
        {isPendingCoupon && couponWarnings.length > 0 && (
          <div className="mt-3 pt-3 border-t border-amber-200">
            {couponWarnings.map((warning, index) => (
              <div key={index} className="flex items-start gap-2 text-xs text-amber-700 mt-1">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}

        {/* Mensaje informativo para cupón pendiente */}
        {isPendingCoupon && (
          <p className="text-xs text-muted-foreground mt-3 italic">
            El cupón se validará completamente al iniciar sesión y completar el pedido.
          </p>
        )}
      </div>
    );
  }

  // Formulario para aplicar cupón
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Código de cupón"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            disabled={isApplying}
            className="pl-10 uppercase"
          />
        </div>
        <Button
          onClick={handleApply}
          disabled={!code.trim() || isApplying}
          variant="outline"
        >
          {isApplying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Aplicar'
          )}
        </Button>
      </div>

      {/* Mensaje de éxito */}
      {successMessage && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-md p-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Mensaje de error */}
      {couponError && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-2">
          <AlertCircle className="h-4 w-4" />
          <span>{couponError}</span>
        </div>
      )}
    </div>
  );
}
