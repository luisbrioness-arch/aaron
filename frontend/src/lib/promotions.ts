import { api } from '@/lib/api';
import type { ApiResponse, Promotion, PromotionType } from '@/types';

export interface PromotionInput {
  name: string;
  type: PromotionType;
  buy_quantity: number;
  pay_quantity?: number;
  pack_price?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  product_ids: string[];
}

export async function listPromotions() {
  const { data } = await api.get<ApiResponse<Promotion[]>>('/promotions.php?action=list');
  return data;
}

export async function createPromotion(input: PromotionInput) {
  const { data } = await api.post<ApiResponse<{ id: string }>>('/promotions.php?action=create', input);
  return data;
}

export async function updatePromotion(id: string, input: PromotionInput) {
  const { data } = await api.post<ApiResponse<{ id: string }>>('/promotions.php?action=update', { id, ...input });
  return data;
}

export async function deactivatePromotion(id: string) {
  const { data } = await api.post<ApiResponse<null>>('/promotions.php?action=deactivate', { id });
  return data;
}
