// src/lib/storage/localCart.ts

/**
 * Carrito local para usuarios anónimos
 * Almacena items en localStorage hasta que el usuario inicie sesión
 */

export interface LocalCartItem {
  id: string; // ID único local
  item_type: 'product' | 'service';
  item_id: number;
  quantity: number;
  unit_price: string;
  // Para servicios, guardamos datos de la cita pendiente
  appointment_data?: {
    staff_member_id: number;
    staff_member_name: string;
    start_datetime: string;
    notes?: string;
  };
  // Datos del item para mostrar en UI
  item_data: {
    name: string;
    description?: string;
    image?: string;
    duration_minutes?: number;
    formatted_duration?: string;
  };
  added_at: string;
}

export interface LocalCartCoupon {
  code: string;
  discount_type: 'percentage' | 'fixed_amount' | 'free_shipping';
  discount_value: number;
  discount_display: string;
  discount_amount: number;
  warnings?: string[];
}

export interface LocalCart {
  items: LocalCartItem[];
  coupon?: LocalCartCoupon;
  updated_at: string;
}

const CART_STORAGE_KEY = 'nerbis_anonymous_cart';

/**
 * Obtener carrito del localStorage
 */
export function getLocalCart(): LocalCart {
  if (typeof window === 'undefined') {
    return { items: [], updated_at: new Date().toISOString() };
  }

  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading local cart:', error);
  }

  return { items: [], updated_at: new Date().toISOString() };
}

/**
 * Guardar carrito en localStorage
 */
export function saveLocalCart(cart: LocalCart): void {
  if (typeof window === 'undefined') return;

  try {
    cart.updated_at = new Date().toISOString();
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    console.error('Error saving local cart:', error);
  }
}

/**
 * Generar ID único para item local
 */
function generateItemId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Agregar producto al carrito local
 */
export function addProductToLocalCart(
  productId: number,
  quantity: number,
  productData: {
    name: string;
    price: string;
    description?: string;
    image?: string;
  }
): LocalCart {
  const cart = getLocalCart();

  // Verificar si el producto ya existe
  const existingIndex = cart.items.findIndex(
    (item) => item.item_type === 'product' && item.item_id === productId
  );

  if (existingIndex >= 0) {
    // Incrementar cantidad
    cart.items[existingIndex].quantity += quantity;
  } else {
    // Agregar nuevo item
    cart.items.push({
      id: generateItemId(),
      item_type: 'product',
      item_id: productId,
      quantity,
      unit_price: productData.price,
      item_data: {
        name: productData.name,
        description: productData.description,
        image: productData.image,
      },
      added_at: new Date().toISOString(),
    });
  }

  saveLocalCart(cart);
  return cart;
}

/**
 * Agregar servicio al carrito local (con datos de cita pendiente)
 */
export function addServiceToLocalCart(
  serviceId: number,
  serviceData: {
    name: string;
    price: string;
    description?: string;
    duration_minutes?: number;
    formatted_duration?: string;
  },
  appointmentData: {
    staff_member_id: number;
    staff_member_name: string;
    start_datetime: string;
    notes?: string;
  }
): LocalCart {
  const cart = getLocalCart();

  // Para servicios, siempre agregamos como nuevo item (cada cita es única)
  cart.items.push({
    id: generateItemId(),
    item_type: 'service',
    item_id: serviceId,
    quantity: 1,
    unit_price: serviceData.price,
    item_data: {
      name: serviceData.name,
      description: serviceData.description,
      duration_minutes: serviceData.duration_minutes,
      formatted_duration: serviceData.formatted_duration,
    },
    appointment_data: appointmentData,
    added_at: new Date().toISOString(),
  });

  saveLocalCart(cart);
  return cart;
}

/**
 * Actualizar cantidad de un item
 */
export function updateLocalCartItem(itemId: string, quantity: number): LocalCart {
  const cart = getLocalCart();

  const itemIndex = cart.items.findIndex((item) => item.id === itemId);
  if (itemIndex >= 0) {
    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }
  }

  saveLocalCart(cart);
  return cart;
}

/**
 * Eliminar item del carrito
 */
export function removeLocalCartItem(itemId: string): LocalCart {
  const cart = getLocalCart();
  cart.items = cart.items.filter((item) => item.id !== itemId);
  saveLocalCart(cart);
  return cart;
}

/**
 * Limpiar carrito local
 */
export function clearLocalCart(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(CART_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing local cart:', error);
  }
}

/**
 * Calcular totales del carrito local
 */
export function calculateLocalCartTotals(cart: LocalCart, taxRate = 0.19): {
  items_count: number;
  subtotal: number;
  tax_amount: number;
  total: number;
} {
  const items_count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.items.reduce(
    (sum, item) => sum + parseFloat(item.unit_price) * item.quantity,
    0
  );
  const tax_amount = subtotal * taxRate;
  const total = subtotal + tax_amount;

  return {
    items_count,
    subtotal: Math.round(subtotal * 100) / 100,
    tax_amount: Math.round(tax_amount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Verificar si hay items en el carrito local
 */
export function hasLocalCartItems(): boolean {
  const cart = getLocalCart();
  return cart.items.length > 0;
}

/**
 * Guardar cupón pendiente en carrito local
 */
export function setLocalCartCoupon(coupon: LocalCartCoupon): LocalCart {
  const cart = getLocalCart();
  cart.coupon = coupon;
  saveLocalCart(cart);
  return cart;
}

/**
 * Remover cupón pendiente del carrito local
 */
export function removeLocalCartCoupon(): LocalCart {
  const cart = getLocalCart();
  delete cart.coupon;
  saveLocalCart(cart);
  return cart;
}

/**
 * Obtener cupón pendiente del carrito local
 */
export function getLocalCartCoupon(): LocalCartCoupon | undefined {
  const cart = getLocalCart();
  return cart.coupon;
}

/**
 * Recalcular descuento del cupón pendiente con nuevo subtotal
 */
export function recalculateLocalCouponDiscount(
  coupon: LocalCartCoupon,
  subtotal: number
): number {
  if (coupon.discount_type === 'percentage') {
    return Math.round((subtotal * coupon.discount_value / 100) * 100) / 100;
  } else if (coupon.discount_type === 'fixed_amount') {
    return Math.min(coupon.discount_value, subtotal);
  }
  return 0;
}
