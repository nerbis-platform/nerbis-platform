// src/lib/api/management.ts
//
// API client para el modulo de Gestion Comercial.
// Todas las llamadas usan apiClient que incluye el header X-Tenant-Slug.

import { apiClient } from './client';
import type { PaginatedResponse } from '@/types';
import type {
  Supplier,
  SupplierList,
  SupplierFormData,
  SupplierFilters,
  PurchaseOrder,
  PurchaseOrderList,
  PurchaseOrderFormData,
  PurchaseOrderFilters,
  Sale,
  SaleList,
  SaleFormData,
  SaleFilters,
  Expense,
  ExpenseList,
  ExpenseFormData,
  ExpenseFilters,
  ExpenseCategory,
  ExpenseCategoryFormData,
  InventoryMovement,
  InventoryMovementFilters,
  ManagementDashboardData,
} from '@/types/management';

// Utilidad para limpiar params undefined
function cleanParams(
  filters: object | undefined,
): Record<string, string | number | boolean> | undefined {
  if (!filters) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    out[key] = value as string | number | boolean;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

// ──────────────────────────────────────────────────────────────────────
// Proveedores
// ──────────────────────────────────────────────────────────────────────

export async function getSuppliers(
  filters?: SupplierFilters,
): Promise<PaginatedResponse<SupplierList>> {
  const { data } = await apiClient.get<PaginatedResponse<SupplierList>>(
    '/management/suppliers/',
    { params: cleanParams(filters) },
  );
  return data;
}

export async function getSupplier(id: number): Promise<Supplier> {
  const { data } = await apiClient.get<Supplier>(`/management/suppliers/${id}/`);
  return data;
}

export async function createSupplier(payload: SupplierFormData): Promise<Supplier> {
  const { data } = await apiClient.post<Supplier>('/management/suppliers/', payload);
  return data;
}

export async function updateSupplier(id: number, payload: Partial<SupplierFormData>): Promise<Supplier> {
  const { data } = await apiClient.patch<Supplier>(`/management/suppliers/${id}/`, payload);
  return data;
}

export async function deleteSupplier(id: number): Promise<void> {
  await apiClient.delete(`/management/suppliers/${id}/`);
}

// ──────────────────────────────────────────────────────────────────────
// Ordenes de compra
// ──────────────────────────────────────────────────────────────────────

export async function getPurchaseOrders(
  filters?: PurchaseOrderFilters,
): Promise<PaginatedResponse<PurchaseOrderList>> {
  const { data } = await apiClient.get<PaginatedResponse<PurchaseOrderList>>(
    '/management/purchase-orders/',
    { params: cleanParams(filters) },
  );
  return data;
}

export async function getPurchaseOrder(id: number): Promise<PurchaseOrder> {
  const { data } = await apiClient.get<PurchaseOrder>(`/management/purchase-orders/${id}/`);
  return data;
}

export async function createPurchaseOrder(payload: PurchaseOrderFormData): Promise<PurchaseOrder> {
  const { data } = await apiClient.post<PurchaseOrder>('/management/purchase-orders/', payload);
  return data;
}

export async function updatePurchaseOrder(
  id: number,
  payload: Partial<PurchaseOrderFormData>,
): Promise<PurchaseOrder> {
  const { data } = await apiClient.patch<PurchaseOrder>(
    `/management/purchase-orders/${id}/`,
    payload,
  );
  return data;
}

export async function receivePurchaseOrder(id: number): Promise<PurchaseOrder> {
  const { data } = await apiClient.post<PurchaseOrder>(
    `/management/purchase-orders/${id}/receive/`,
  );
  return data;
}

// ──────────────────────────────────────────────────────────────────────
// Ventas
// ──────────────────────────────────────────────────────────────────────

export async function getSales(
  filters?: SaleFilters,
): Promise<PaginatedResponse<SaleList>> {
  const { data } = await apiClient.get<PaginatedResponse<SaleList>>(
    '/management/sales/',
    { params: cleanParams(filters) },
  );
  return data;
}

export async function getSale(id: number): Promise<Sale> {
  const { data } = await apiClient.get<Sale>(`/management/sales/${id}/`);
  return data;
}

export async function createSale(payload: SaleFormData): Promise<Sale> {
  const { data } = await apiClient.post<Sale>('/management/sales/', payload);
  return data;
}

export async function cancelSale(id: number): Promise<Sale> {
  const { data } = await apiClient.post<Sale>(`/management/sales/${id}/cancel/`);
  return data;
}

// ──────────────────────────────────────────────────────────────────────
// Gastos
// ──────────────────────────────────────────────────────────────────────

export async function getExpenses(
  filters?: ExpenseFilters,
): Promise<PaginatedResponse<ExpenseList>> {
  const { data } = await apiClient.get<PaginatedResponse<ExpenseList>>(
    '/management/expenses/',
    { params: cleanParams(filters) },
  );
  return data;
}

export async function getExpense(id: number): Promise<Expense> {
  const { data } = await apiClient.get<Expense>(`/management/expenses/${id}/`);
  return data;
}

export async function createExpense(payload: ExpenseFormData): Promise<Expense> {
  const { data } = await apiClient.post<Expense>('/management/expenses/', payload);
  return data;
}

export async function updateExpense(id: number, payload: Partial<ExpenseFormData>): Promise<Expense> {
  const { data } = await apiClient.patch<Expense>(`/management/expenses/${id}/`, payload);
  return data;
}

export async function deleteExpense(id: number): Promise<void> {
  await apiClient.delete(`/management/expenses/${id}/`);
}

// ──────────────────────────────────────────────────────────────────────
// Categorias de gastos
// ──────────────────────────────────────────────────────────────────────

export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  const { data } = await apiClient.get<ExpenseCategory[]>('/management/expense-categories/');
  return data;
}

export async function createExpenseCategory(payload: ExpenseCategoryFormData): Promise<ExpenseCategory> {
  const { data } = await apiClient.post<ExpenseCategory>(
    '/management/expense-categories/',
    payload,
  );
  return data;
}

// ──────────────────────────────────────────────────────────────────────
// Movimientos de inventario
// ──────────────────────────────────────────────────────────────────────

export async function getInventoryMovements(
  filters?: InventoryMovementFilters,
): Promise<PaginatedResponse<InventoryMovement>> {
  const { data } = await apiClient.get<PaginatedResponse<InventoryMovement>>(
    '/management/inventory-movements/',
    { params: cleanParams(filters) },
  );
  return data;
}

// ──────────────────────────────────────────────────────────────────────
// Dashboard
// ──────────────────────────────────────────────────────────────────────

export async function getDashboardData(
  startDate?: string,
  endDate?: string,
): Promise<ManagementDashboardData> {
  const { data } = await apiClient.get<ManagementDashboardData>(
    '/management/dashboard/',
    {
      params: cleanParams({
        start_date: startDate,
        end_date: endDate,
      }),
    },
  );
  return data;
}
