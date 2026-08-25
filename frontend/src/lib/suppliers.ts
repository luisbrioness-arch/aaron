import { api } from '@/lib/api';
import type { ApiResponse, Supplier } from '@/types';

export async function listSuppliers() {
  const { data } = await api.get<ApiResponse<Supplier[]>>('/suppliers.php?action=list');
  return data;
}

export async function createSupplier(input: { name: string; rut: string; phone?: string; email?: string }) {
  const { data } = await api.post<ApiResponse<Supplier>>('/suppliers.php?action=create', input);
  return data;
}
