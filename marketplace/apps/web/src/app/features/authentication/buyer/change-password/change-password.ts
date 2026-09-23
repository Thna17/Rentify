import { Component, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { apiErrorMessage, AuthService } from '../../../../core/auth/auth.service';
import { AuthLayout } from '../../../../components/shared/authentication/auth-layout/auth-layout';
import { IconComponent } from '../../../../components/shared/ui/icon/icon.component';

@Component({
  selector: 'app-change-password',
  imports: [ReactiveFormsModule, AuthLayout, IconComponent],
  templateUrl: './change-password.html',
})
export class ChangePassword {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly success = signal('');
  protected readonly currentPasswordVisible = signal(false);
  protected readonly newPasswordVisible = signal(false);
  protected readonly confirmPasswordVisible = signal(false);
  protected readonly form = new FormGroup({
    currentPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    newPassword: new FormControl('', {
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

  protected toggleCurrentPassword(): void {
    this.currentPasswordVisible.update((visible) => !visible);
  }

  protected toggleNewPassword(): void {
    this.newPasswordVisible.update((visible) => !visible);
  }

  protected toggleConfirmPassword(): void {
    this.confirmPasswordVisible.update((visible) => !visible);
  }

  protected submit() {
    const value = this.form.getRawValue();
    if (this.form.invalid || value.newPassword !== value.confirmPassword) {
      this.form.markAllAsTouched();
      if (value.newPassword !== value.confirmPassword) {
        this.error.set('Passwords do not match.');
      }
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.success.set('');
    this.auth
      .changePassword(
        value.currentPassword,
        value.newPassword,
        value.confirmPassword,
      )
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.form.reset();
          this.success.set('Your password has been changed.');
        },
        error: (error) => this.error.set(apiErrorMessage(error)),
      });
  }

  protected logout() {
    this.auth.logout().subscribe(() => void this.router.navigate(['/login']));
  }
}
