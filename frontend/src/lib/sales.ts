import { api } from '@/lib/api';
import type { ApiResponse, InvoiceType, PaymentMethod, SaleItemInput, SaleResult } from '@/types';

export interface CreateSaleInput {
  items: SaleItemInput[];
  payment_method: PaymentMethod;
  invoice_type?: InvoiceType;
  discount_amount?: number;
  amount_received?: number;
  customer_id?: string;
  customer_name?: string;
  customer_rut?: string;
}

export interface SaleSummary {
  id: string;
  invoice_number: string;
  invoice_type: 'boleta' | 'factura';
  total_amount: number;
  discount_amount: number;
  payment_method: PaymentMethod;
  status: string;
  created_at: string;
  customer_name?: string | null;
  customer_rut?: string | null;
  customer_id?: string | null;
  cashier_name?: string;
}

export interface DailySalesSummary {
  total_revenue: number;
  count: number;
  by_method: Record<string, number>;
  average_ticket: number;
}

export interface DailySalesResult {
  sales: SaleSummary[];
  summary: DailySalesSummary;
}

export interface SaleDetailData {
  sale: {
    id: string;
    invoice_number: string;
    invoice_type: string;
    total_amount: number;
    discount_amount: number;
    payment_method: PaymentMethod;
    amount_received?: number | null;
    change_amount?: number | null;
    customer_name?: string | null;
    customer_rut?: string | null;
    customer_phone?: string | null;
    customer_id?: string | null;
    invoice_date: string;
    created_at: string;
    cashier_name?: string;
  };
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    subtotal: number;
    unit_of_measure?: string;
  }>;
  gross_subtotal: number;
  discount_total: number;
  subtotal: number;
  iva: number;
  rounding_adjustment: number;
}

export async function createSale(input: CreateSaleInput) {
  const { data } = await api.post<ApiResponse<SaleResult>>('/sales.php?action=create', input);
  return data;
}

export async function getSalesByDate(date: string) {
  const { data } = await api.get<ApiResponse<DailySalesResult>>(`/sales.php?action=list&date=${encodeURIComponent(date)}`);
  return data;
}

export async function getSaleDetail(id: string) {
  const { data } = await api.get<ApiResponse<SaleDetailData>>(`/sales.php?action=get&id=${encodeURIComponent(id)}`);
  return data;
}

