export type UserRole = 'ADMIN' | 'SELLER' | 'BUYER' | 'admin' | 'user' | 'staff';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: 'ACTIVE' | 'SUSPENDED' | 'active' | 'suspended';
  mfaEnabled?: boolean;
  claims?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  message: string;
  user?: AuthUser;
  mfaRequired?: boolean;
  mfaChallengeToken?: string;
}

export interface MfaStatusResponse {
  mfaEnabled: boolean;
  hasRecoveryCodes: boolean;
  recoveryCodesRemaining: number;
}

export interface MfaEnrollResponse {
  secret: string;
  otpauthUrl: string;
  message: string;
}

export interface MfaConfirmResponse {
  success: boolean;
  message: string;
  recoveryCodes: string[];
}

export interface SessionItem {
  id: string;
  clientType: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  recentAuthAt?: string;
  mfaVerified: boolean;
  isCurrent: boolean;
}

export interface ApiError {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, string[]>;
  } | string;
  code?: string;
  message?: string;
}
