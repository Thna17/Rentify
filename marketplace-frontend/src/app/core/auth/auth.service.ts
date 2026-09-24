import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, tap } from 'rxjs';
import {
  ApiError,
  AuthResponse,
  AuthUser,
  MessageResponse,
  RegisterResponse,
  ResendCodeResponse,
  UserRole,
} from './auth.models';
import { AUTH_URL as API_URL } from '../api/api.config';
import { RentifyMarketplaceService } from '../rentify/rentify-marketplace.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly rentify = inject(RentifyMarketplaceService);
  private readonly userState = signal<AuthUser | null>(null);
  private readonly checkedState = signal(false);

  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.userState()));

  getLoginUrl(returnUrl?: string): string {
    const returnTarget = returnUrl || (typeof window !== 'undefined' ? window.location.href : '/');
    return this.rentify.authLink('login', returnTarget);
  }

  getRegisterUrl(returnUrl?: string): string {
    const returnTarget = returnUrl || (typeof window !== 'undefined' ? window.location.href : '/');
    return this.rentify.authLink('signup', returnTarget);
  }

  getForgotPasswordUrl(returnUrl?: string): string {
    const returnTarget = returnUrl || (typeof window !== 'undefined' ? window.location.href : '/');
    return this.rentify.authLink('forgot-password', returnTarget);
  }

  redirectToLogin(returnUrl?: string): void {
    if (typeof window !== 'undefined') {
      window.location.href = this.getLoginUrl(returnUrl);
    }
  }

  redirectToRegister(returnUrl?: string): void {
    if (typeof window !== 'undefined') {
      window.location.href = this.getRegisterUrl(returnUrl);
    }
  }

  /** Creates the account and sends a 6-digit code. */
  register(payload: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    phone?: string;
  }) {
    return this.http.post<RegisterResponse>(`${this.rentify.core}/api/auth/signup`, payload);
  }

  verifyEmail(email: string, code: string) {
    return this.http
      .post<AuthResponse>(`${this.rentify.core}/api/auth/verify-otp`, { email, otp: code })
      .pipe(tap(({ user }) => this.setUser(user)));
  }

  resendCode(email: string) {
    return this.http.post<ResendCodeResponse>(`${this.rentify.core}/api/auth/resend-otp`, {
      email,
    });
  }

  login(email: string, password: string, expectedRole?: UserRole): Observable<AuthResponse> {
    return this.http
      .post<{ data: { user: any; accessToken: string }; message?: string }>(
        `${this.rentify.core}/api/auth/login`,
        {
          email,
          password,
          ...(expectedRole ? { expectedRole } : {}),
        },
      )
      .pipe(
        map((res) => {
          const u = res?.data?.user;
          const authUser: AuthUser = {
            id: u?.id || '',
            name: u?.name || 'User',
            email: u?.email || email,
            phone: u?.phoneNumber || undefined,
            role: (u?.role?.toUpperCase() === 'SELLER'
              ? 'SELLER'
              : u?.role?.toUpperCase() === 'ADMIN'
              ? 'ADMIN'
              : 'BUYER') as UserRole,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          this.setUser(authUser);
          return { message: res.message || 'Login successful', user: authUser };
        }),
      );
  }

  logout() {
    return this.rentify.logout().pipe(
      finalize(() => {
        this.userState.set(null);
        this.checkedState.set(true);
      }),
    );
  }

  forgotPassword(email: string) {
    return this.http.post<MessageResponse>(`${API_URL}/forgot-password`, {
      email,
    });
  }

  resetPassword(
    token: string,
    password: string,
    confirmPassword: string,
  ) {
    return this.http.post<MessageResponse>(`${API_URL}/reset-password`, {
      token,
      password,
      confirmPassword,
    });
  }

  changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    return this.http.patch<MessageResponse>(`${API_URL}/change-password`, {
      currentPassword,
      newPassword,
      confirmPassword,
    });
  }

  loadCurrentUser(): Observable<AuthUser | null> {
    if (this.checkedState()) {
      return of(this.userState());
    }

    return this.rentify.session().pipe(
      map(({ user }) => {
        if (!user) {
          this.userState.set(null);
          this.checkedState.set(true);
          return null;
        }
        const authUser: AuthUser = {
          id: user.id,
          name: user.name,
          email: user.email || '',
          phone: user.phoneNumber || undefined,
          role: ((user as any).role?.toUpperCase() === 'SELLER'
            ? 'SELLER'
            : (user as any).role?.toUpperCase() === 'ADMIN'
            ? 'ADMIN'
            : 'BUYER') as UserRole,
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        this.setUser(authUser);
        return authUser;
      }),
      catchError(() => {
        this.userState.set(null);
        this.checkedState.set(true);
        return of(null);
      }),
    );
  }

  /** Reloads the server-issued session after a role-changing action. */
  refreshCurrentUser(): Observable<AuthUser | null> {
    this.checkedState.set(false);
    return this.loadCurrentUser();
  }

  private setUser(user: AuthUser) {
    this.userState.set(user);
    this.checkedState.set(true);
  }
}

export const apiErrorMessage = (
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
) => {
  if (error instanceof HttpErrorResponse) {
    return (error.error as ApiError | undefined)?.error?.message ?? (error.error as any)?.message ?? fallback;
  }
  return fallback;
};
