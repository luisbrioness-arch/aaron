import { api } from '@/lib/api';
import type {
  ApiResponse,
  CashSummaryRow,
  CategoryBreakdownRow,
  DailySalesReport,
  ExpiringSummary,
  MarginReport,
  MoneyTypeBreakdownRow,
  StagnantProduct,
  TopProduct,
  WeeklySalesPoint,
} from '@/types';

export interface DateRange {
  from?: string;
  to?: string;
}

export async function getDailySales() {
  const { data } = await api.get<ApiResponse<DailySalesReport>>('/reports.php?action=daily-sales');
  return data;
}

export async function getWeeklySales(range?: DateRange) {
  const { data } = await api.get<ApiResponse<WeeklySalesPoint[]>>('/reports.php?action=weekly-sales', {
    params: range,
  });
  return data;
}

export async function getTopProducts() {
  const { data } = await api.get<ApiResponse<TopProduct[]>>('/reports.php?action=top-products');
  return data;
}

export async function getStagnantProducts() {
  const { data } = await api.get<ApiResponse<StagnantProduct[]>>('/reports.php?action=stagnant-products');
  return data;
}

export async function getCashSummary() {
  const { data } = await api.get<ApiResponse<CashSummaryRow[]>>('/reports.php?action=cash-summary');
  return data;
}

export async function getMargin(range?: DateRange) {
  const { data } = await api.get<ApiResponse<MarginReport>>('/reports.php?action=margin', { params: range });
  return data;
}

export async function getCategoryBreakdown(range?: DateRange) {
  const { data } = await api.get<ApiResponse<CategoryBreakdownRow[]>>('/reports.php?action=category-breakdown', {
    params: range,
  });
  return data;
}

export async function getMoneyTypeBreakdown(range?: DateRange) {
  const { data } = await api.get<ApiResponse<MoneyTypeBreakdownRow[]>>('/reports.php?action=money-type-breakdown', {
    params: range,
  });
  return data;
}

export async function getExpiringSummary() {
  const { data } = await api.get<ApiResponse<ExpiringSummary>>('/reports.php?action=expiring-summary');
  return data;
}
