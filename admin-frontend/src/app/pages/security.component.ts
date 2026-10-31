import { Component, OnInit, inject, signal } from '@angular/core';
import { AuthService, apiErrorMessage } from '../core/auth/auth.service';
import { MfaStatusResponse } from '../core/auth/auth.models';
import { IconComponent } from '../ui/icon.component';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { TranslateService } from '../core/i18n/translate.service';

@Component({
  standalone: true,
  imports: [TranslatePipe, IconComponent],
  template: `
    <div class="page-head">
      <div>
        <p class="ops-eyebrow">{{ 'security.eyebrow' | translate }}</p>
        <h1 class="page-title">{{ 'security.title' | translate }}</h1>
        <p class="page-sub">{{ 'security.lead' | translate }}</p>
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
            <h2 style="font-size: 16px; margin: 0;">{{ 'security.totpTitle' | translate }}</h2>
            <p style="color: var(--muted); font-size: 12px; margin: 4px 0 0;">
              {{ 'security.totpLead' | translate }}
            </p>
          </div>
          <span class="ops-pill" [class.active]="mfaStatus()?.mfaEnabled" [class.needs_changes]="!mfaStatus()?.mfaEnabled">
            {{ mfaStatus()?.mfaEnabled ? 'Enabled & Active' : 'Not Configured' }}
          </span>
        </div>

        @if (!mfaStatus()?.mfaEnabled && !enrolling()) {
          <div style="padding: 16px; background: #fffcf5; border: 1px solid #fed7aa; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 0; font-size: 13px; color: #9a3412;">
              <strong>{{ 'security.actionRecommended' | translate }}</strong> {{ 'security.mfaRequired' | translate }}
            </p>
          </div>
          <button class="btn btn-primary" (click)="startEnrollment()" [disabled]="loading()">
            <kc-icon name="shield" [size]="15"></kc-icon>
            <span style="margin-left: 6px;">{{ 'security.enable2fa' | translate }}</span>
          </button>
        }

        @if (enrolling()) {
          <div style="padding: 18px; background: #f8fafc; border: 1px solid var(--line); border-radius: 8px;">
            <h3 style="margin: 0 0 10px; font-size: 14px;">1. Set Up Authenticator App</h3>
            <p style="color: var(--muted); font-size: 12px; margin-bottom: 12px;">
              {{ 'security.secretKeyHint' | translate }}
            </p>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px;">
              <code style="background: #e2e8f0; padding: 6px 12px; border-radius: 6px; font-weight: 700; letter-spacing: 0.1em;">
                {{ enrollSecret() }}
              </code>
              <a [href]="enrollOtpauth()" class="btn btn-default btn-sm" style="text-decoration: none;">
                {{ 'security.openInApp' | translate }}
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
                {{ 'security.verifyActivate' | translate }}
              </button>
            </div>
            <button class="btn btn-default btn-sm" style="margin-top: 12px;" (click)="cancelEnrollment()">
              {{ 'common.cancel' | translate }}
            </button>
          </div>
        }

        @if (mfaStatus()?.mfaEnabled) {
          <div style="margin-top: 14px;">
            <p style="font-size: 13px; color: #15803d; margin: 0 0 14px;">
              {{ 'security.protected' | translate }}
            </p>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button class="btn btn-default btn-sm" (click)="regenerateRecoveryCodes()" [disabled]="loading()">
                <kc-icon name="refresh" [size]="14"></kc-icon>
                <span style="margin-left: 6px;">{{ 'security.regenerateCodes' | translate }}</span>
              </button>
              <button class="btn btn-danger btn-sm" (click)="showDisableModal.set(true)" [disabled]="loading()">
                {{ 'security.disableMfa' | translate }}
              </button>
            </div>
          </div>
        }

        <!-- Recovery Codes Display -->
        @if (newRecoveryCodes().length > 0) {
          <div style="margin-top: 20px; padding: 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;">
            <h3 style="margin: 0 0 8px; font-size: 14px; color: #1e40af;">{{ 'security.recoveryCodesTitle' | translate }}</h3>
            <p style="font-size: 12px; color: #1e3a8a; margin: 0 0 12px;">
              {{ 'security.recoveryCodesHint' | translate }}
            </p>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-family: monospace; font-size: 13px; font-weight: 700;">
              @for (code of newRecoveryCodes(); track code) {
                <div style="background: #ffffff; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; text-align: center;">
                  {{ code }}
                </div>
              }
            </div>
            <button class="btn btn-default btn-sm" style="margin-top: 12px;" (click)="copyRecoveryCodes()">
              {{ 'security.copyAllCodes' | translate }}
            </button>
          </div>
        }
      </section>

      <!-- Step-Up Re-Authentication Section -->
      <section class="card" style="padding: 20px;">
        <h2 style="font-size: 16px; margin: 0 0 6px;">{{ 'security.stepUpTitle' | translate }}</h2>
        <p style="color: var(--muted); font-size: 12px; margin: 0 0 16px;">
          {{ 'security.stepUpLead' | translate }}
        </p>

        <form (submit)="stepUp($event)">
          <label class="ops-field">
            {{ 'security.adminPassword' | translate }}
            <input
              type="password"
              class="input"
              [placeholder]="'security.currentPasswordPlaceholder' | translate"
              [value]="stepUpPassword()"
              (input)="stepUpPassword.set($any($event.target).value)"
              required
            />
          </label>

          @if (mfaStatus()?.mfaEnabled) {
            <label class="ops-field" style="margin-top: 10px;">
              {{ 'security.codeOrRecovery' | translate }}
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
              {{ 'security.reauth' | translate }}
            </button>
          </div>
        </form>

        <!-- Secure Contact Change Form -->
        <hr style="border: 0; border-top: 1px solid var(--line); margin: 24px 0 20px;" />
        <h2 style="font-size: 16px; margin: 0 0 6px;">{{ 'security.contactChangeTitle' | translate }}</h2>
        <p style="color: var(--muted); font-size: 12px; margin: 0 0 14px;">
          {{ 'security.contactChangeLead' | translate }}
        </p>

        @if (!contactChangePending()) {
          <form (submit)="requestContactChange($event)">
            <label class="ops-field">
              {{ 'security.newEmail' | translate }}
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
                {{ 'security.sendCode' | translate }}
              </button>
            </div>
          </form>
        } @else {
          <form (submit)="verifyContactChange($event)" style="padding: 14px; background: #f8fafc; border-radius: 8px;">
            <p style="font-size: 12px; margin: 0 0 10px; color: var(--ink);">
              {{ 'security.enterCodeSentTo' | translate }} <strong>{{ newEmail() }}</strong>:
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
                {{ 'security.verifyUpdate' | translate }}
              </button>
            </div>
            <button type="button" class="btn btn-default btn-sm" style="margin-top: 10px;" (click)="contactChangePending.set(false)">
              {{ 'common.cancel' | translate }}
            </button>
          </form>
        }
      </section>
    </div>

    <!-- Disable MFA Modal -->
    @if (showDisableModal()) {
      <div class="modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 999;">
        <div class="card" style="width: 420px; padding: 24px; background: white; border-radius: 12px;">
          <h3 style="margin: 0 0 10px;">{{ 'security.disable2faTitle' | translate }}</h3>
          <p style="color: var(--muted); font-size: 12px; margin-bottom: 16px;">
            {{ 'security.disable2faLead' | translate }}
          </p>
          <label class="ops-field">
            {{ 'security.password' | translate }}
            <input type="password" class="input" [value]="disablePassword()" (input)="disablePassword.set($any($event.target).value)" [placeholder]="'security.passwordPlaceholder' | translate" />
          </label>
          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px;">
            <button class="btn btn-default btn-sm" (click)="showDisableModal.set(false)">{{ 'common.cancel' | translate }}</button>
            <button class="btn btn-danger btn-sm" [disabled]="!disablePassword() || loading()" (click)="disableMfa()">{{ 'security.confirmDisable' | translate }}</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class SecurityComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly translate = inject(TranslateService);

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
        this.successMessage.set(this.translate.t('security.ok.enabled'));
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
    if (!confirm(this.translate.t('security.confirmRegenerate'))) {
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth.regenerateRecoveryCodes().subscribe({
      next: (res) => {
        this.loading.set(false);
        this.newRecoveryCodes.set(res.recoveryCodes || []);
        this.successMessage.set(this.translate.t('security.ok.regenerated'));
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
        this.successMessage.set(this.translate.t('security.ok.disabled'));
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
    this.successMessage.set(this.translate.t('security.ok.copied'));
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
        this.successMessage.set(this.translate.t('security.ok.stepUp'));
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
        this.successMessage.set(this.translate.t('security.ok.codeSent'));
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
        this.successMessage.set(this.translate.t('security.ok.contactUpdated'));
        this.auth.refreshCurrentUser().subscribe();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err));
      },
    });
  }
}
