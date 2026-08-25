import { api } from '@/lib/api';
import type { ApiResponse, Category, Product, ProductListResponse } from '@/types';

export interface ProductInput {
  sku: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  category_id?: string | null;
  supplier_id?: string | null;
  unit_of_measure: Product['unit_of_measure'];
  is_scale_item: boolean;
  has_expiration: boolean;
  purchase_price: number;
  selling_price: number;
  stock_critical: number;
  stock_current?: number;
}

export async function listProducts(params: { page?: number; q?: string; category?: string }) {
  const { data } = await api.get<ApiResponse<ProductListResponse>>('/products.php?action=list', {
    params,
  });
  return data;
}

export async function searchProducts(q: string, category?: string) {
  const { data } = await api.get<ApiResponse<Product[]>>('/products.php?action=search', {
    params: { q, category },
  });
  return data;
}

export async function lowStockProducts() {
  const { data } = await api.get<ApiResponse<Product[]>>('/products.php?action=low-stock');
  return data;
}

export async function listCategories() {
  const { data } = await api.get<ApiResponse<Category[]>>('/products.php?action=categories');
  return data;
}

export async function createProduct(input: ProductInput) {
  const { data } = await api.post<ApiResponse<Product>>('/products.php?action=create', input);
  return data;
}

export async function updateProduct(id: string, input: Partial<ProductInput>) {
  const { data } = await api.post<ApiResponse<Product>>('/products.php?action=update', {
    id,
    ...input,
  });
  return data;
}

export async function deactivateProduct(id: string) {
  const { data } = await api.post<ApiResponse<null>>('/products.php?action=deactivate', { id });
  return data;
}
