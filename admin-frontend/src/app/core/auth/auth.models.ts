export type UserRole = 'ADMIN' | 'SELLER' | 'BUYER' | 'admin' | 'user' | 'staff';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: 'ACTIVE' | 'SUSPENDED' | 'active' | 'suspended';
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  message: string;
  user: AuthUser;
}

export interface ApiError {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, string[]>;
  };
}
