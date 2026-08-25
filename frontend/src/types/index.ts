export type UserRole = 'admin' | 'cashier' | 'warehouse_staff';

export interface AuthUser {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
}

export type UnitOfMeasure = 'units' | 'kilos' | 'liters';

export interface Category {
  id: string;
  name: string;
  icon: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  rut?: string;
  phone?: string | null;
  email?: string | null;
}

export type PurchaseStatus = 'pending' | 'partial' | 'received' | 'cancelled';

export interface PurchaseSummary {
  id: string;
  purchase_number: string;
  purchase_date: string;
  received_date: string | null;
  total_amount: number;
  status: PurchaseStatus;
  supplier_name: string;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  unit_of_measure: UnitOfMeasure;
  is_scale_item: boolean;
  has_expiration: boolean;
  purchase_price: number;
  selling_price: number;
  stock_current: number;
  stock_critical: number;
  is_low_stock: boolean;
  is_active: boolean;
  category: Category | null;
  supplier: Supplier | null;
}

export interface ProductListResponse {
  products: Product[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export type MovementType = 'in' | 'out' | 'adjustment' | 'loss';

export interface InventoryMovement {
  id: string;
  movement_type: MovementType;
  quantity: number;
  unit_cost: number | null;
  reason: string | null;
  created_at: string;
  product_id: string;
  product_name: string;
  product_sku: string;
}

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'mixed';
export type InvoiceType = 'boleta' | 'factura';

export interface CashRegisterState {
  cash_register_id: string;
  opening_amount: number;
  cash_sales: number;
  current_amount: number;
  opened_at: string;
  status: 'open';
}

export interface CashRegisterCloseResult {
  cash_register_id: string;
  opening_amount: number;
  cash_sales: number;
  expected_amount: number;
  closing_amount: number;
  difference: number;
  status: 'closed';
}

export interface SaleItemInput {
  product_id: string;
  quantity: number;
  discount_amount?: number;
}

export interface SaleItemResult {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  subtotal: number;
}

export interface SaleResult {
  sale_id: string;
  invoice_number: string;
  invoice_type: InvoiceType;
  gross_subtotal: number;
  discount_total: number;
  subtotal: number;
  iva: number;
  rounding_adjustment: number;
  total_amount: number;
  amount_received: number | null;
  change_amount: number | null;
  items: SaleItemResult[];
}

// ---- Informes / Dashboard (T-05/T-06) ----

export interface DailySalesReport {
  today_sales: number;
  average_ticket: number;
  low_stock_count: number;
}

export interface WeeklySalesPoint {
  date: string;
  total: number;
}

export interface TopProduct {
  id: string;
  name: string;
  sku: string;
  total_quantity: number;
  total_amount: number;
}

export interface StagnantProduct {
  id: string;
  name: string;
  sku: string;
  stock_current: number;
  last_sale_at: string | null;
}

export interface CashSummaryRow {
  id: string;
  cashier_name: string;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number | null;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at: string | null;
}

export interface MarginProduct {
  id: string;
  name: string;
  sku: string;
  total_quantity: number;
  revenue: number;
  cost: number;
  margin: number;
  margin_pct: number;
}

export interface MarginReport {
  summary: { revenue: number; cost: number; margin: number; margin_pct: number };
  products: MarginProduct[];
}

export interface CategoryBreakdownRow {
  category_id: string | null;
  category_name: string;
  revenue: number;
  cost: number;
  margin: number;
  margin_pct: number;
}

export interface MoneyTypeBreakdownRow {
  payment_method: PaymentMethod;
  revenue: number;
  sale_count: number;
}

export interface ExpiringSummary {
  expiring_count: number;
  expired_count: number;
}

// ---- Promociones (T-07) ----

export type PromotionType = 'nxm' | 'pack_price';

export interface Promotion {
  id: string;
  name: string;
  type: PromotionType;
  buy_quantity: number | null;
  pay_quantity: number | null;
  pack_price: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  product_ids: string[];
}

// ---- Usuarios (T-09) ----

export interface UserListItem {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  days_worked: number;
  last_worked_on: string | null;
}

export interface WorkdayRow {
  work_date: string;
  sales_count: number;
  sales_total: number;
  registers_opened: number;
  first_opened_at: string | null;
  last_closed_at: string | null;
}

export interface WorkdaysResponse {
  user: { id: string; username: string; full_name: string; role: UserRole };
  days: WorkdayRow[];
}
