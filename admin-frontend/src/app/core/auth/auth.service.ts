import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, tap } from 'rxjs';
import { ApiError, AuthResponse, AuthUser, UserRole } from './auth.models';
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

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<{ data: { user: any; accessToken: string }; message?: string }>(
        `${this.rentify.core}/api/auth/login`,
        { email, password, expectedRole: 'ADMIN' },
      )
      .pipe(
        map((res) => {
          if (res?.data?.accessToken && typeof localStorage !== 'undefined') {
            try {
              localStorage.setItem('rentify_token', res.data.accessToken);
            } catch {}
          }
          const u = res?.data?.user;
          const authUser: AuthUser = {
            id: u?.id || '',
            name: u?.name || 'Administrator',
            email: u?.email || email,
            phone: u?.phoneNumber || undefined,
            role: (u?.role?.toUpperCase() === 'ADMIN' ? 'ADMIN' : u?.role || 'ADMIN') as UserRole,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          this.setUser(authUser);
          return { message: res.message || 'Login successful', user: authUser };
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
