import { api } from '@/lib/api';
import type { ApiResponse, InvoiceType, PaymentMethod, SaleItemInput, SaleResult } from '@/types';

export interface CreateSaleInput {
  items: SaleItemInput[];
  payment_method: PaymentMethod;
  invoice_type?: InvoiceType;
  discount_amount?: number;
  amount_received?: number;
  customer_name?: string;
  customer_rut?: string;
}

export async function createSale(input: CreateSaleInput) {
  const { data } = await api.post<ApiResponse<SaleResult>>('/sales.php?action=create', input);
  return data;
}
