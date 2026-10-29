// marketplace-frontend/src/app/components/shared/reports/buyer-report-modal.component.ts
// P5-SUP-001: Accessible, bilingual buyer report and dispute intake modal.
// Server-side eligibility check, safe evidence upload, duplicate prevention,
// and Core SupportCase linkage visibility.

import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { RentifyMarketplaceService } from '../../../core/rentify/rentify-marketplace.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslateService } from '../../../core/i18n/translate.service';
import {
  BuyerReportResult,
  EvidenceItem,
  EvidenceLabel,
  ReportCategory,
  ReportEligibility,
  ReportSubjectType,
} from '../../../core/support/support.models';
import { IconComponent } from '../ui/icon/icon.component';

@Component({
  selector: 'buyer-report-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, IconComponent],
  template: `
    <div
      class="modal-backdrop animate-fade-in"
      (click)="onBackdropClick($event)"
      role="presentation"
    >
      <div
        #modalContainer
        class="modal-card animate-scale"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        aria-describedby="report-modal-desc"
        tabindex="-1"
      >
        <!-- Modal Header -->
        <header class="modal-header">
          <div class="header-titles">
            <h2 id="report-modal-title" class="modal-title">
              {{ 'reportModal.title' | translate }}
            </h2>
            <div class="subject-badge">
              <span class="badge badge-sub">{{ getSubjectTypeLabel() }}</span>
              <span class="subject-name">{{ subjectTitle || subjectId }}</span>
            </div>
          </div>
          <button
            type="button"
            class="close-button"
            (click)="closeModal()"
            [attr.aria-label]="'reportModal.cancel' | translate"
          >
            ✕
          </button>
        </header>

        <!-- Modal Body -->
        <div class="modal-body" id="report-modal-desc">
          <!-- 1. Loading Eligibility State -->
          @if (loadingEligibility()) {
            <div class="state-container loading-state" aria-busy="true" aria-live="polite">
              <div class="spinner" role="status"></div>
              <p class="state-text">{{ 'reportModal.checkingEligibility' | translate }}</p>
            </div>
          }

          <!-- 2. Conflict State: Existing Report Already Active -->
          @else if (eligibility()?.existingReport; as existing) {
            <div class="state-container conflict-state" role="alert">
              <div class="state-icon conflict-icon">
                <ui-icon name="alert-circle" [size]="32" />
              </div>
              <h3 class="state-title">{{ 'reportModal.existingReportTitle' | translate }}</h3>
              <p class="state-desc">
                {{
                  'reportModal.existingReportDesc'
                    | translate: { reportNumber: existing.reportNumber, subject: getSubjectTypeLabel() }
                }}
              </p>
              <div class="reference-card">
                <div class="ref-row">
                  <span class="ref-label">{{ 'reportModal.reportNumberLabel' | translate }}:</span>
                  <strong class="ref-value">{{ existing.reportNumber }}</strong>
                </div>
                @if (existing.coreCaseNumber) {
                  <div class="ref-row">
                    <span class="ref-label">{{ 'reportModal.caseNumberLabel' | translate }}:</span>
                    <strong class="ref-value text-accent">{{ existing.coreCaseNumber }}</strong>
                  </div>
                }
                <div class="ref-row">
                  <span class="badge" [ngClass]="existing.linkageStatus === 'linked' ? 'badge-success' : 'badge-warning'">
                    {{ existing.linkageStatus === 'linked' ? ('reportModal.caseLinkedBadge' | translate) : ('reportModal.casePendingBadge' | translate) }}
                  </span>
                </div>
              </div>
              <button type="button" class="btn btn-primary" (click)="closeModal()">
                {{ 'reportModal.done' | translate }}
              </button>
            </div>
          }

          <!-- 3. Ineligible / Denied State -->
          @else if (!eligibility()?.eligible) {
            <div class="state-container denied-state" role="alert">
              <div class="state-icon denied-icon">
                <ui-icon name="alert-circle" [size]="32" />
              </div>
              <h3 class="state-title">{{ 'reportModal.ineligibleTitle' | translate }}</h3>
              <p class="state-desc">{{ eligibility()?.guidance }}</p>
              @if (eligibility()?.deadline; as dl) {
                <p class="state-sub">
                  {{ 'reportModal.deadlineNotice' | translate: { deadline: (dl | date: 'medium') || '' } }}
                </p>
              }
              <button type="button" class="btn btn-secondary" (click)="closeModal()">
                {{ 'reportModal.cancel' | translate }}
              </button>
            </div>
          }

          <!-- 4. Success / Case Linked State -->
          @else if (submitResult(); as res) {
            <div class="state-container success-state" role="status" aria-live="polite">
              <div class="state-icon success-icon">
                <ui-icon name="check-circle" [size]="40" />
              </div>
              <h3 class="state-title">{{ 'reportModal.successTitle' | translate }}</h3>
              <p class="state-desc">{{ 'reportModal.successDesc' | translate }}</p>

              <div class="reference-card success-card">
                <div class="ref-row">
                  <span class="ref-label">{{ 'reportModal.reportNumberLabel' | translate }}:</span>
                  <strong class="ref-value">{{ res.reportNumber }}</strong>
                </div>
                @if (res.coreCaseNumber) {
                  <div class="ref-row">
                    <span class="ref-label">{{ 'reportModal.caseNumberLabel' | translate }}:</span>
                    <strong class="ref-value case-code">{{ res.coreCaseNumber }}</strong>
                  </div>
                }
                <div class="ref-row">
                  <span class="badge" [ngClass]="res.linkageStatus === 'linked' ? 'badge-success' : 'badge-warning'">
                    {{ res.linkageStatus === 'linked' ? ('reportModal.caseLinkedBadge' | translate) : ('reportModal.casePendingBadge' | translate) }}
                  </span>
                </div>
              </div>

              <button type="button" class="btn btn-primary" (click)="closeModal()">
                {{ 'reportModal.done' | translate }}
              </button>
            </div>
          }

          <!-- 5. Active Report Filing Form -->
          @else {
            <!-- Policy SLA Information Banner -->
            <div class="policy-banner" role="note">
              <ui-icon name="info" [size]="16" class="banner-icon" />
              <div class="banner-content">
                @if (eligibility()?.deadline; as dl) {
                  <p class="deadline-text">
                    {{ 'reportModal.deadlineNotice' | translate: { deadline: (dl | date: 'mediumDate') || '' } }}
                  </p>
                }
                <p class="sla-text">{{ 'reportModal.tier1Notice' | translate }}</p>
              </div>
            </div>

            <!-- Report Submission Form -->
            <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
              <!-- Category Selector -->
              <div class="form-group">
                <label for="report-category" class="form-label">
                  {{ 'reportModal.categoryLabel' | translate }} *
                </label>
                <select
                  id="report-category"
                  formControlName="category"
                  class="form-control"
                  [attr.aria-invalid]="form.get('category')?.invalid && form.get('category')?.touched"
                >
                  <option value="damaged_item">{{ 'reportModal.catDamaged' | translate }}</option>
                  <option value="defective">{{ 'reportModal.catDefective' | translate }}</option>
                  <option value="wrong_item">{{ 'reportModal.catWrong' | translate }}</option>
                  <option value="not_as_described">{{ 'reportModal.catNotAsDescribed' | translate }}</option>
                  <option value="delivery_delay">{{ 'reportModal.catDeliveryDelay' | translate }}</option>
                  <option value="courier_conduct">{{ 'reportModal.catCourier' | translate }}</option>
                  <option value="counterfeit_suspected">{{ 'reportModal.catCounterfeit' | translate }}</option>
                  <option value="prohibited_listing">{{ 'reportModal.catProhibited' | translate }}</option>
                  <option value="seller_unresponsive">{{ 'reportModal.catUnresponsive' | translate }}</option>
                  <option value="other">{{ 'reportModal.catOther' | translate }}</option>
                </select>
              </div>

              <!-- Reason Summary -->
              <div class="form-group">
                <label for="report-reason" class="form-label">
                  {{ 'reportModal.reasonLabel' | translate }} *
                </label>
                <input
                  id="report-reason"
                  type="text"
                  formControlName="reason"
                  class="form-control"
                  [placeholder]="'reportModal.reasonPlaceholder' | translate"
                  [attr.aria-invalid]="form.get('reason')?.invalid && form.get('reason')?.touched"
                />
                @if (form.get('reason')?.invalid && form.get('reason')?.touched) {
                  <small class="form-error" role="alert">Minimum 5 characters required.</small>
                }
              </div>

              <!-- Detailed Description -->
              <div class="form-group">
                <label for="report-description" class="form-label">
                  {{ 'reportModal.descLabel' | translate }} *
                </label>
                <textarea
                  id="report-description"
                  formControlName="description"
                  rows="3"
                  class="form-control"
                  [placeholder]="'reportModal.descPlaceholder' | translate"
                  [attr.aria-invalid]="form.get('description')?.invalid && form.get('description')?.touched"
                ></textarea>
                @if (form.get('description')?.invalid && form.get('description')?.touched) {
                  <small class="form-error" role="alert">Minimum 10 characters required.</small>
                }
              </div>

              <!-- Safe Evidence Upload Section -->
              <fieldset class="evidence-section">
                <legend class="evidence-heading">
                  {{ 'reportModal.evidenceHeading' | translate }}
                </legend>
                <p class="evidence-sub">{{ 'reportModal.evidenceSub' | translate }}</p>

                <!-- Input row for adding evidence link -->
                <div class="evidence-input-row">
                  <select
                    [value]="newEvidenceLabel()"
                    (change)="onEvidenceLabelChange($event)"
                    class="evidence-label-select"
                    aria-label="Evidence Type"
                  >
                    <option value="product_damage">{{ 'reportModal.evidenceLabelDamage' | translate }}</option>
                    <option value="packaging">{{ 'reportModal.evidenceLabelPackaging' | translate }}</option>
                    <option value="shipping_label">{{ 'reportModal.evidenceLabelLabel' | translate }}</option>
                    <option value="general">{{ 'reportModal.evidenceLabelGeneral' | translate }}</option>
                  </select>

                  <input
                    type="url"
                    [value]="newEvidenceUrl()"
                    (input)="onEvidenceUrlInput($event)"
                    (keydown.enter)="$event.preventDefault(); addEvidence()"
                    class="evidence-url-input"
                    [placeholder]="'reportModal.evidenceUrlPlaceholder' | translate"
                    aria-label="Secure Photo URL"
                  />

                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    (click)="addEvidence()"
                    [disabled]="evidenceList().length >= 5"
                  >
                    {{ 'reportModal.evidenceAddBtn' | translate }}
                  </button>
                </div>

                @if (evidenceUrlError()) {
                  <p class="form-error" role="alert">{{ evidenceUrlError() }}</p>
                }

                <!-- Evidence Chips List -->
                @if (evidenceList().length > 0) {
                  <ul class="evidence-chip-list" aria-label="Attached Evidence List">
                    @for (item of evidenceList(); track item.url; let i = $index) {
                      <li class="evidence-chip">
                        <span class="chip-label">{{ getEvidenceLabelText(item.label) }}</span>
                        <span class="chip-url" [title]="item.url">{{ truncateUrl(item.url) }}</span>
                        <button
                          type="button"
                          class="chip-remove"
                          (click)="removeEvidence(i)"
                          [attr.aria-label]="'Remove evidence ' + (i + 1)"
                        >
                          ✕
                        </button>
                      </li>
                    }
                  </ul>
                }

                <small class="evidence-note">{{ 'reportModal.evidenceMaxNote' | translate }}</small>
              </fieldset>

              <!-- Error Banner -->
              @if (submitError()) {
                <div class="error-banner" role="alert" aria-live="assertive">
                  <ui-icon name="alert-circle" [size]="16" />
                  <div class="error-banner-content">
                    <span>{{ submitError() }}</span>
                    @if (isTimeoutOrRetryable()) {
                      <button type="button" class="btn btn-sm btn-outline-danger retry-btn" (click)="onSubmit()">
                        {{ 'reportModal.retry' | translate }}
                      </button>
                    }
                  </div>
                </div>
              }

              <!-- Form Action Buttons -->
              <div class="modal-actions">
                <button
                  type="button"
                  class="btn btn-ghost"
                  (click)="closeModal()"
                  [disabled]="submitting()"
                >
                  {{ 'reportModal.cancel' | translate }}
                </button>
                <button
                  type="submit"
                  class="btn btn-primary"
                  [disabled]="form.invalid || submitting()"
                >
                  @if (submitting()) {
                    <span class="btn-spinner"></span>
                    {{ 'reportModal.submitting' | translate }}
                  } @else {
                    {{ 'reportModal.submit' | translate }}
                  }
                </button>
              </div>
            </form>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(2px);
      z-index: 1050;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .modal-card {
      background: #ffffff;
      border-radius: 12px;
      width: 100%;
      max-width: 560px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      outline: none;
      overflow: hidden;
    }
    .modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-border, #e5e7eb);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .modal-title {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 4px 0;
    }
    .subject-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge-sub {
      background: #eef2ff;
      color: #4338ca;
    }
    .badge-success {
      background: #dcfce7;
      color: #15803d;
    }
    .badge-warning {
      background: #fef3c7;
      color: #b45309;
    }
    .subject-name {
      color: #4b5563;
      font-weight: 500;
    }
    .close-button {
      background: transparent;
      border: 0;
      font-size: 20px;
      line-height: 1;
      color: #6b7280;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
    }
    .close-button:hover,
    .close-button:focus-visible {
      color: #111827;
      background: #f3f4f6;
      outline: 2px solid #6366f1;
    }
    .modal-body {
      padding: 20px;
      overflow-y: auto;
      display: grid;
      gap: 16px;
    }
    .state-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 32px 16px;
      gap: 12px;
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid #e5e7eb;
      border-top-color: #4f46e5;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .state-title {
      font-size: 17px;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }
    .state-desc {
      font-size: 14px;
      color: #4b5563;
      max-width: 420px;
      margin: 0;
      line-height: 1.5;
    }
    .state-sub {
      font-size: 13px;
      color: #6b7280;
    }
    .conflict-icon { color: #d97706; }
    .denied-icon { color: #dc2626; }
    .success-icon { color: #16a34a; }
    .reference-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px 16px;
      width: 100%;
      max-width: 380px;
      display: grid;
      gap: 8px;
      text-align: left;
    }
    .ref-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }
    .case-code {
      color: #4f46e5;
      font-family: monospace;
      font-size: 14px;
    }
    .policy-banner {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .banner-icon {
      color: #16a34a;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .banner-content {
      font-size: 12.5px;
      color: #166534;
      line-height: 1.4;
    }
    .deadline-text {
      font-weight: 600;
      margin: 0 0 2px 0;
    }
    .sla-text {
      margin: 0;
    }
    form {
      display: grid;
      gap: 14px;
    }
    .form-group {
      display: grid;
      gap: 6px;
    }
    .form-label {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
    }
    .form-control {
      width: 100%;
      padding: 9px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      color: #111827;
      background: #ffffff;
      transition: border-color 0.15s ease;
    }
    .form-control:focus {
      outline: 0;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
    }
    .form-error {
      color: #dc2626;
      font-size: 12px;
      margin: 0;
    }
    .evidence-section {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px 14px;
      display: grid;
      gap: 10px;
      margin: 0;
    }
    .evidence-heading {
      font-size: 13px;
      font-weight: 700;
      color: #374151;
      padding: 0 4px;
    }
    .evidence-sub {
      font-size: 12px;
      color: #6b7280;
      margin: 0;
    }
    .evidence-input-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .evidence-label-select {
      flex: 1 1 120px;
      padding: 8px 10px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 13px;
    }
    .evidence-url-input {
      flex: 2 1 180px;
      padding: 8px 10px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 13px;
    }
    .evidence-chip-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .evidence-chip {
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 4px 8px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
    }
    .chip-label {
      font-weight: 600;
      color: #4f46e5;
    }
    .chip-url {
      color: #4b5563;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .chip-remove {
      background: transparent;
      border: 0;
      color: #9ca3af;
      cursor: pointer;
      font-size: 12px;
      padding: 0 2px;
    }
    .chip-remove:hover { color: #dc2626; }
    .evidence-note {
      font-size: 11.5px;
      color: #9ca3af;
    }
    .error-banner {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 6px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #b91c1c;
      font-size: 13px;
    }
    .error-banner-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      gap: 8px;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 10px;
      padding-top: 6px;
    }
    .btn {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-primary {
      background: #4f46e5;
      color: #ffffff;
    }
    .btn-primary:hover:not(:disabled) {
      background: #4338ca;
    }
    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
      border-color: #d1d5db;
    }
    .btn-ghost {
      background: transparent;
      color: #6b7280;
    }
    .btn-ghost:hover:not(:disabled) {
      background: #f9fafb;
      color: #111827;
    }
    .btn-sm {
      padding: 6px 12px;
      font-size: 12.5px;
    }
    .btn-outline-danger {
      background: transparent;
      border-color: #fca5a5;
      color: #b91c1c;
    }
    .btn-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @media (max-width: 480px) {
      .modal-backdrop {
        padding: 0;
        align-items: flex-end;
      }
      .modal-card {
        border-radius: 16px 16px 0 0;
        max-height: 92vh;
      }
      .evidence-input-row {
        flex-direction: column;
      }
    }
  `],
})
export class BuyerReportModalComponent implements OnInit {
  private readonly rentify = inject(RentifyMarketplaceService);
  private readonly translate = inject(TranslateService);

  @ViewChild('modalContainer') modalContainer?: ElementRef<HTMLDivElement>;

  @Input({ required: true }) subjectType: ReportSubjectType = 'order';
  @Input({ required: true }) subjectId!: string;
  @Input() subjectTitle = '';

  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<BuyerReportResult>();

  readonly loadingEligibility = signal(true);
  readonly eligibility = signal<ReportEligibility | null>(null);
  readonly submitting = signal(false);
  readonly submitError = signal('');
  readonly submitResult = signal<BuyerReportResult | null>(null);

  readonly evidenceList = signal<EvidenceItem[]>([]);
  readonly newEvidenceUrl = signal('');
  readonly newEvidenceLabel = signal<EvidenceLabel>('product_damage');
  readonly evidenceUrlError = signal('');

  private idempotencyKey = `rpt-idempotency-${Date.now()}`;

  readonly form = new FormGroup({
    category: new FormControl<ReportCategory>('damaged_item', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    reason: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(5), Validators.maxLength(255)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10), Validators.maxLength(4000)],
    }),
  });

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (!this.submitting()) {
      this.closeModal();
    }
  }

  ngOnInit(): void {
    // Select default category based on subjectType
    if (this.subjectType === 'product') {
      this.form.patchValue({ category: 'prohibited_listing' });
    } else if (this.subjectType === 'merchant') {
      this.form.patchValue({ category: 'seller_unresponsive' });
    }

    this.checkEligibility();
  }

  async checkEligibility(): Promise<void> {
    this.loadingEligibility.set(true);
    try {
      const res = await firstValueFrom(
        this.rentify.checkReportEligibility(this.subjectType, this.subjectId),
      );
      this.eligibility.set(res.data);
    } catch (err: any) {
      // In case eligibility endpoint returns 404 or error
      this.eligibility.set({
        eligible: false,
        subjectType: this.subjectType,
        subjectId: this.subjectId,
        reasonCodes: ['ELIGIBILITY_CHECK_FAILED'],
        guidance: err?.error?.message || err?.message || 'Unable to verify report eligibility at this time.',
      });
    } finally {
      this.loadingEligibility.set(false);
    }
  }

  onEvidenceLabelChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as EvidenceLabel;
    this.newEvidenceLabel.set(val);
  }

  onEvidenceUrlInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.newEvidenceUrl.set(val);
    this.evidenceUrlError.set('');
  }

  addEvidence(): void {
    const raw = this.newEvidenceUrl().trim();
    if (!raw) return;

    if (!raw.startsWith('https://')) {
      this.evidenceUrlError.set('Evidence URL must start with secure https://');
      return;
    }

    if (raw.startsWith('javascript:') || raw.startsWith('data:')) {
      this.evidenceUrlError.set('Invalid evidence link scheme.');
      return;
    }

    if (this.evidenceList().some((e) => e.url === raw)) {
      this.evidenceUrlError.set('This photo link is already attached.');
      return;
    }

    if (this.evidenceList().length >= 5) {
      this.evidenceUrlError.set('Maximum of 5 evidence items reached.');
      return;
    }

    this.evidenceList.update((curr) => [
      ...curr,
      {
        url: raw,
        label: this.newEvidenceLabel(),
        type: 'photo',
        uploadedAt: new Date().toISOString(),
      },
    ]);

    this.newEvidenceUrl.set('');
    this.evidenceUrlError.set('');
  }

  removeEvidence(index: number): void {
    this.evidenceList.update((curr) => curr.filter((_, i) => i !== index));
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.submitting()) return;

    this.submitting.set(true);
    this.submitError.set('');

    const raw = this.form.getRawValue();
    const payload = {
      subjectType: this.subjectType,
      subjectId: this.subjectId,
      category: raw.category,
      reason: raw.reason.trim(),
      description: raw.description.trim(),
      evidence: this.evidenceList(),
    };

    try {
      const res = await firstValueFrom(
        this.rentify.submitBuyerReport(payload, this.idempotencyKey),
      );
      const resultData = res.data?.report || (res.data as any);
      this.submitResult.set(resultData);
      this.submitted.emit(resultData);
    } catch (err: any) {
      const status = err?.status || err?.statusCode;
      const code = err?.error?.code || '';
      if (status === 409 && code === 'DUPLICATE_REPORT_EXISTS') {
        this.submitError.set(this.translate.t('reportModal.conflictError'));
      } else if (status === 408 || err?.name === 'TimeoutError') {
        this.submitError.set(this.translate.t('reportModal.timeoutError'));
      } else {
        this.submitError.set(err?.error?.message || err?.message || 'Failed to submit report.');
      }
    } finally {
      this.submitting.set(false);
    }
  }

  isTimeoutOrRetryable(): boolean {
    const err = this.submitError();
    return err.includes('timed out') || err.includes('timeout') || err.includes('Network');
  }

  getSubjectTypeLabel(): string {
    switch (this.subjectType) {
      case 'order': return this.translate.t('reportModal.order');
      case 'return': return this.translate.t('reportModal.return');
      case 'product': return this.translate.t('reportModal.product');
      case 'merchant': return this.translate.t('reportModal.merchant');
      default: return this.subjectType;
    }
  }

  getEvidenceLabelText(label?: EvidenceLabel): string {
    switch (label) {
      case 'product_damage': return this.translate.t('reportModal.evidenceLabelDamage');
      case 'packaging': return this.translate.t('reportModal.evidenceLabelPackaging');
      case 'shipping_label': return this.translate.t('reportModal.evidenceLabelLabel');
      case 'general':
      default:
        return this.translate.t('reportModal.evidenceLabelGeneral');
    }
  }

  truncateUrl(url: string): string {
    try {
      const parsed = new URL(url);
      const filename = parsed.pathname.split('/').pop() || parsed.hostname;
      return filename.length > 20 ? `${filename.slice(0, 18)}…` : filename;
    } catch {
      return url.length > 24 ? `${url.slice(0, 22)}…` : url;
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.submitting()) {
      this.closeModal();
    }
  }

  closeModal(): void {
    this.closed.emit();
  }
}
