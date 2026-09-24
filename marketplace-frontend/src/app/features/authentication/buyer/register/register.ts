import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { apiErrorMessage, AuthService } from '../../../../core/auth/auth.service';
import { AuthLayout } from '../../../../components/shared/authentication/auth-layout/auth-layout';
import { IconComponent } from '../../../../components/shared/ui/icon/icon.component';

/** Both password fields live under one control group so this can compare them. */
const passwordsMatch = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return password && confirmPassword && password !== confirmPassword
    ? { passwordMismatch: true }
    : null;
};

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, AuthLayout, IconComponent],
  templateUrl: './register.html',
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
    .auth-form:not(.submitted) label:has(input.ng-invalid) input { border-color: var(--color-border) !important; box-shadow: none !important; }

    /* First / last name side by side — collapses to one column on narrow screens
       so the inputs never get uncomfortably cramped. */
    .name-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.85rem;
    }
    @media (max-width: 480px) {
      .name-row { grid-template-columns: 1fr; }
    }

    /* Password and Confirm password are deliberately identical in every way
       (icon, width, spacing) — they're the same kind of field asked twice. */
    .password-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.85rem;
    }
    @media (max-width: 480px) {
      .password-row { grid-template-columns: 1fr; }
    }

    /* Informational, not an error — global .auth-form small is red by default. */
    .hint { color: var(--color-muted, #8a8178) !important; }
    `,
  ],
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal('');
  protected readonly passwordVisible = signal(false);
  protected readonly confirmVisible = signal(false);

  protected readonly form = new FormGroup({
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    lastName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    phone: new FormControl('', { nonNullable: true }),
    passwords: new FormGroup(
      {
        password: new FormControl('', {
          nonNullable: true,
          validators: [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/),
          ],
        }),
        confirmPassword: new FormControl('', {
          nonNullable: true,
          validators: [Validators.required],
        }),
      },
      { validators: passwordsMatch },
    ),
  });

  protected get passwords() {
    return this.form.controls.passwords;
  }

  protected togglePassword(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected toggleConfirm(): void {
    this.confirmVisible.update((visible) => !visible);
  }

  protected submit() {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');
    const value = this.form.getRawValue();
    const name = `${value.firstName.trim()} ${value.lastName.trim()}`.trim();

    this.auth
      .register({
        name,
        email: value.email,
        password: value.passwords.password,
        confirmPassword: value.passwords.confirmPassword,
        ...(value.phone ? { phone: value.phone } : {}),
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ email }) => {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          void this.router.navigate(['/verify-email'], {
            queryParams: {
              email,
              ...(returnUrl ? { returnUrl } : {}),
            },
          });
        },
        error: (error) => this.error.set(apiErrorMessage(error)),
      });
  }
}
