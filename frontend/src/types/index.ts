export type UserRole = 'admin' | 'cashier' | 'warehouse_staff';

export interface AuthUser {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
}
