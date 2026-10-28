import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of } from 'rxjs';
import {
  ApiError,
  AuthResponse,
  AuthUser,
  MfaConfirmResponse,
  MfaEnrollResponse,
  MfaStatusResponse,
  SessionItem,
  UserRole,
} from './auth.models';
import { RentifyAdminService } from '../rentify/rentify-admin.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly rentify = inject(RentifyAdminService);
  private readonly userState = signal<AuthUser | null>(null);
  private readonly checkedState = signal(false);

  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.userState()));
  readonly isAdmin = computed(() => {
    const role = this.userState()?.role?.toUpperCase();
    return role === 'ADMIN';
  });

  hasPermission(claim: string): boolean {
    const user = this.userState();
    if (!user) return false;
    const role = user.role?.toUpperCase();
    if (role === 'ADMIN') {
      if (Array.isArray(user.claims) && user.claims.length > 0) {
        return user.claims.includes(claim);
      }
      return true;
    }
    return Boolean(user.claims?.includes(claim));
  }

  canViewSupport(): boolean {
    return this.hasPermission('support:case:read');
  }

  canWriteSupport(): boolean {
    return this.hasPermission('support:case:write');
  }

  canResolveDisputes(): boolean {
    return this.hasPermission('support:dispute:resolve');
  }

  canModerateCatalog(): boolean {
    return this.hasPermission('catalog:moderate');
  }

  canApproveMakerChecker(): boolean {
    return this.hasPermission('maker_checker:approve');
  }

  getLoginUrl(returnUrl?: string): string {
    const returnTarget =
      returnUrl || (typeof window !== 'undefined' ? window.location.href : 'http://localhost:4800');
    return this.rentify.authLink('login', returnTarget);
  }

  redirectToLogin(returnUrl?: string): void {
    if (typeof window !== 'undefined') {
      window.location.href = this.getLoginUrl(returnUrl);
    }
  }

  login(email: string, password: string, mfaToken?: string, recoveryCode?: string): Observable<AuthResponse> {
    return this.http
      .post<{ data: { user?: any; accessToken?: string; mfaRequired?: boolean; mfaChallengeToken?: string }; message?: string }>(
        `${this.rentify.core}/api/auth/login`,
        { email, password, expectedRole: 'ADMIN', mfaToken, recoveryCode },
      )
      .pipe(
        map((res) => {
          if (res?.data?.mfaRequired) {
            return {
              message: res.message || 'MFA verification required',
              mfaRequired: true,
              mfaChallengeToken: res.data.mfaChallengeToken,
            };
          }
          const u = res?.data?.user;
          const authUser: AuthUser = {
            id: u?.id || '',
            name: u?.name || 'Administrator',
            email: u?.email || email,
            phone: u?.phoneNumber || undefined,
            role: (u?.role?.toUpperCase() === 'ADMIN' ? 'ADMIN' : u?.role || 'ADMIN') as UserRole,
            status: 'ACTIVE',
            mfaEnabled: Boolean(u?.mfaEnabled),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          this.setUser(authUser);
          return { message: res.message || 'Login successful', user: authUser };
        }),
      );
  }

  verifyMfaChallenge(mfaChallengeToken: string, mfaToken?: string, recoveryCode?: string): Observable<AuthResponse> {
    return this.http
      .post<{ data: { user: any; accessToken: string }; message?: string }>(
        `${this.rentify.core}/api/auth/mfa/challenge`,
        { mfaChallengeToken, mfaToken, recoveryCode },
      )
      .pipe(
        map((res) => {
          const u = res?.data?.user;
          const authUser: AuthUser = {
            id: u?.id || '',
            name: u?.name || 'Administrator',
            email: u?.email || '',
            phone: u?.phoneNumber || undefined,
            role: (u?.role?.toUpperCase() === 'ADMIN' ? 'ADMIN' : u?.role || 'ADMIN') as UserRole,
            status: 'ACTIVE',
            mfaEnabled: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          this.setUser(authUser);
          return { message: res.message || 'MFA verified successfully', user: authUser };
        }),
      );
  }

  logout(): Observable<any> {
    return this.rentify.logout().pipe(
      catchError(() => of(null)),
      finalize(() => {
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('rentify_token');
          }
        } catch {}
        this.userState.set(null);
        this.checkedState.set(true);
        this.redirectToLogin('http://localhost:4800');
      }),
    );
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
          role: (user.role?.toUpperCase() === 'ADMIN' ? 'ADMIN' : user.role) as UserRole,
          status: 'ACTIVE',
          mfaEnabled: Boolean(user.mfaEnabled),
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

  refreshCurrentUser(): Observable<AuthUser | null> {
    this.checkedState.set(false);
    return this.loadCurrentUser();
  }

  setUser(user: AuthUser | null) {
    this.userState.set(user);
    this.checkedState.set(true);
  }

  // --- Privileged Security & Session Controls (P2-SEC-001) ---

  getMfaStatus(): Observable<MfaStatusResponse> {
    return this.http.get<MfaStatusResponse>(`${this.rentify.core}/admin/mfa/status`);
  }

  enrollMfa(): Observable<MfaEnrollResponse> {
    return this.http.post<MfaEnrollResponse>(`${this.rentify.core}/admin/mfa/enroll`, {});
  }

  confirmMfa(code: string): Observable<MfaConfirmResponse> {
    return this.http.post<MfaConfirmResponse>(`${this.rentify.core}/admin/mfa/confirm`, { code });
  }

  disableMfa(password: string, code?: string): Observable<any> {
    return this.http.post(`${this.rentify.core}/admin/mfa/disable`, { password, code });
  }

  regenerateRecoveryCodes(): Observable<{ recoveryCodes: string[] }> {
    return this.http.post<{ recoveryCodes: string[] }>(
      `${this.rentify.core}/admin/mfa/recovery-codes/regenerate`,
      {},
    );
  }

  stepUpAuth(password: string, mfaToken?: string, recoveryCode?: string): Observable<any> {
    return this.http.post(`${this.rentify.core}/admin/auth/step-up`, {
      password,
      mfaToken,
      recoveryCode,
    });
  }

  listSessions(): Observable<SessionItem[]> {
    return this.http
      .get<{ data: SessionItem[] }>(`${this.rentify.core}/admin/sessions`)
      .pipe(map((res) => res.data || []));
  }

  revokeSession(sessionId: string): Observable<any> {
    return this.http.delete(`${this.rentify.core}/admin/sessions/${sessionId}`);
  }

  revokeOtherSessions(): Observable<{ revokedCount: number }> {
    return this.http.post<{ revokedCount: number }>(
      `${this.rentify.core}/admin/sessions/revoke-others`,
      {},
    );
  }

  requestContactChange(newEmail?: string, newPhoneNumber?: string): Observable<any> {
    return this.http.post(`${this.rentify.core}/admin/contact/change-request`, {
      newEmail,
      newPhoneNumber,
    });
  }

  verifyContactChange(otp: string): Observable<any> {
    return this.http.post(`${this.rentify.core}/admin/contact/verify`, { otp });
  }
}

export const apiErrorMessage = (
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
) => {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as (ApiError & { error?: { message?: string } | string; message?: string }) | null;
    if (typeof body?.error === 'string') return body.error;
    return body?.error?.message ?? body?.message ??
      (error.status === 0 ? 'Cannot reach the API. Check that the service is running.' : fallback);
  }
  return fallback;
};
