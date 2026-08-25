import { api } from '@/lib/api';
import type { ApiResponse, PurchaseSummary } from '@/types';

export interface CreatePurchaseInput {
  supplier_id: string;
  notes?: string;
  items: { product_id: string; quantity: number; unit_cost: number }[];
}

export interface ReceivePurchaseInput {
  purchase_id: string;
  items: { product_id: string; quantity: number; expiration_date?: string | null; lot_code?: string | null }[];
}

export async function listPurchases() {
  const { data } = await api.get<ApiResponse<PurchaseSummary[]>>('/purchases.php?action=list');
  return data;
}

export async function createPurchase(input: CreatePurchaseInput) {
  const { data } = await api.post<
    ApiResponse<{ id: string; purchase_number: string; total_amount: number; status: string }>
  >('/purchases.php?action=create', input);
  return data;
}

export async function receivePurchase(input: ReceivePurchaseInput) {
  const { data } = await api.post<ApiResponse<{ purchase_id: string; status: string }>>(
    '/purchases.php?action=receive',
    input,
  );
  return data;
}
