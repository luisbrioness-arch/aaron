import { api } from '@/lib/api';
import type { ApiResponse, Supplier } from '@/types';

export async function listSuppliers() {
  const { data } = await api.get<ApiResponse<Supplier[]>>('/suppliers.php?action=list');
  return data;
}

export interface SupplierInput {
  name: string;
  rut: string;
  phone?: string;
  email?: string;
  address?: string;
  contact_person?: string;
}

export async function createSupplier(input: SupplierInput) {
  const { data } = await api.post<ApiResponse<Supplier>>('/suppliers.php?action=create', input);
  return data;
}

export async function updateSupplier(id: string, input: Partial<SupplierInput>) {
  const { data } = await api.post<ApiResponse<null>>('/suppliers.php?action=update', { id, ...input });
  return data;
}

export async function deactivateSupplier(id: string) {
  const { data } = await api.post<ApiResponse<null>>('/suppliers.php?action=deactivate', { id });
  return data;
}
