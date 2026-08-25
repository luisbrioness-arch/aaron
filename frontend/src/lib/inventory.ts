import { api } from '@/lib/api';
import type { ApiResponse, InventoryMovement, MovementType } from '@/types';

export interface MovementInput {
  product_id: string;
  movement_type: MovementType;
  quantity: number;
  reason?: string;
  unit_cost?: number | null;
}

export interface MovementResult {
  product_id: string;
  stock_before: number;
  stock_after: number;
}

export async function recordMovement(input: MovementInput) {
  const { data } = await api.post<ApiResponse<MovementResult>>('/inventory.php?action=movement', input);
  return data;
}

export async function listMovements() {
  const { data } = await api.get<ApiResponse<InventoryMovement[]>>('/inventory.php?action=list');
  return data;
}
