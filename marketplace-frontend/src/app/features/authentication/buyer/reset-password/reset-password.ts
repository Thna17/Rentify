import { Component, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { apiErrorMessage, AuthService } from '../../../../core/auth/auth.service';
import { AuthLayout } from '../../../../components/shared/authentication/auth-layout/auth-layout';
import { IconComponent } from '../../../../components/shared/ui/icon/icon.component';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, AuthLayout, IconComponent],
  templateUrl: './reset-password.html',
  styles: [
    `
    .input-icon-wrap { display: block; position: relative; width: 100%; }
    .input-icon-wrap ui-icon { color: var(--color-muted); position: absolute; left: 16px; top: 50%; transform: translateY(-50%); pointer-events: none; z-index: 2; width: 20px; height: 20px; display: inline-grid; place-items: center; line-height: 0; }
    .input-icon-wrap ui-icon svg { display: block; width: 18px; height: 18px; }
    .input-icon-wrap input { padding-left: 40px !important; box-sizing: border-box; display: block; width: 100%; }
    .password-field input { padding-right: 48px; }
    .required { color: var(--color-danger, #b92a2a); margin-left: 6px; }
    `,
  ],
})
export class ResetPassword {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  protected readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly complete = signal(false);
  protected readonly passwordVisible = signal(false);
  protected readonly confirmPasswordVisible = signal(false);
  protected readonly form = new FormGroup({
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
  });

  protected togglePassword(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected toggleConfirmPassword(): void {
    this.confirmPasswordVisible.update((visible) => !visible);
  }

  protected submit() {
    const value = this.form.getRawValue();
    if (
      this.form.invalid ||
      value.password !== value.confirmPassword ||
      !this.token
    ) {
      this.form.markAllAsTouched();
      if (value.password !== value.confirmPassword) {
        this.error.set('Passwords do not match.');
      }
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.auth
      .resetPassword(this.token, value.password, value.confirmPassword)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.complete.set(true),
        error: (error) => this.error.set(apiErrorMessage(error)),
      });
  }
}
