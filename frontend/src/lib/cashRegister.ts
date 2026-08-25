import { api } from '@/lib/api';
import type { ApiResponse, CashRegisterCloseResult, CashRegisterState } from '@/types';

export async function getCurrentRegister() {
  const { data } = await api.get<ApiResponse<CashRegisterState | null>>('/cash_register.php?action=current');
  return data;
}

export async function openRegister(openingAmount: number) {
  const { data } = await api.post<ApiResponse<{ cash_register_id: string; opening_amount: number; status: 'open' }>>(
    '/cash_register.php?action=open',
    { opening_amount: openingAmount },
  );
  return data;
}

export async function closeRegister(closingAmount: number) {
  const { data } = await api.post<ApiResponse<CashRegisterCloseResult>>('/cash_register.php?action=close', {
    closing_amount: closingAmount,
  });
  return data;
}
