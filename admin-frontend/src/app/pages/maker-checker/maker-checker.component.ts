import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupportOperationsService } from '../../services/support-operations.service';
import { MakerCheckerItem, MakerCheckerStatus } from '../../core/support/support-operations.models';
import { AuthService } from '../../core/auth/auth.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslateService } from '../../core/i18n/translate.service';
import { IconComponent } from '../../ui/icon.component';
import { ConfirmComponent } from '../../ui/confirm.component';

@Component({
  selector: 'kc-maker-checker',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, TranslatePipe, IconComponent, ConfirmComponent],
  template: `
    <div class="maker-checker-page">
      <!-- Header -->
      <div class="page-head">
        <div>
          <h1 class="page-title">{{ 'makerChecker.title' | translate }}</h1>
          <p class="page-sub">{{ 'makerChecker.subtitle' | translate }}</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-default btn-sm" (click)="loadItems()" [disabled]="loading()">
            <kc-icon name="refresh" [size]="14"></kc-icon>
            {{ 'common.refresh' | translate }}
          </button>
        </div>
      </div>

      <!-- Feedback notifications -->
      @if (successMessage()) {
        <div class="ops-success" role="status" aria-live="polite">
          {{ successMessage() }}
        </div>
      }
      @if (errorMessage()) {
        <div class="ops-alert" role="alert">
          {{ errorMessage() }}
        </div>
      }

      <!-- Queue Tabs -->
      <div class="ops-queue-tabs" role="tablist">
        <button
          class="ops-queue-tab"
          [class.active]="activeQueue() === 'pending_approval'"
          role="tab"
          [attr.aria-selected]="activeQueue() === 'pending_approval'"
          (click)="setQueue('pending_approval')"
        >
          {{ 'makerChecker.queuePending' | translate }}
          @if (pendingCount() > 0) {
            <span class="badge badge-warning">{{ pendingCount() }}</span>
          }
        </button>
        <button
          class="ops-queue-tab"
          [class.active]="activeQueue() === 'approved'"
          role="tab"
          [attr.aria-selected]="activeQueue() === 'approved'"
          (click)="setQueue('approved')"
        >
          {{ 'makerChecker.queueApproved' | translate }}
        </button>
        <button
          class="ops-queue-tab"
          [class.active]="activeQueue() === 'rejected'"
          role="tab"
          [attr.aria-selected]="activeQueue() === 'rejected'"
          (click)="setQueue('rejected')"
        >
          {{ 'makerChecker.queueRejected' | translate }}
        </button>
      </div>

      <!-- Content -->
      @if (loading()) {
        <div class="loading-state" aria-busy="true">
          <div class="spinner"></div>
          <p>{{ 'common.loading' | translate }}</p>
        </div>
      } @else if (items().length === 0) {
        <div class="ops-empty">
          <kc-icon name="check" [size]="32" class="empty-icon"></kc-icon>
          <p>{{ 'common.noData' | translate }}</p>
        </div>
      } @else {
        <div class="card table-card">
          <div class="ops-table-scroll">
            <table class="table" [attr.aria-label]="'makerChecker.tasks' | translate">
              <thead>
                <tr>
                  <th scope="col">{{ 'makerChecker.actionType' | translate }}</th>
                  <th scope="col">{{ 'makerChecker.target' | translate }}</th>
                  <th scope="col">{{ 'makerChecker.initiatedBy' | translate }}</th>
                  <th scope="col">{{ 'makerChecker.reason' | translate }}</th>
                  <th scope="col">{{ 'common.status' | translate }}</th>
                  <th scope="col" style="text-align: right;">{{ 'common.actions' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (item of items(); track item.id) {
                  <tr [class.highlight]="item.status === 'pending_approval'">
                    <td>
                      <span class="ops-pill" [ngClass]="getActionPillClass(item.actionType)">
                        {{ formatActionType(item.actionType) }}
                      </span>
                    </td>
                    <td>
                      <strong>{{ item.targetResource }}</strong>
                      <div class="cell-sub font-mono">ID: {{ item.targetId }}</div>
                    </td>
                    <td>
                      <div><b>{{ item.initiatedBy.name }}</b></div>
                      <div class="cell-sub">{{ item.initiatedBy.role }} · {{ item.createdAt | date:'short' }}</div>
                    </td>
                    <td>
                      <div class="reason-preview" [title]="item.reason">{{ item.reason }}</div>
                      @if (item.decisionReason) {
                        <div class="decision-reason">
                          <small><strong>{{ 'makerChecker.checkerNote' | translate }}</strong> {{ item.decisionReason }}</small>
                        </div>
                      }
                    </td>
                    <td>
                      <span class="ops-pill" [class.pending]="item.status === 'pending_approval'"
                            [class.approved]="item.status === 'approved'"
                            [class.rejected]="item.status === 'rejected'">
                        {{ item.status }}
                      </span>
                      @if (item.approvedBy) {
                        <div class="cell-sub">{{ item.approvedBy.name }} ({{ item.approvedAt | date:'short' }})</div>
                      }
                    </td>
                    <td style="text-align: right;">
                      @if (item.status === 'pending_approval') {
                        @if (isInitiator(item)) {
                          <span class="maker-warning" [title]="'makerChecker.cannotApproveOwn' | translate">
                            <kc-icon name="alert" [size]="14"></kc-icon>
                            {{ 'makerChecker.cannotApproveOwn' | translate }}
                          </span>
                        } @else if (!canApprove()) {
                          <span class="cell-sub">
                            {{ 'common.denied' | translate }} (maker_checker:approve)
                          </span>
                        } @else {
                          <div class="action-btn-group">
                            <button
                              class="btn btn-sm btn-primary"
                              (click)="promptApprove(item)"
                              [disabled]="submitting()"
                            >
                              {{ 'makerChecker.approveBtn' | translate }}
                            </button>
                            <button
                              class="btn btn-sm btn-danger"
                              (click)="promptReject(item)"
                              [disabled]="submitting()"
                            >
                              {{ 'makerChecker.rejectBtn' | translate }}
                            </button>
                          </div>
                        }
                      } @else {
                        <span class="cell-sub">{{ 'common.completed' | translate }}</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Rejection Modal -->
      @if (rejectingItem(); as item) {
        <div class="modal-back" (click)="cancelReject()">
          <div class="modal" (click)="$event.stopPropagation()" role="dialog" aria-labelledby="reject-title">
            <h3 id="reject-title">{{ 'makerChecker.rejectBtn' | translate }}</h3>
            <p>{{ item.targetResource }} ({{ item.actionType }})</p>
            
            <div class="form-group">
              <label for="reject-reason">{{ 'makerChecker.reason' | translate }} *</label>
              <textarea
                id="reject-reason"
                class="form-control"
                rows="3"
                [(ngModel)]="rejectionReasonText"
                [placeholder]="'makerChecker.declinePlaceholder' | translate"
              ></textarea>
            </div>

            <div class="modal-actions">
              <button class="btn" (click)="cancelReject()">{{ 'common.cancel' | translate }}</button>
              <button
                class="btn btn-danger"
                (click)="submitReject()"
                [disabled]="rejectionReasonText.trim().length < 5 || submitting()"
              >
                {{ 'makerChecker.rejectBtn' | translate }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Approval Confirmation Modal -->
      @if (approvingItem(); as item) {
        <kc-confirm
          [title]="'makerChecker.confirmVerification' | translate"
          [message]="'You are about to authorize execution of ' + formatActionType(item.actionType) + ' for ' + item.targetResource + '. This operation will be executed immediately with your identity recorded as the secondary checker.'"
          confirmLabel="Authorize & Execute"
          (confirm)="submitApprove()"
          (cancel)="cancelApprove()"
        ></kc-confirm>
      }
    </div>
  `,
  styles: [`
    .maker-checker-page {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .page-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      gap: 16px;
    }
    .page-title {
      font-size: 20px;
      font-weight: 700;
      margin: 0;
      color: var(--ink);
    }
    .page-sub {
      margin: 4px 0 0;
      color: var(--muted);
      font-size: 13px;
    }
    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 700;
      margin-left: 6px;
    }
    .badge-warning {
      background: #fef3c7;
      color: #92400e;
    }
    .table-card {
      margin-top: 16px;
      background: #fff;
      border: 1px solid var(--line);
      border-radius: 10px;
      overflow: hidden;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .table th {
      background: #f8fafc;
      padding: 12px 16px;
      font-weight: 600;
      color: var(--muted);
      border-bottom: 1px solid var(--line);
      text-align: left;
    }
    .table td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--line);
      vertical-align: middle;
    }
    .highlight {
      background: #fafcff;
    }
    .reason-preview {
      max-width: 380px;
      line-height: 1.4;
      color: #334155;
    }
    .decision-reason {
      margin-top: 6px;
      padding: 6px 10px;
      background: #f1f5f9;
      border-radius: 6px;
      font-size: 12px;
    }
    .maker-warning {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 10px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 6px;
      color: #92400e;
      font-size: 11.5px;
      font-weight: 600;
    }
    .action-btn-group {
      display: inline-flex;
      gap: 8px;
    }
    .btn-danger {
      background: #dc2626;
      color: #fff;
      border: 1px solid #dc2626;
    }
    .btn-danger:hover {
      background: #b91c1c;
    }
    .loading-state {
      padding: 48px;
      text-align: center;
      color: var(--muted);
    }
    .spinner {
      width: 28px;
      height: 28px;
      border: 3px solid #e2e8f0;
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 12px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .font-mono {
      font-family: monospace;
      font-size: 11.5px;
    }
    .form-group {
      margin: 16px 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-control {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--line-2);
      border-radius: 6px;
      font-family: inherit;
      font-size: 13px;
      box-sizing: border-box;
    }
  `]
})
export class MakerCheckerComponent implements OnInit {
  private readonly opsService = inject(SupportOperationsService);
  private readonly auth = inject(AuthService);
  private readonly translate = inject(TranslateService);

  readonly activeQueue = signal<MakerCheckerStatus>('pending_approval');
  readonly items = signal<MakerCheckerItem[]>([]);
  readonly pendingCount = signal<number>(0);
  readonly loading = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly approvingItem = signal<MakerCheckerItem | null>(null);
  readonly rejectingItem = signal<MakerCheckerItem | null>(null);
  rejectionReasonText = '';

  readonly currentUser = computed(() => this.auth.user());
  readonly canApprove = computed(() => this.auth.canApproveMakerChecker());

  ngOnInit(): void {
    this.loadItems();
    this.refreshPendingCount();
  }

  setQueue(queue: MakerCheckerStatus): void {
    this.activeQueue.set(queue);
    this.loadItems();
  }

  loadItems(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.opsService.listMakerCheckerItems(this.activeQueue()).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Failed to load maker-checker tasks');
        this.loading.set(false);
      },
    });
  }

  refreshPendingCount(): void {
    this.opsService.listMakerCheckerItems('pending_approval').subscribe({
      next: (res) => this.pendingCount.set(res.total),
      error: () => {},
    });
  }

  isInitiator(item: MakerCheckerItem): boolean {
    const currentUserId = this.currentUser()?.id;
    return Boolean(currentUserId && item.initiatedBy.id === currentUserId);
  }

  formatActionType(type: string): string {
    switch (type) {
      case 'bulk_takedown': return 'Bulk Listing Takedown';
      case 'store_suspension': return 'Store Account Suspension';
      case 'direct_chargeback': return 'Direct Payment Chargeback';
      case 'high_value_refund': return 'High-Value COD Refund';
      default: return type.replace(/_/g, ' ');
    }
  }

  getActionPillClass(type: string): string {
    switch (type) {
      case 'bulk_takedown':
      case 'store_suspension':
        return 'rejected';
      case 'direct_chargeback':
      case 'high_value_refund':
        return 'investigating';
      default:
        return 'pending';
    }
  }

  promptApprove(item: MakerCheckerItem): void {
    if (this.isInitiator(item)) {
      this.errorMessage.set(this.translate.instant('makerChecker.cannotApproveOwn'));
      return;
    }
    this.approvingItem.set(item);
  }

  cancelApprove(): void {
    this.approvingItem.set(null);
  }

  submitApprove(): void {
    const item = this.approvingItem();
    if (!item) return;

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.opsService.approveMakerChecker(item.id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.approvingItem.set(null);
        this.successMessage.set(`Operation "${item.targetResource}" approved and scheduled for execution.`);
        this.loadItems();
        this.refreshPendingCount();
        setTimeout(() => this.successMessage.set(null), 5000);
      },
      error: (err) => {
        this.submitting.set(false);
        this.approvingItem.set(null);
        this.errorMessage.set(err.message || 'Failed to approve operation');
      },
    });
  }

  promptReject(item: MakerCheckerItem): void {
    this.rejectingItem.set(item);
    this.rejectionReasonText = '';
  }

  cancelReject(): void {
    this.rejectingItem.set(null);
    this.rejectionReasonText = '';
  }

  submitReject(): void {
    const item = this.rejectingItem();
    if (!item || this.rejectionReasonText.trim().length < 5) return;

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.opsService.rejectMakerChecker(item.id, this.rejectionReasonText.trim()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.rejectingItem.set(null);
        this.rejectionReasonText = '';
        this.successMessage.set(`Operation declined and returned to maker.`);
        this.loadItems();
        this.refreshPendingCount();
        setTimeout(() => this.successMessage.set(null), 5000);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err.message || 'Failed to decline operation');
      },
    });
  }
}
