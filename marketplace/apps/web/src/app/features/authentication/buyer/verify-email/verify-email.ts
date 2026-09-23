import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { apiErrorMessage, AuthService } from '../../../../core/auth/auth.service';
import { AuthLayout } from '../../../../components/shared/authentication/auth-layout/auth-layout';
import { IconComponent } from '../../../../components/shared/ui/icon/icon.component';

/**
 * The last step of registration: the account already exists but has no
 * session until this 6-digit code (emailed on submit — see auth.service.ts
 * on the API) is confirmed. Success logs the user straight in, same as
 * /login does.
 */
@Component({
  selector: 'app-verify-email',
  imports: [ReactiveFormsModule, RouterLink, AuthLayout, IconComponent],
  templateUrl: './verify-email.html',
  styles: [
    `
    .input-icon-wrap { display: block; position: relative; width: 100%; }
    .input-icon-wrap ui-icon { color: var(--color-muted); position: absolute; left: 16px; top: 50%; transform: translateY(-50%); pointer-events: none; z-index: 2; width: 20px; height: 20px; display: inline-grid; place-items: center; line-height: 0; }
    .input-icon-wrap ui-icon svg { display: block; width: 18px; height: 18px; }
    .input-icon-wrap input { padding-left: 40px !important; box-sizing: border-box; display: block; width: 100%; letter-spacing: 0.4em; font-variant-numeric: tabular-nums; text-align: center; }
    .required { color: var(--color-danger, #b92a2a); margin-left: 6px; }
    .resend-row { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 0.85rem; color: var(--color-muted, #8a8178); }
    .resend-row button { color: var(--red, #7b2a1b); font-weight: 700; background: none; border: none; padding: 0; cursor: pointer; }
    .resend-row button:disabled { color: var(--color-muted, #8a8178); cursor: default; }
    .resend-row button:hover:not(:disabled) { text-decoration: underline; text-underline-offset: 0.22rem; }
    `,
  ],
})
export class VerifyEmail {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly email = signal(
    this.route.snapshot.queryParamMap.get('email') ?? '',
  );
  protected readonly loading = signal(false);
  protected readonly resending = signal(false);
  protected readonly error = signal('');
  protected readonly resendMessage = signal('');

  protected readonly form = new FormGroup({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
    }),
  });

  protected submit() {
    if (!this.email() || this.form.invalid) {
      this.form.markAllAsTouched();
      if (!this.email()) {
        this.error.set('Missing email — go back and register again.');
      }
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.resendMessage.set('');
    this.auth
      .verifyEmail(this.email(), this.form.getRawValue().code)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          void this.router.navigateByUrl(
            returnUrl && returnUrl.startsWith('/') ? returnUrl : '/',
          );
        },
        error: (error) => this.error.set(apiErrorMessage(error)),
      });
  }

  protected resend() {
    if (!this.email() || this.resending()) {
      return;
    }
    this.resending.set(true);
    this.error.set('');
    this.resendMessage.set('');
    this.auth
      .resendCode(this.email())
      .pipe(finalize(() => this.resending.set(false)))
      .subscribe({
        next: () => this.resendMessage.set('If this email needs verification, a code has been sent. Check your inbox and spam folder. Already verified? Sign in.'),
        error: (error) => this.error.set(apiErrorMessage(error)),
      });
  }
}
