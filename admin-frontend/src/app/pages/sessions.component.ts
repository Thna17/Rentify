import { Component, OnInit, inject, signal } from '@angular/core';
import { AuthService, apiErrorMessage } from '../core/auth/auth.service';
import { SessionItem } from '../core/auth/auth.models';
import { IconComponent } from '../ui/icon.component';

@Component({
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="page-head" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
      <div>
        <p class="ops-eyebrow">SECURITY & SESSIONS</p>
        <h1 class="page-title">Active Administrator Sessions</h1>
        <p class="page-sub">Session inventory across browsers and devices. Never exposes raw tokens or cryptographic hashes.</p>
      </div>
      <button class="btn btn-danger btn-sm" [disabled]="loading() || sessions().length <= 1" (click)="revokeOtherSessions()">
        <kc-icon name="ban" [size]="14"></kc-icon>
        <span style="margin-left: 6px;">Revoke All Other Sessions</span>
      </button>
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

    <div class="card" style="margin-top: 18px; overflow: hidden;">
      <div class="ops-table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Device / Client</th>
              <th scope="col">IP Address</th>
              <th scope="col">Created</th>
              <th scope="col">Last Active</th>
              <th scope="col">MFA Verified</th>
              <th scope="col">Status</th>
              <th scope="col" style="text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            @if (loading() && sessions().length === 0) {
              <tr>
                <td colspan="7" class="ops-empty">Loading active sessions...</td>
              </tr>
            } @else if (sessions().length === 0) {
              <tr>
                <td colspan="7" class="ops-empty">No active sessions found.</td>
              </tr>
            } @else {
              @for (s of sessions(); track s.id) {
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <kc-icon name="monitor" [size]="16" style="color: var(--muted);"></kc-icon>
                      <div>
                        <strong>{{ s.clientType }}</strong>
                        @if (s.userAgent) {
                          <div style="font-size: 11px; color: var(--muted); max-width: 280px; overflow: hidden; text-overflow: ellipsis;">
                            {{ s.userAgent }}
                          </div>
                        }
                      </div>
                    </div>
                  </td>
                  <td><code>{{ s.ipAddress || '—' }}</code></td>
                  <td>{{ formatDate(s.createdAt) }}</td>
                  <td>{{ formatDate(s.lastActiveAt) }}</td>
                  <td>
                    <span class="ops-pill" [class.active]="s.mfaVerified" [class.dismissed]="!s.mfaVerified">
                      {{ s.mfaVerified ? 'MFA Passed' : 'Password Only' }}
                    </span>
                  </td>
                  <td>
                    @if (s.isCurrent) {
                      <span class="ops-pill active">Current Session</span>
                    } @else {
                      <span class="ops-pill" style="background: #f1f5f9; color: #475569;">Active</span>
                    }
                  </td>
                  <td style="text-align: right;">
                    @if (s.isCurrent) {
                      <button class="btn btn-default btn-sm" (click)="revoke(s.id, true)" [disabled]="loading()">
                        Sign out
                      </button>
                    } @else {
                      <button class="btn btn-danger btn-sm" (click)="revoke(s.id, false)" [disabled]="loading()">
                        Revoke
                      </button>
                    }
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class SessionsComponent implements OnInit {
  private readonly auth = inject(AuthService);

  readonly sessions = signal<SessionItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly successMessage = signal('');

  ngOnInit() {
    this.loadSessions();
  }

  loadSessions() {
    this.loading.set(true);
    this.error.set('');
    this.auth.listSessions().subscribe({
      next: (data) => {
        this.loading.set(false);
        this.sessions.set(data);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err));
      },
    });
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '—' : d.toLocaleString();
  }

  revoke(sessionId: string, isCurrent: boolean) {
    const promptText = isCurrent
      ? 'Sign out of your current session?'
      : 'Revoke this administrator session? The device will be disconnected immediately.';
    if (!confirm(promptText)) return;

    this.loading.set(true);
    this.error.set('');
    this.auth.revokeSession(sessionId).subscribe({
      next: () => {
        this.loading.set(false);
        if (isCurrent) {
          this.auth.logout().subscribe();
        } else {
          this.successMessage.set('Session revoked successfully.');
          this.loadSessions();
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err));
      },
    });
  }

  revokeOtherSessions() {
    if (!confirm('Revoke all other active sessions across other devices and browsers?')) return;

    this.loading.set(true);
    this.error.set('');
    this.auth.revokeOtherSessions().subscribe({
      next: (res) => {
        this.loading.set(false);
        this.successMessage.set(`Successfully revoked ${res.revokedCount || 0} other session(s).`);
        this.loadSessions();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err));
      },
    });
  }
}
