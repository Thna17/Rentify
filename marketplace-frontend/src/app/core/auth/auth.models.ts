/** Mirrors USER_ROLES in the API's models/User.ts. SELLER was missing here,
 *  so a seller signing in could not be represented at all. */
export type UserRole = 'BUYER' | 'SELLER' | 'ADMIN';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: 'ACTIVE' | 'SUSPENDED';
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  message: string;
  user: AuthUser;
}

/**
 * Registering no longer starts a session — the account exists but is
 * unverified until the emailed code is entered on /verify.
 */
export interface RegisterResponse {
  message: string;
  email: string;
  /** Only present outside production — see auth.service.ts on the API. */
  devCode?: string;
}

export interface ResendCodeResponse {
  message: string;
  devCode?: string;
}

export interface MessageResponse {
  message: string;
}

export interface ApiError {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, string[]>;
  };
}
