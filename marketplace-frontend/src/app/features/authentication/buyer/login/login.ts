import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { UserRole } from '../../../../core/auth/auth.models';
import { apiErrorMessage, AuthService } from '../../../../core/auth/auth.service';
import { AuthLayout } from '../../../../components/shared/authentication/auth-layout/auth-layout';
import { IconComponent } from '../../../../components/shared/ui/icon/icon.component';

type LoginRole = UserRole;

const ROLE_CONTENT: Record<
  LoginRole,
  {
    eyebrow: string;
    title: string;
    subtitle: string;
    emailLabel: string;
    emailPlaceholder: string;
    button: string;
    busy: string;
    fallbackError: string;
  }
> = {
  // One page for every kind of account, so the copy cannot promise "buyer":
  // a seller signing in here would be told their own credentials belong to
  // someone else's kind of account.
  BUYER: {
    eyebrow: 'KhmerCraft account',
    title: 'Welcome back',
    subtitle: 'One account for shopping and for selling — sign in to pick up where you left off.',
    emailLabel: 'Email address',
    emailPlaceholder: 'you@example.com',
    button: 'Sign in',
    busy: 'Signing in...',
    fallbackError: 'Email or password is incorrect.',
  },
  SELLER: {
    eyebrow: 'Seller portal',
    title: 'Sign in to your store',
    subtitle: 'Manage incoming orders, accept them, and track what you have shipped.',
    emailLabel: 'Seller email',
    emailPlaceholder: 'you@yourstore.com',
    button: 'Sign in to seller portal',
    busy: 'Signing in...',
    fallbackError: 'Seller credentials are incorrect.',
  },
  ADMIN: {
    eyebrow: 'Restricted access',
    title: 'Admin sign in',
    subtitle: 'Use your authorized KhmerCraft administrator credentials.',
    emailLabel: 'Admin email',
    emailPlaceholder: 'admin@khmercraft.com',
    button: 'Access admin portal',
    busy: 'Verifying...',
    fallbackError: 'Administrator credentials are incorrect.',
  },
};

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, AuthLayout, IconComponent],
  templateUrl: './login.html',
  styles: [
    `
    .required { color: var(--color-danger, #b92a2a); margin-left: 6px; }
    .input-icon-wrap { display: block; position: relative; width: 100%; }
    .input-icon-wrap > ui-icon { color: var(--color-muted); position: absolute; left: 16px; top: 50%; transform: translateY(-50%); pointer-events: none; z-index: 2; width: 20px; height: 20px; display: inline-grid; place-items: center; line-height: 0; }
    .input-icon-wrap > ui-icon svg { display: block; width: 18px; height: 18px; }
    .input-icon-wrap input { padding-left: 40px !important; box-sizing: border-box; display: block; width: 100%; }
    .password-field input { padding-right: 50px !important; }
    .password-field { position: relative; width: 100%; }
    .password-toggle {
      align-items: center;
      background: transparent;
      border: 0;
      border-radius: 50%;
      color: var(--color-muted);
      cursor: pointer;
      display: inline-flex;
      height: 36px;
      justify-content: center;
      padding: 0;
      position: absolute !important;
      right: 8px !important;
      top: 50% !important;
      transform: translateY(-50%) !important;
      width: 36px;
      z-index: 3;
    }
    .password-toggle:hover { background: var(--color-bg-alt); color: var(--color-text); }
    .password-toggle:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 1px; }
    .forgot-link { font-size: 12px; font-weight: 650 !important; justify-self: end; margin-top: 2px; }
    .auth-form:not(.submitted) label:has(input.ng-invalid) input { border-color: var(--color-border) !important; box-shadow: none !important; }
    `,
  ],
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly content = computed(() => ROLE_CONTENT['BUYER']);
  /**
   * Explains why someone who clicked "Start selling" is suddenly looking at a
   * sign-in form. Creating a store requires an account (see createStore in
   * sellers.service.ts), so the guard bounce is correct — but landing on a
   * bare login page with no reason given reads as the app losing their click.
   */
  protected readonly sellerIntent = signal(
    (this.route.snapshot?.queryParamMap.get('returnUrl') ?? '').startsWith('/seller'),
  );
  protected readonly passwordVisible = signal(false);
  protected readonly loading = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal('');
  protected readonly success = signal('');
  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  constructor() {}

  protected togglePassword(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  /**
   * Send the user where they were heading.
   *
   * Guards attach ?returnUrl when they bounce someone to sign in, so a visitor
   * who clicked Checkout lands back on checkout rather than being stranded on
   * the login page with a success message — which is what used to happen.
   *
   * With no returnUrl, the landing page follows the account's *actual* role:
   * dropping a seller on the buyer home page after they signed in is a dead
   * end, since nothing there links into their dashboard.
   */
  private goToDestination(role: LoginRole) {
    const returnUrl = this.route.snapshot?.queryParamMap.get('returnUrl');
    if (returnUrl?.startsWith('/')) {
      void this.router.navigateByUrl(returnUrl);
      return;
    }

    void this.router.navigateByUrl(role === 'SELLER' ? '/seller/dashboard' : '/');
  }

  protected submit() {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.success.set('');
    const content = this.content();
    const { email, password } = this.form.getRawValue();
    // Deliberately no expectedRole: this is the one sign-in page the whole
    // app links to, so it must accept buyers, sellers and admins alike. It
    // used to pin the request to BUYER, which made the server answer "Email
    // or password is incorrect" for every seller account with a correct
    // password. Where they land afterwards is decided below, from the role
    // the server actually returns.
    this.auth
      .login(email, password)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ user }) => {
          this.success.set(this.successMessage(user.name));
          this.goToDestination(user.role);
        },
        error: (error) => {
          if (error?.error?.error?.code === 'EMAIL_NOT_VERIFIED') {
            void this.router.navigate(['/verify-email'], { queryParams: {
              email,
              returnUrl: this.route.snapshot.queryParamMap.get('returnUrl') ?? '/',
            } });
            return;
          }
          this.error.set(apiErrorMessage(error, content.fallbackError));
        },
      });
  }
  private successMessage(name: string): string {
    return `Welcome back, ${name}.`;
  }
}
