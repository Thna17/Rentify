import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { apiErrorMessage, AuthService } from '../../../../core/auth/auth.service';
import { AuthLayout } from '../../../../components/shared/authentication/auth-layout/auth-layout';
import { IconComponent } from '../../../../components/shared/ui/icon/icon.component';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, AuthLayout, IconComponent],
  templateUrl: './forgot-password.html',
  styles: [
    `
    .input-icon-wrap { display: block; position: relative; width: 100%; }
    .input-icon-wrap ui-icon { color: var(--color-muted); position: absolute; left: 16px; top: 50%; transform: translateY(-50%); pointer-events: none; z-index: 2; width: 20px; height: 20px; display: inline-grid; place-items: center; line-height: 0; }
    .input-icon-wrap ui-icon svg { display: block; width: 18px; height: 18px; }
    .input-icon-wrap input { padding-left: 40px !important; box-sizing: border-box; display: block; width: 100%; }
    .required { color: var(--color-danger, #b92a2a); margin-left: 6px; }
    `,
  ],
})
export class ForgotPassword {
  private readonly auth = inject(AuthService);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly sent = signal(false);
  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  protected submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth
      .forgotPassword(this.form.getRawValue().email)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.sent.set(true);
        },
        error: () => {
          // Keep the response deliberately non-enumerating: buyers see the
          // same confirmation whether or not the address exists.
          this.sent.set(true);
        },
      });
  }
}
