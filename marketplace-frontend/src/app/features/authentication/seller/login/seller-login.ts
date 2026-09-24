import { Component, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { apiErrorMessage, AuthService } from '../../../../core/auth/auth.service';
import { AuthLayout } from '../../../../components/shared/authentication/auth-layout/auth-layout';

/**
 * Seller sign-in.
 *
 * Sellers previously had nowhere to sign in: the seller guard sent them to
 * /admin/login, which requests expectedRole ADMIN and so rejected every seller
 * account before checking the password.
 *
 * TODO(seller-branch): sellers here are Users with role SELLER. If the Seller
 * collection on origin/prototype becomes the account of record, this form
 * needs to point at whatever endpoint authenticates those instead.
 */
@Component({
  selector: 'app-seller-login',
  imports: [ReactiveFormsModule, RouterLink, AuthLayout],
  template: `
    <app-auth-layout
      eyebrow="Seller portal"
      title="Sign in to your store"
      subtitle="Manage incoming orders, accept them, and track what you have shipped."
      variant="seller"
    >
      @if (success()) {
        <div class="notice success" role="status">{{ success() }}</div>
      }
      @if (error()) {
        <div class="notice error" role="alert">{{ error() }}</div>
      }

      <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <label>
          <span>Email address</span>
          <input
            type="email"
            formControlName="email"
            autocomplete="email"
            placeholder="you@yourstore.com"
          />
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <small>Enter a valid email address.</small>
          }
        </label>

        <label>
          <span>Password</span>
          <input
            type="password"
            formControlName="password"
            autocomplete="current-password"
            placeholder="Enter your password"
          />
        </label>

        <button
          class="primary-button admin-button"
          type="submit"
          [disabled]="loading()"
        >
          {{ loading() ? 'Signing in…' : 'Sign in to seller portal' }}
        </button>
      </form>

      <p class="auth-switch">
        Not selling yet?
        <a routerLink="/become-a-seller">Become a seller</a>
      </p>
      <a class="admin-link" routerLink="/login">Buyer sign in</a>
    </app-auth-layout>
  `,
})
export class SellerLogin {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(false);
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

  protected submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    const { email, password } = this.form.getRawValue();
    this.auth
      .login(email, password, 'SELLER')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ user }) => {
          this.success.set(`Signed in as ${user.name}.`);
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          void this.router.navigateByUrl(
            returnUrl && returnUrl.startsWith('/') ? returnUrl : '/seller/dashboard',
          );
        },
        error: (error) =>
          this.error.set(
            apiErrorMessage(error, 'Seller credentials are incorrect.'),
          ),
      });
  }
}
