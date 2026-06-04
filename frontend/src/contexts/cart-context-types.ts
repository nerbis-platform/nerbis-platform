import type { CartItem, AppliedCoupon } from '@/types';

// ─── Local cart display type ─────────────────────────────

export interface LocalCartItemDisplay {
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

// ─── Unified cart type ───────────────────────────────────

export interface UnifiedCart {
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

// ─── Context type ────────────────────────────────────────

export interface CartContextType {
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
