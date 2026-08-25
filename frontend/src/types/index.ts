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
