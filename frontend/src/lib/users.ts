import { api } from '@/lib/api';
import type { ApiResponse, UserListItem, UserRole, WorkdaysResponse } from '@/types';

export async function listUsers() {
  const { data } = await api.get<ApiResponse<UserListItem[]>>('/users.php?action=list');
  return data;
}

export async function getWorkdays(userId: string) {
  const { data } = await api.get<ApiResponse<WorkdaysResponse>>('/users.php?action=workdays', {
    params: { user_id: userId },
  });
  return data;
}

export async function createUser(input: {
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  password: string;
}) {
  const { data } = await api.post<ApiResponse<{ id: string }>>('/users.php?action=create', input);
  return data;
}

export async function updateUser(id: string, input: { full_name: string; email: string; role: UserRole }) {
  const { data } = await api.post<ApiResponse<null>>('/users.php?action=update', { id, ...input });
  return data;
}

export async function activateUser(id: string) {
  const { data } = await api.post<ApiResponse<null>>('/users.php?action=activate', { id });
  return data;
}

export async function deactivateUser(id: string) {
  const { data } = await api.post<ApiResponse<null>>('/users.php?action=deactivate', { id });
  return data;
}

export async function resetPassword(id: string, password: string) {
  const { data } = await api.post<ApiResponse<null>>('/users.php?action=reset-password', { id, password });
  return data;
}
