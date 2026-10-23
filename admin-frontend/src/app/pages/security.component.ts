import { Component, OnInit, inject, signal } from '@angular/core';
import { AuthService, apiErrorMessage } from '../core/auth/auth.service';
import { MfaStatusResponse } from '../core/auth/auth.models';
import { IconComponent } from '../ui/icon.component';

@Component({
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="page-head">
      <div>
        <p class="ops-eyebrow">SECURITY & ACCESS</p>
        <h1 class="page-title">Administrator Security & MFA</h1>
        <p class="page-sub">Production-grade two-factor authentication, single-use recovery codes, and contact verification.</p>
      </div>
    </div>

    @if (error()) {
      <div class="ops-alert" role="alert">
        <kc-icon name="alert" [size]="16"></kc-icon>
        <span>{{ error() }}</span>
      </div>
    }
    @if (successMessage()) {
      <div class="ops-success" role="status">
        <kc-icon name="check" [size]="16"></kc-icon>
        <span>{{ successMessage() }}</span>
      </div>
    }

    <div class="ops-panels" style="margin-top: 16px;">
      <!-- MFA Management Section -->
      <section class="card" style="padding: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div>
            <h2 style="font-size: 16px; margin: 0;">Two-Factor Authentication (TOTP)</h2>
            <p style="color: var(--muted); font-size: 12px; margin: 4px 0 0;">
              Protect your administrative account with standards-based RFC 6238 time-based one-time passwords.
            </p>
          </div>
          <span class="ops-pill" [class.active]="mfaStatus()?.mfaEnabled" [class.needs_changes]="!mfaStatus()?.mfaEnabled">
            {{ mfaStatus()?.mfaEnabled ? 'Enabled & Active' : 'Not Configured' }}
          </span>
        </div>

        @if (!mfaStatus()?.mfaEnabled && !enrolling()) {
          <div style="padding: 16px; background: #fffcf5; border: 1px solid #fed7aa; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 0; font-size: 13px; color: #9a3412;">
              <strong>Action Recommended:</strong> Administrator accounts require MFA for production operations. Enable TOTP with an authenticator app (e.g. Google Authenticator, 1Password, Authy).
            </p>
          </div>
          <button class="btn btn-primary" (click)="startEnrollment()" [disabled]="loading()">
            <kc-icon name="shield" [size]="15"></kc-icon>
            <span style="margin-left: 6px;">Enable Two-Factor Authentication</span>
          </button>
        }

        @if (enrolling()) {
          <div style="padding: 18px; background: #f8fafc; border: 1px solid var(--line); border-radius: 8px;">
            <h3 style="margin: 0 0 10px; font-size: 14px;">1. Set Up Authenticator App</h3>
            <p style="color: var(--muted); font-size: 12px; margin-bottom: 12px;">
              Enter this secret key in your authenticator app, or click the link to open an authenticator client:
            </p>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px;">
              <code style="background: #e2e8f0; padding: 6px 12px; border-radius: 6px; font-weight: 700; letter-spacing: 0.1em;">
                {{ enrollSecret() }}
              </code>
              <a [href]="enrollOtpauth()" class="btn btn-default btn-sm" style="text-decoration: none;">
                Open in App
              </a>
            </div>

            <h3 style="margin: 14px 0 8px; font-size: 14px;">2. Enter 6-Digit Code</h3>
            <div style="display: flex; gap: 8px; max-width: 320px;">
              <input
                type="text"
                class="input"
                maxlength="6"
                placeholder="000000"
                style="font-size: 18px; letter-spacing: 0.2em; text-align: center;"
                [value]="confirmCode()"
                (input)="confirmCode.set($any($event.target).value)"
                aria-label="6-digit TOTP verification code"
              />
              <button class="btn btn-primary" [disabled]="confirmCode().length !== 6 || loading()" (click)="confirmMfa()">
                Verify & Activate
              </button>
            </div>
            <button class="btn btn-default btn-sm" style="margin-top: 12px;" (click)="cancelEnrollment()">
              Cancel
            </button>
          </div>
        }

        @if (mfaStatus()?.mfaEnabled) {
          <div style="margin-top: 14px;">
            <p style="font-size: 13px; color: #15803d; margin: 0 0 14px;">
              Your administrator account is protected with TOTP two-factor authentication.
            </p>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button class="btn btn-default btn-sm" (click)="regenerateRecoveryCodes()" [disabled]="loading()">
                <kc-icon name="refresh" [size]="14"></kc-icon>
                <span style="margin-left: 6px;">Regenerate Recovery Codes</span>
              </button>
              <button class="btn btn-danger btn-sm" (click)="showDisableModal.set(true)" [disabled]="loading()">
                Disable MFA
              </button>
            </div>
          </div>
        }

        <!-- Recovery Codes Display -->
        @if (newRecoveryCodes().length > 0) {
          <div style="margin-top: 20px; padding: 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;">
            <h3 style="margin: 0 0 8px; font-size: 14px; color: #1e40af;">Single-Use Recovery Codes</h3>
            <p style="font-size: 12px; color: #1e3a8a; margin: 0 0 12px;">
              Save these recovery codes in a secure password manager now. Each code can be used once if you lose access to your authenticator device.
            </p>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-family: monospace; font-size: 13px; font-weight: 700;">
              @for (code of newRecoveryCodes(); track code) {
                <div style="background: #ffffff; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; text-align: center;">
                  {{ code }}
                </div>
              }
            </div>
            <button class="btn btn-default btn-sm" style="margin-top: 12px;" (click)="copyRecoveryCodes()">
              Copy All Codes
            </button>
          </div>
        }
      </section>

      <!-- Step-Up Re-Authentication Section -->
      <section class="card" style="padding: 20px;">
        <h2 style="font-size: 16px; margin: 0 0 6px;">Step-Up Authentication</h2>
        <p style="color: var(--muted); font-size: 12px; margin: 0 0 16px;">
          High-risk operations (seller approvals, store suspensions, security modifications) require authentication within the last 15 minutes.
        </p>

        <form (submit)="stepUp($event)">
          <label class="ops-field">
            Admin Password
            <input
              type="password"
              class="input"
              placeholder="Enter your current password"
              [value]="stepUpPassword()"
              (input)="stepUpPassword.set($any($event.target).value)"
              required
            />
          </label>

          @if (mfaStatus()?.mfaEnabled) {
            <label class="ops-field" style="margin-top: 10px;">
              Authenticator Code or Recovery Code
              <input
                type="text"
                class="input"
                placeholder="6-digit TOTP or recovery code"
                [value]="stepUpMfaCode()"
                (input)="stepUpMfaCode.set($any($event.target).value)"
              />
            </label>
          }

          <div style="margin-top: 16px;">
            <button type="submit" class="btn btn-primary btn-sm" [disabled]="!stepUpPassword() || loading()">
              Re-authenticate (Step-Up)
            </button>
          </div>
        </form>

        <!-- Secure Contact Change Form -->
        <hr style="border: 0; border-top: 1px solid var(--line); margin: 24px 0 20px;" />
        <h2 style="font-size: 16px; margin: 0 0 6px;">Secure Contact Change</h2>
        <p style="color: var(--muted); font-size: 12px; margin: 0 0 14px;">
          Changing your administrator email requires verification of the new address.
        </p>

        @if (!contactChangePending()) {
          <form (submit)="requestContactChange($event)">
            <label class="ops-field">
              New Administrator Email
              <input
                type="email"
                class="input"
                placeholder="new.admin@example.com"
                [value]="newEmail()"
                (input)="newEmail.set($any($event.target).value)"
                required
              />
            </label>
            <div style="margin-top: 14px;">
              <button type="submit" class="btn btn-default btn-sm" [disabled]="!newEmail() || loading()">
                Send Verification Code
              </button>
            </div>
          </form>
        } @else {
          <form (submit)="verifyContactChange($event)" style="padding: 14px; background: #f8fafc; border-radius: 8px;">
            <p style="font-size: 12px; margin: 0 0 10px; color: var(--ink);">
              Enter the 6-digit code sent to <strong>{{ newEmail() }}</strong>:
            </p>
            <div style="display: flex; gap: 8px;">
              <input
                type="text"
                class="input"
                maxlength="6"
                placeholder="123456"
                style="text-align: center; letter-spacing: 0.15em;"
                [value]="contactOtp()"
                (input)="contactOtp.set($any($event.target).value)"
                required
              />
              <button type="submit" class="btn btn-primary btn-sm" [disabled]="!contactOtp() || loading()">
                Verify & Update
              </button>
            </div>
            <button type="button" class="btn btn-default btn-sm" style="margin-top: 10px;" (click)="contactChangePending.set(false)">
              Cancel
            </button>
          </form>
        }
      </section>
    </div>

    <!-- Disable MFA Modal -->
    @if (showDisableModal()) {
      <div class="modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 999;">
        <div class="card" style="width: 420px; padding: 24px; background: white; border-radius: 12px;">
          <h3 style="margin: 0 0 10px;">Disable Two-Factor Authentication</h3>
          <p style="color: var(--muted); font-size: 12px; margin-bottom: 16px;">
            Confirm your administrator password to disable two-factor authentication.
          </p>
          <label class="ops-field">
            Password
            <input type="password" class="input" [value]="disablePassword()" (input)="disablePassword.set($any($event.target).value)" placeholder="Enter password" />
          </label>
          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px;">
            <button class="btn btn-default btn-sm" (click)="showDisableModal.set(false)">Cancel</button>
            <button class="btn btn-danger btn-sm" [disabled]="!disablePassword() || loading()" (click)="disableMfa()">Confirm Disable</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class SecurityComponent implements OnInit {
  private readonly auth = inject(AuthService);

  readonly mfaStatus = signal<MfaStatusResponse | null>(null);
  readonly enrolling = signal(false);
  readonly enrollSecret = signal('');
  readonly enrollOtpauth = signal('');
  readonly confirmCode = signal('');
  readonly newRecoveryCodes = signal<string[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly successMessage = signal('');

  readonly stepUpPassword = signal('');
  readonly stepUpMfaCode = signal('');

  readonly newEmail = signal('');
  readonly contactOtp = signal('');
  readonly contactChangePending = signal(false);

  readonly showDisableModal = signal(false);
  readonly disablePassword = signal('');

  ngOnInit() {
    this.loadMfaStatus();
  }

  loadMfaStatus() {
    this.auth.getMfaStatus().subscribe({
      next: (res) => this.mfaStatus.set(res),
      error: (err) => this.error.set(apiErrorMessage(err)),
    });
  }

  startEnrollment() {
    this.loading.set(true);
    this.error.set('');
    this.auth.enrollMfa().subscribe({
      next: (res) => {
        this.loading.set(false);
        this.enrollSecret.set(res.secret);
        this.enrollOtpauth.set(res.otpauthUrl);
        this.enrolling.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err));
      },
    });
  }

  confirmMfa() {
    this.loading.set(true);
    this.error.set('');
    this.auth.confirmMfa(this.confirmCode()).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.enrolling.set(false);
        this.confirmCode.set('');
        this.newRecoveryCodes.set(res.recoveryCodes || []);
        this.successMessage.set('Two-factor authentication successfully enabled!');
        this.loadMfaStatus();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err));
      },
    });
  }

  cancelEnrollment() {
    this.enrolling.set(false);
    this.confirmCode.set('');
    this.enrollSecret.set('');
  }

  regenerateRecoveryCodes() {
    if (!confirm('Are you sure you want to regenerate recovery codes? All previous codes will be invalidated.')) {
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth.regenerateRecoveryCodes().subscribe({
      next: (res) => {
        this.loading.set(false);
        this.newRecoveryCodes.set(res.recoveryCodes || []);
        this.successMessage.set('New recovery codes generated. Store them safely.');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err));
      },
    });
  }

  disableMfa() {
    this.loading.set(true);
    this.error.set('');
    this.auth.disableMfa(this.disablePassword()).subscribe({
      next: () => {
        this.loading.set(false);
        this.showDisableModal.set(false);
        this.disablePassword.set('');
        this.successMessage.set('Two-factor authentication disabled.');
        this.newRecoveryCodes.set([]);
        this.loadMfaStatus();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err));
      },
    });
  }

  copyRecoveryCodes() {
    const text = this.newRecoveryCodes().join('\n');
    navigator.clipboard?.writeText(text);
    this.successMessage.set('Recovery codes copied to clipboard.');
  }

  stepUp(event: Event) {
    event.preventDefault();
    this.loading.set(true);
    this.error.set('');
    this.auth.stepUpAuth(this.stepUpPassword(), this.stepUpMfaCode()).subscribe({
      next: () => {
        this.loading.set(false);
        this.stepUpPassword.set('');
        this.stepUpMfaCode.set('');
        this.successMessage.set('Step-up authentication successful! Recent-auth window refreshed.');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err));
      },
    });
  }

  requestContactChange(event: Event) {
    event.preventDefault();
    this.loading.set(true);
    this.error.set('');
    this.auth.requestContactChange(this.newEmail()).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.contactChangePending.set(true);
        this.successMessage.set(res.message || 'Verification code sent to new email.');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err));
      },
    });
  }

  verifyContactChange(event: Event) {
    event.preventDefault();
    this.loading.set(true);
    this.error.set('');
    this.auth.verifyContactChange(this.contactOtp()).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.contactChangePending.set(false);
        this.contactOtp.set('');
        this.newEmail.set('');
        this.successMessage.set(res.message || 'Contact details updated successfully.');
        this.auth.refreshCurrentUser().subscribe();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err));
      },
    });
  }
}
