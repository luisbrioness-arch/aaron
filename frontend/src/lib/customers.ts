import { api } from '@/lib/api';
import type { ApiResponse, Customer, CustomerPaymentResult } from '@/types';

export interface CustomerListResult {
  customers: Customer[];
  total_debt: number;
  count: number;
}

export async function listCustomers(params?: { search?: string; with_debt?: boolean }) {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.with_debt) query.set('with_debt', '1');

  const { data } = await api.get<ApiResponse<CustomerListResult>>(`/customers.php?action=list&${query.toString()}`);
  return data;
}

export async function getCustomer(id: string) {
  const { data } = await api.get<ApiResponse<Customer>>(`/customers.php?action=get&id=${encodeURIComponent(id)}`);
  return data;
}

export async function createCustomer(payload: {
  name: string;
  rut?: string;
  phone?: string;
  address?: string;
  notes?: string;
  credit_limit?: number;
}) {
  const { data } = await api.post<ApiResponse<Customer>>('/customers.php?action=create', payload);
  return data;
}

export async function updateCustomer(payload: {
  id: string;
  name: string;
  rut?: string;
  phone?: string;
  address?: string;
  notes?: string;
  credit_limit?: number;
}) {
  const { data } = await api.post<ApiResponse<{ id: string }>>('/customers.php?action=update', payload);
  return data;
}

export async function registerCustomerPayment(payload: {
  customer_id: string;
  amount: number;
  payment_method: 'cash' | 'transfer';
  notes?: string;
}) {
  const { data } = await api.post<ApiResponse<CustomerPaymentResult>>('/customers.php?action=payment', payload);
  return data;
}

export async function getCustomerHistory(customerId: string) {
  const { data } = await api.get<ApiResponse<any[]>>(`/customers.php?action=history&customer_id=${encodeURIComponent(customerId)}`);
  return data;
}
