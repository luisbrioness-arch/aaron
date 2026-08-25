import { api } from '@/lib/api';
import type { ApiResponse } from '@/types';

export interface ExpiringLot {
  id: string;
  product_id: string;
  lot_code: string | null;
  expiration_date: string;
  quantity_remaining: number;
  product_name: string;
  sku: string;
  unit_of_measure: 'units' | 'kilos' | 'liters';
  days_until_expiration: number;
}

export async function listExpiring() {
  const { data } = await api.get<ApiResponse<ExpiringLot[]>>('/lots.php?action=expiring');
  return data;
}

export async function listExpired() {
  const { data } = await api.get<ApiResponse<ExpiringLot[]>>('/lots.php?action=expired');
  return data;
}

export async function adjustLot(lotId: string, quantity?: number) {
  const { data } = await api.post<
    ApiResponse<{ lot_id: string; quantity_adjusted: number; quantity_remaining: number }>
  >('/lots.php?action=adjust', { lot_id: lotId, quantity });
  return data;
}
