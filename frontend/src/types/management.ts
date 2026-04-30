// src/types/management.ts
//
// Tipos para el modulo de Gestion Comercial (management).
// Mirrors backend serializers en management/serializers.py.

// ===================================
// PROVEEDORES
// ===================================

export interface Supplier {
  id: number;
  name: string;
  tax_id: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierList {
  id: number;
  name: string;
  tax_id: string;
  email: string;
  phone: string;
  is_active: boolean;
}

export interface SupplierFormData {
  name: string;
  tax_id?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  notes?: string;
  is_active?: boolean;
}

export interface SupplierFilters {
  search?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
  ordering?: string;
}

// ===================================
// ORDENES DE COMPRA
// ===================================

export type PurchaseOrderStatus = 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';

export interface PurchaseOrderItem {
  id: number;
  product: number;
  product_name: string;
  quantity: number;
  unit_cost: string;
  total_cost: string;
  received_quantity: number;
}

export interface PurchaseOrderItemFormData {
  product: number;
  quantity: number;
  unit_cost: string;
}

export interface PurchaseOrder {
  id: number;
  order_number: string;
  supplier: number;
  supplier_name: string;
  status: PurchaseOrderStatus;
  status_display: string;
  items: PurchaseOrderItem[];
  subtotal: string;
  tax_amount: string;
  total: string;
  notes: string;
  expected_date: string | null;
  received_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderList {
  id: number;
  order_number: string;
  supplier_name: string;
  status: PurchaseOrderStatus;
  status_display: string;
  total: string;
  expected_date: string | null;
  created_at: string;
}

export interface PurchaseOrderFormData {
  supplier: number;
  items: PurchaseOrderItemFormData[];
  notes?: string;
  expected_date?: string;
}

export interface PurchaseOrderFilters {
  search?: string;
  status?: PurchaseOrderStatus;
  supplier?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

// ===================================
// VENTAS
// ===================================

export type SaleStatus = 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other';

export interface SaleItem {
  id: number;
  product: number;
  product_name: string;
  quantity: number;
  unit_price: string;
  total_price: string;
}

export interface SaleItemFormData {
  product: number;
  quantity: number;
  unit_price: string;
}

export interface Sale {
  id: number;
  sale_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: SaleStatus;
  status_display: string;
  payment_method: PaymentMethod;
  payment_method_display: string;
  items: SaleItem[];
  subtotal: string;
  tax_amount: string;
  total: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface SaleList {
  id: number;
  sale_number: string;
  customer_name: string;
  status: SaleStatus;
  status_display: string;
  payment_method: PaymentMethod;
  payment_method_display: string;
  total: string;
  created_at: string;
}

export interface SaleFormData {
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  payment_method: PaymentMethod;
  items: SaleItemFormData[];
  notes?: string;
}

export interface SaleFilters {
  search?: string;
  status?: SaleStatus;
  payment_method?: PaymentMethod;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

// ===================================
// GASTOS
// ===================================

export interface ExpenseCategory {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
}

export interface ExpenseCategoryFormData {
  name: string;
  description?: string;
}

export interface Expense {
  id: number;
  description: string;
  category: number | null;
  category_name: string;
  supplier: number | null;
  supplier_name: string;
  amount: string;
  date: string;
  payment_method: PaymentMethod;
  payment_method_display: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseList {
  id: number;
  description: string;
  category_name: string;
  supplier_name: string;
  amount: string;
  date: string;
  payment_method_display: string;
}

export interface ExpenseFormData {
  description: string;
  category?: number;
  supplier?: number;
  amount: string;
  date: string;
  payment_method: PaymentMethod;
  notes?: string;
}

export interface ExpenseFilters {
  search?: string;
  category?: number;
  supplier?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

// ===================================
// MOVIMIENTOS DE INVENTARIO
// ===================================

export type MovementType = 'in' | 'out' | 'adjust';
export type ReferenceType = 'purchase' | 'sale' | 'adjustment' | 'return' | 'initial';

export interface InventoryMovement {
  id: number;
  product: number;
  product_name: string;
  product_sku: string;
  movement_type: MovementType;
  movement_type_display: string;
  quantity: number;
  reference_type: ReferenceType;
  reference_type_display: string;
  reference_number: string;
  notes: string;
  moved_at: string;
  created_at: string;
}

export interface InventoryMovementFilters {
  product?: number;
  movement_type?: MovementType;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

// ===================================
// DASHBOARD
// ===================================

export interface TopProduct {
  product_id: number;
  product_name: string;
  total_quantity: number;
  total_revenue: string;
}

export interface LowStockProduct {
  id: number;
  name: string;
  stock: number;
  low_stock_threshold: number;
}

export interface ManagementDashboardData {
  total_sales: string;
  total_expenses: string;
  gross_margin: string;
  sales_count: number;
  low_stock_products: LowStockProduct[];
  top_products: TopProduct[];
}
