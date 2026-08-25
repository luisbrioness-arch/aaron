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
