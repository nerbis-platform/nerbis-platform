// src/contexts/CartContext.tsx

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Cart, CartItem, AppliedCoupon } from '@/types';
import * as cartApi from '@/lib/api/cart';
import * as couponsApi from '@/lib/api/coupons';
import * as localCartStorage from '@/lib/storage/localCart';
import { createAppointment } from '@/lib/api/bookings';
import { useAuth } from './AuthContext';

// Tipo para items del carrito local (compatible con CartItem)
interface LocalCartItemDisplay {
  id: string;
  item_type: 'product' | 'service';
  item_data: {
    id: number;
    name: string;
    description?: string;
    price: string;
    image?: string;
    formatted_duration?: string;
  };
  quantity: number;
  unit_price: string;
  total_price: string;
  // Para citas pendientes de usuarios anónimos
  pending_appointment?: {
    staff_member_id: number;
    staff_member_name: string;
    start_datetime: string;
    notes?: string;
  };
}

// Tipo unificado para el carrito (puede ser local o del servidor)
interface UnifiedCart {
  id: number | string;
  items: (CartItem | LocalCartItemDisplay)[];
  items_count: number;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  total: string;
  coupon?: AppliedCoupon | null;
  is_local: boolean; // true si es carrito local
}

interface CartContextType {
  cart: UnifiedCart | null;
  isLoading: boolean;
  itemsCount: number;
  isLocalCart: boolean;
  appliedCoupon: AppliedCoupon | null;
  couponError: string | null;
  couponWarnings: string[];
  isPendingCoupon: boolean; // true si es cupón en preview (anónimo)
  refreshCart: () => Promise<void>;
  addProduct: (productId: number, quantity: number, productData?: { name: string; price: string; description?: string; image?: string }) => Promise<void>;
  addService: (serviceId: number, appointmentIdOrData: number | { staff_member_id: number; staff_member_name: string; start_datetime: string; notes?: string }, serviceData?: { name: string; price: string; description?: string; duration_minutes?: number; formatted_duration?: string }) => Promise<void>;
  updateItem: (itemId: number | string, quantity: number) => Promise<void>;
  removeItem: (itemId: number | string) => Promise<void>;
  clearCart: () => Promise<void>;
  syncCartToServer: () => Promise<void>;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Convertir carrito local al formato unificado
function localCartToUnified(localCart: localCartStorage.LocalCart): UnifiedCart {
  const totals = localCartStorage.calculateLocalCartTotals(localCart);

  const items: LocalCartItemDisplay[] = localCart.items.map((item) => ({
    id: item.id,
    item_type: item.item_type,
    item_data: {
      id: item.item_id,
      name: item.item_data.name,
      description: item.item_data.description,
      price: item.unit_price,
      image: item.item_data.image,
      formatted_duration: item.item_data.formatted_duration,
    },
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: (parseFloat(item.unit_price) * item.quantity).toFixed(2),
    pending_appointment: item.appointment_data,
  }));

  // Calcular descuento si hay cupón pendiente
  let discountAmount = 0;
  let coupon: AppliedCoupon | null = null;

  if (localCart.coupon) {
    discountAmount = localCartStorage.recalculateLocalCouponDiscount(
      localCart.coupon,
      totals.subtotal
    );
    coupon = {
      code: localCart.coupon.code,
      discount_type: localCart.coupon.discount_type,
      discount_value: String(localCart.coupon.discount_value),
      discount_display: localCart.coupon.discount_display,
      discount_amount: discountAmount.toFixed(2),
    };
  }

  const totalAfterDiscount = totals.subtotal - discountAmount;
  const taxAmount = totalAfterDiscount * 0.21; // 21% IVA

  return {
    id: 'local',
    items,
    items_count: totals.items_count,
    subtotal: totals.subtotal.toFixed(2),
    discount_amount: discountAmount.toFixed(2),
    tax_amount: taxAmount.toFixed(2),
    total: (totalAfterDiscount + taxAmount).toFixed(2),
    coupon,
    is_local: true,
  };
}

// Convertir carrito del servidor al formato unificado
function serverCartToUnified(serverCart: Cart): UnifiedCart {
  return {
    ...serverCart,
    discount_amount: serverCart.discount_amount || '0.00',
    coupon: serverCart.coupon || null,
    is_local: false,
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<UnifiedCart | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponWarnings, setCouponWarnings] = useState<string[]>([]);
  const { isAuthenticated } = useAuth();
  const syncingRef = useRef(false);

  const refreshCart = useCallback(async () => {
    try {
      setIsLoading(true);

      if (isAuthenticated) {
        // Usuario autenticado: obtener carrito del servidor
        const serverCart = await cartApi.getCart();
        setCart(serverCartToUnified(serverCart));
      } else {
        // Usuario anónimo: obtener carrito local
        const localCart = localCartStorage.getLocalCart();
        setCart(localCartToUnified(localCart));
      }
    } catch (error) {
      console.error('Error loading cart:', error);
      // Si falla el servidor, intentar carrito local
      if (isAuthenticated) {
        const localCart = localCartStorage.getLocalCart();
        if (localCart.items.length > 0) {
          setCart(localCartToUnified(localCart));
        } else {
          // Carrito vacío
          setCart({
            id: 'empty',
            items: [],
            items_count: 0,
            subtotal: '0.00',
            discount_amount: '0.00',
            tax_amount: '0.00',
            total: '0.00',
            coupon: null,
            is_local: false,
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Cargar carrito al iniciar y cuando cambie el estado de autenticación
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  // Sincronizar carrito local con servidor cuando usuario inicia sesión
  const syncCartToServer = useCallback(async () => {
    if (!isAuthenticated) return;
    if (syncingRef.current) return; // Evitar doble sincronización

    const localCart = localCartStorage.getLocalCart();
    if (localCart.items.length === 0 && !localCart.coupon) return;

    syncingRef.current = true;

    // Guardar referencia al cupón pendiente antes de limpiar
    const pendingCoupon = localCart.coupon;

    try {
      setIsLoading(true);

      // Procesar cada item del carrito local
      for (const item of localCart.items) {
        try {
          if (item.item_type === 'product') {
            // Agregar producto al carrito del servidor
            await cartApi.addProductToCart(item.item_id, item.quantity);
          } else if (item.item_type === 'service' && item.appointment_data) {
            // Para servicios: crear la cita real y agregarla al carrito
            const appointment = await createAppointment({
              service: item.item_id,
              staff_member: item.appointment_data.staff_member_id,
              start_datetime: item.appointment_data.start_datetime,
              notes: item.appointment_data.notes,
            });

            // Agregar servicio con la cita al carrito del servidor
            await cartApi.addServiceToCart(item.item_id, appointment.id);
          }
        } catch (error) {
          console.error('Error syncing item to server:', error);
          // Continuar con otros items aunque uno falle
        }
      }

      // Limpiar carrito local después de sincronizar
      localCartStorage.clearLocalCart();

      // Intentar aplicar cupón pendiente si existe
      if (pendingCoupon) {
        try {
          await couponsApi.applyCoupon(pendingCoupon.code);
        } catch (error) {
          console.error('Error applying pending coupon:', error);
          // No es crítico si falla - el usuario puede aplicarlo manualmente
        }
      }

      // Refrescar carrito desde el servidor
      await refreshCart();
    } finally {
      setIsLoading(false);
      syncingRef.current = false;
    }
  }, [isAuthenticated, refreshCart]);

  // Sincronizar automáticamente cuando el usuario inicia sesión
  useEffect(() => {
    const localCart = localCartStorage.getLocalCart();
    const hasPendingData = localCart.items.length > 0 || localCart.coupon;
    if (isAuthenticated && hasPendingData) {
      syncCartToServer();
    }
  }, [isAuthenticated, syncCartToServer]);

  const addProduct = async (
    productId: number,
    quantity: number,
    productData?: { name: string; price: string; description?: string; image?: string }
  ) => {
    if (isAuthenticated) {
      const updatedCart = await cartApi.addProductToCart(productId, quantity);
      setCart(serverCartToUnified(updatedCart));
    } else {
      // Usuario anónimo: agregar al carrito local
      if (!productData) {
        throw new Error('Product data is required for anonymous cart');
      }
      const localCart = localCartStorage.addProductToLocalCart(productId, quantity, productData);
      setCart(localCartToUnified(localCart));
    }
  };

  const addService = async (
    serviceId: number,
    appointmentIdOrData: number | { staff_member_id: number; staff_member_name: string; start_datetime: string; notes?: string },
    serviceData?: { name: string; price: string; description?: string; duration_minutes?: number; formatted_duration?: string }
  ) => {
    if (isAuthenticated && typeof appointmentIdOrData === 'number') {
      // Usuario autenticado con appointmentId
      const updatedCart = await cartApi.addServiceToCart(serviceId, appointmentIdOrData);
      setCart(serverCartToUnified(updatedCart));
    } else if (!isAuthenticated && typeof appointmentIdOrData === 'object' && serviceData) {
      // Usuario anónimo: guardar datos de la cita pendiente
      const localCart = localCartStorage.addServiceToLocalCart(
        serviceId,
        serviceData,
        appointmentIdOrData
      );
      setCart(localCartToUnified(localCart));
    } else {
      throw new Error('Invalid parameters for addService');
    }
  };

  const updateItem = async (itemId: number | string, quantity: number) => {
    if (typeof itemId === 'string' && itemId.startsWith('local_')) {
      // Item local
      const localCart = localCartStorage.updateLocalCartItem(itemId, quantity);
      setCart(localCartToUnified(localCart));
    } else if (isAuthenticated && typeof itemId === 'number') {
      // Item del servidor
      const updatedCart = await cartApi.updateCartItem(itemId, quantity);
      setCart(serverCartToUnified(updatedCart));
    }
  };

  const removeItem = async (itemId: number | string) => {
    if (typeof itemId === 'string' && itemId.startsWith('local_')) {
      // Item local
      const localCart = localCartStorage.removeLocalCartItem(itemId);
      setCart(localCartToUnified(localCart));
    } else if (isAuthenticated && typeof itemId === 'number') {
      // Item del servidor
      const updatedCart = await cartApi.removeCartItem(itemId);
      setCart(serverCartToUnified(updatedCart));
    }
  };

  const clearCart = async () => {
    if (isAuthenticated) {
      await cartApi.clearCart();
    }
    localCartStorage.clearLocalCart();
    await refreshCart();
  };

  const applyCoupon = async (code: string): Promise<boolean> => {
    try {
      setCouponError(null);
      setCouponWarnings([]);

      if (isAuthenticated) {
        // Usuario autenticado: aplicar cupón real
        const response = await couponsApi.applyCoupon(code);

        if (response.success) {
          // Refrescar el carrito para obtener los totales actualizados
          await refreshCart();
          return true;
        }
        return false;
      } else {
        // Usuario anónimo: usar preview
        const subtotal = parseFloat(cart?.subtotal || '0');
        const response = await couponsApi.previewCoupon(code, subtotal);

        if (response.valid) {
          // Guardar cupón pendiente en localStorage
          localCartStorage.setLocalCartCoupon({
            code: response.coupon.code,
            discount_type: response.coupon.discount_type,
            discount_value: response.coupon.discount_value,
            discount_display: response.coupon.discount_display,
            discount_amount: response.discount_amount,
            warnings: response.warnings,
          });

          // Guardar warnings si hay
          if (response.warnings && response.warnings.length > 0) {
            setCouponWarnings(response.warnings);
          }

          // Refrescar carrito local
          await refreshCart();
          return true;
        }
        return false;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al aplicar el cupón';
      setCouponError(errorMessage);
      return false;
    }
  };

  const removeCoupon = async () => {
    try {
      setCouponError(null);
      setCouponWarnings([]);

      if (isAuthenticated) {
        await couponsApi.removeCoupon();
      } else {
        // Usuario anónimo: remover cupón del localStorage
        localCartStorage.removeLocalCartCoupon();
      }

      await refreshCart();
    } catch (error) {
      console.error('Error removing coupon:', error);
    }
  };

  // Determinar si es un cupón pendiente (preview para anónimos)
  const isPendingCoupon = !!(cart?.is_local && cart?.coupon);

  const value = {
    cart,
    isLoading,
    itemsCount: cart?.items_count || 0,
    isLocalCart: cart?.is_local || false,
    appliedCoupon: cart?.coupon || null,
    couponError,
    couponWarnings,
    isPendingCoupon,
    refreshCart,
    addProduct,
    addService,
    updateItem,
    removeItem,
    clearCart,
    syncCartToServer,
    applyCoupon,
    removeCoupon,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
