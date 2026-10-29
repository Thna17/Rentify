import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { OrderStatus, PaymentStatus } from '../core/api/api.models';
import {
  MarketplaceOrder,
  MarketplaceOrderEvent,
  RentifyMarketplaceService,
} from '../core/rentify/rentify-marketplace.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { TranslateService } from '../core/i18n/translate.service';
import { SeoService } from '../core/seo/seo.service';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';
import { OrderStatusBadgeComponent } from '../components/shared/orders/order-status-badge/order-status-badge.component';
import { BuyerReportModalComponent } from '../components/shared/reports/buyer-report-modal.component';

export interface TimelineEntry {
  type: string;
  title: string;
  timestamp: string;
  icon: string;
  badgeClass?: string;
  amount?: string | null;
  details?: {
    reason?: string;
    resolution?: string;
    method?: string;
    refundedAt?: string;
    evidence?: string[];
  };
}

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    NavbarComponent,
    FooterComponent,
    IconComponent,
    OrderStatusBadgeComponent,
    BuyerReportModalComponent,
    TranslatePipe,
  ],
  template: `
    <app-navbar />

    <main class="page-container">
      <nav class="crumbs" aria-label="Breadcrumb">
        <a routerLink="/orders">{{ 'orders.title' | translate }}</a>
        <span>›</span>
        <span>{{ order() ? '#' + order()?.orderNumber : ('orderDetail.title' | translate) }}</span>
      </nav>

      @if (loading()) {
        <div class="card state-card">
          <ui-icon name="loader" [size]="24" class="spin" />
          <p>Loading order details…</p>
        </div>
      } @else if (forbidden()) {
        <div class="card state-card forbidden" role="alert">
          <ui-icon name="alert-circle" [size]="32" />
          <h2>{{ 'orderDetail.forbiddenTitle' | translate }}</h2>
          <p>{{ 'orderDetail.forbiddenDesc' | translate }}</p>
          <a class="btn btn-primary btn-sm" routerLink="/orders">
            {{ 'orderDetail.backToOrders' | translate }}
          </a>
        </div>
      } @else if (error(); as err) {
        <div class="card state-card error" role="alert">
          <ui-icon name="alert-circle" [size]="32" />
          <h2>Could not load order</h2>
          <p>{{ err }}</p>
          <button class="btn btn-outline btn-sm" (click)="loadOrder()">
            Retry
          </button>
        </div>
      } @else if (order(); as ord) {
        <header class="order-header card">
          <div class="header-main">
            <div class="order-id-block">
              <h1>#{{ ord.orderNumber }}</h1>
              <span class="placed-date">
                {{ 'orderDetail.placedOn' | translate }}
                {{ (ord.createdAt || '') | date: 'medium' }}
              </span>
            </div>

            <div class="badges-row">
              <span class="channel-tag">Marketplace</span>
              <app-order-status [status]="deliveryStatusBadge(ord.deliveryStatus)" />
              <app-order-status [status]="paymentStatusBadge(ord.payment?.status)" />
            </div>
          </div>

          <!-- Active Claim / Return / Complaint Status Alert -->
          @if (activeClaimEvent(); as claim) {
            <div class="claim-alert-strip" role="region" aria-label="Order claim status">
              <div class="claim-alert-header">
                <ui-icon name="shield" [size]="18" />
                <strong>
                  {{
                    claim.type === 'return_requested'
                      ? ('orderDetail.returnRequestedBanner' | translate)
                      : ('orderDetail.complaintFiledBanner' | translate)
                  }}
                </strong>
                <span class="claim-time">
                  {{ claim.createdAt | date: 'short' }}
                </span>
              </div>
              <p class="claim-reason">
                <em>Reason:</em> {{ claim.details.reason }}
              </p>
              @if (claim.details.evidence && claim.details.evidence.length) {
                <div class="evidence-preview-list">
                  <small>Attached evidence:</small>
                  @for (ev of claim.details.evidence; track ev) {
                    <a [href]="ev" target="_blank" rel="noopener noreferrer" class="evidence-link">
                      <ui-icon name="external-link" [size]="12" /> {{ ev }}
                    </a>
                  }
                </div>
              }

              <!-- 48-Hour Deadline & 2-Tier Resolution Messaging -->
              <div class="sla-box">
                <div class="sla-deadline">
                  <ui-icon name="clock" [size]="14" />
                  <span>
                    {{
                      'orderDetail.responseDeadline'
                        | translate:{ time: responseDeadline(claim.createdAt) }
                    }}
                  </span>
                </div>
                <p class="sla-text">{{ 'orderDetail.tier1Notice' | translate }}</p>
                <p class="sla-text">{{ 'orderDetail.tier2Notice' | translate }}</p>

                @if (!escalated()) {
                  <button
                    type="button"
                    class="btn btn-outline btn-sm escalate-btn"
                    (click)="escalateToSupport()"
                  >
                    <ui-icon name="alert-triangle" [size]="13" />
                    {{ 'orderDetail.escalateSupport' | translate }}
                  </button>
                } @else {
                  <div class="escalated-badge" role="status">
                    <ui-icon name="check-circle" [size]="14" />
                    <span>{{ 'orderDetail.escalatedNotice' | translate }}</span>
                  </div>
                }
              </div>
            </div>
          }
        </header>

        <div class="detail-grid">
          <!-- Left Column: Items, COD Summary & Delivery Information -->
          <div class="main-column">
            <!-- Items Purchased -->
            <section class="card block" aria-labelledby="items-heading">
              <h2 id="items-heading">Items</h2>
              <div class="items-list">
                @for (item of ord.items; track item.productId) {
                  <div class="item-row">
                    <div class="item-info">
                      <strong class="item-name">{{ item.name }}</strong>
                      <span class="item-meta">
                        {{ item.quantity }} × \${{ (parseFloat(item.total) / item.quantity).toFixed(2) }}
                      </span>
                    </div>
                    <strong class="item-subtotal">\${{ parseFloat(item.total).toFixed(2) }}</strong>
                  </div>
                }
              </div>

              <!-- Authoritative Totals & Exact Financial Status -->
              <div class="totals-breakdown">
                <div class="total-row">
                  <span>Subtotal</span>
                  <span>\${{ parseFloat(ord.subtotal).toFixed(2) }}</span>
                </div>
                <div class="total-row">
                  <span>Delivery fee</span>
                  <span>
                    {{ parseFloat(ord.deliveryFee) === 0 ? 'Free' : ('$' + parseFloat(ord.deliveryFee).toFixed(2)) }}
                  </span>
                </div>
                <div class="total-row total-due">
                  <span>{{ 'orderDetail.amountDue' | translate }}</span>
                  <span class="due-amount">\${{ parseFloat(ord.totalAmount).toFixed(2) }}</span>
                </div>

                <!-- COD Real-Time Settlement Facts -->
                <div class="cod-facts-box">
                  <div class="cod-fact-item">
                    <span class="fact-label">{{ 'orderDetail.paymentStatus' | translate }}:</span>
                    <strong class="fact-value">
                      {{
                        ord.payment?.status === 'paid'
                          ? 'Collected (Paid)'
                          : ord.payment?.status === 'refunded'
                            ? 'Refunded by Merchant'
                            : 'Pending Cash on Delivery'
                      }}
                    </strong>
                  </div>
                  <div class="cod-fact-item">
                    <span class="fact-label">{{ 'orderDetail.amountCollected' | translate }}:</span>
                    <strong class="fact-value">\${{ ord.payment?.collectedAmount || '0.00' }}</strong>
                  </div>
                  @if (ord.payment && parseFloat(ord.payment.refundedAmount) > 0) {
                    <div class="cod-fact-item refund-fact">
                      <span class="fact-label">{{ 'orderDetail.amountRefunded' | translate }}:</span>
                      <strong class="fact-value text-danger">-\${{ ord.payment.refundedAmount }}</strong>
                    </div>
                  }
                </div>
              </div>
            </section>

            <!-- Delivery Recipient Information -->
            <section class="card block" aria-labelledby="delivery-heading">
              <h2 id="delivery-heading">{{ 'orderDetail.deliveryAddress' | translate }}</h2>
              <div class="address-details">
                <div class="addr-row">
                  <span class="addr-label">{{ 'orderDetail.recipient' | translate }}:</span>
                  <strong>{{ ord.customerInfo?.name || '—' }}</strong>
                </div>
                <div class="addr-row">
                  <span class="addr-label">{{ 'orderDetail.phone' | translate }}:</span>
                  <strong>{{ ord.customerInfo?.phone || '—' }}</strong>
                </div>
                <div class="addr-row">
                  <span class="addr-label">Address:</span>
                  <span>{{ ord.shippingInfo?.address || '—' }}</span>
                </div>
              </div>
            </section>

            <!-- Policy Actions: Return & Complaint -->
            <section class="card block actions-block" aria-labelledby="actions-heading">
              <h2 id="actions-heading">Need help with this order?</h2>

              <!-- Return Eligibility Banner (DEC-008: 7 calendar days from delivery) -->
              <div class="policy-window-box">
                @if (returnEligible()) {
                  <div class="window-status window-open">
                    <ui-icon name="check-circle" [size]="16" />
                    <span>
                      {{ 'orderDetail.returnEligible' | translate:{ days: 7 } }}
                    </span>
                  </div>
                  <p class="window-note">
                    Merchants accept returns for damaged items, defective products, or incorrect sizes.
                  </p>
                  @if (!activeClaimEvent()) {
                    <button
                      type="button"
                      class="btn btn-outline btn-sm"
                      (click)="openReportModal('return')"
                    >
                      <ui-icon name="rotate-ccw" [size]="14" />
                      {{ 'orders.requestReturn' | translate }}
                    </button>
                  }
                } @else if (ord.deliveryStatus === 'delivered') {
                  <div class="window-status window-closed">
                    <ui-icon name="clock" [size]="16" />
                    <span>{{ 'orderDetail.returnExpired' | translate }}</span>
                  </div>
                } @else {
                  <p class="window-note muted">
                    Returns become available once the parcel is delivered and inspected.
                  </p>
                }

                @if (!activeClaimEvent()) {
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm complaint-link"
                    (click)="openReportModal('order')"
                  >
                    <ui-icon name="alert-circle" [size]="14" />
                    {{ 'orders.fileComplaint' | translate }}
                  </button>
                }
              </div>

              <!-- Interactive Return / Complaint Submission Form -->
              @if (showReportForm()) {
                <div class="report-form-panel animate-scale card">
                  <div class="form-header">
                    <h3>
                      {{
                        activeReportType() === 'return_requested'
                          ? ('orderDetail.submitReturn' | translate)
                          : ('orderDetail.submitComplaint' | translate)
                      }}
                    </h3>
                    <button type="button" class="close-btn" (click)="showReportForm.set(false)">×</button>
                  </div>

                  <form [formGroup]="reportForm" (ngSubmit)="submitReport()">
                    <label>
                      <span>{{ 'orderDetail.reasonLabel' | translate }} *</span>
                      <select formControlName="reasonSelect">
                        @if (activeReportType() === 'return_requested') {
                          <option value="Damaged on arrival">{{ 'orderDetail.reasonDamaged' | translate }}</option>
                          <option value="Defective or non-functional">{{ 'orderDetail.reasonDefective' | translate }}</option>
                          <option value="Incorrect item or size received">{{ 'orderDetail.reasonWrongItem' | translate }}</option>
                          <option value="Material discrepancy from listing description">{{ 'orderDetail.reasonNotAsDescribed' | translate }}</option>
                        } @else {
                          <option value="Delivery delay or missing delivery">{{ 'orderDetail.reasonDelay' | translate }}</option>
                          <option value="Courier or delivery conduct issue">{{ 'orderDetail.reasonCourier' | translate }}</option>
                          <option value="Other issue">{{ 'orderDetail.reasonOther' | translate }}</option>
                        }
                      </select>
                    </label>

                    <label>
                      <span>{{ 'orderDetail.notesLabel' | translate }} *</span>
                      <textarea
                        formControlName="notes"
                        rows="3"
                        placeholder="Please describe the issue in detail (min 10 characters)..."
                      ></textarea>
                      @if (reportForm.get('notes')?.invalid && reportForm.get('notes')?.touched) {
                        <small class="text-danger">Minimum 10 characters required.</small>
                      }
                    </label>

                    <label>
                      <span>{{ 'orderDetail.evidenceLabel' | translate }}</span>
                      <input
                        type="url"
                        formControlName="evidenceUrl"
                        [placeholder]="'orderDetail.evidencePlaceholder' | translate"
                      />
                      <small class="muted">Safe HTTPS image URL (optional)</small>
                    </label>

                    @if (reportError(); as repErr) {
                      <p class="error-text" role="alert">
                        <ui-icon name="alert-circle" [size]="14" /> {{ repErr }}
                      </p>
                    }

                    <div class="form-actions">
                      <button
                        type="button"
                        class="btn btn-ghost btn-sm"
                        (click)="showReportForm.set(false)"
                        [disabled]="submittingReport()"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        class="btn btn-primary btn-sm"
                        [disabled]="reportForm.invalid || submittingReport()"
                      >
                        {{ submittingReport() ? 'Submitting…' : 'Submit Request' }}
                      </button>
                    </div>
                  </form>
                </div>
              }
            </section>
          </div>

          <!-- Right Column: Event-Derived Tracking Timeline -->
          <div class="side-column">
            <section class="card block timeline-block" aria-labelledby="timeline-heading">
              <h2 id="timeline-heading">
                <ui-icon name="activity" [size]="16" />
                {{ 'orderDetail.timelineTitle' | translate }}
              </h2>
              <p class="timeline-sub">{{ 'orderDetail.timelineSub' | translate }}</p>

              <div class="timeline" role="feed" aria-label="Order status events">
                @for (entry of timelineEntries(); track entry.title + entry.timestamp) {
                  <article class="timeline-step">
                    <div class="step-icon" [ngClass]="entry.badgeClass || ''">
                      <ui-icon [name]="entry.icon" [size]="14" />
                    </div>
                    <div class="step-content">
                      <div class="step-header">
                        <strong>{{ entry.title }}</strong>
                        <time class="step-time">{{ entry.timestamp | date: 'd MMM, HH:mm' }}</time>
                      </div>

                      @if (entry.details?.reason) {
                        <p class="step-desc">
                          <em>Note:</em> {{ entry.details?.reason }}
                        </p>
                      }

                      @if (entry.details?.method) {
                        <p class="step-desc">
                          <em>Method:</em> {{ entry.details?.method }}
                        </p>
                      }

                      @if (entry.amount) {
                        <strong class="step-amount">\${{ entry.amount }}</strong>
                      }
                    </div>
                  </article>
                }
              </div>
            </section>
          </div>
        </div>
      }

      @if (showReportModal()) {
        <buyer-report-modal
          [subjectType]="reportModalSubjectType()"
          [subjectId]="orderId"
          [subjectTitle]="'Order #' + (order()?.orderNumber || orderId)"
          (closed)="showReportModal.set(false)"
          (submitted)="onReportSubmitted($event)"
        />
      }
    </main>

    <app-footer />
  `,
  styles: [
    `
      .page-container {
        padding: 24px 32px 64px;
        max-width: 1180px;
        margin: 0 auto;
      }
      .crumbs {
        display: flex;
        gap: 8px;
        font-size: 13px;
        color: var(--color-muted);
        margin-bottom: 16px;
      }
      .crumbs a:hover {
        color: var(--color-accent);
      }
      .state-card {
        padding: 48px 32px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 12px;
      }
      .state-card.forbidden {
        color: #991b1b;
        background: #fef2f2;
        border-color: #fecaca;
      }
      .order-header {
        padding: 20px 24px;
        margin-bottom: 20px;
      }
      .header-main {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        flex-wrap: wrap;
      }
      .order-id-block h1 {
        font-size: 24px;
        margin: 0 0 4px;
      }
      .placed-date {
        color: var(--color-muted);
        font-size: 13px;
      }
      .badges-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .channel-tag {
        font-size: 11px;
        font-weight: 600;
        padding: 3px 8px;
        background: #f3f4f6;
        border-radius: 4px;
        color: #4b5563;
      }
      .claim-alert-strip {
        margin-top: 16px;
        padding: 14px 16px;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: var(--radius-sm, 6px);
        font-size: 13px;
        display: grid;
        gap: 8px;
      }
      .claim-alert-header {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #1e40af;
      }
      .claim-time {
        margin-left: auto;
        font-size: 11.5px;
        color: #6b7280;
      }
      .claim-reason {
        margin: 0;
        color: #1f2937;
      }
      .evidence-preview-list {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
      }
      .evidence-link {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: var(--color-accent);
        text-decoration: underline;
      }
      .sla-box {
        margin-top: 6px;
        padding-top: 8px;
        border-top: 1px dashed #bfdbfe;
        display: grid;
        gap: 6px;
      }
      .sla-deadline {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 650;
        color: #1e3a8a;
      }
      .sla-text {
        margin: 0;
        font-size: 12px;
        color: #3b82f6;
        line-height: 1.45;
      }
      .escalate-btn {
        margin-top: 4px;
        justify-self: start;
      }
      .escalated-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        background: #dcfce7;
        color: #166534;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
      }
      .detail-grid {
        display: grid;
        grid-template-columns: 1fr 380px;
        gap: 20px;
        align-items: start;
      }
      .main-column {
        display: grid;
        gap: 16px;
      }
      .block {
        padding: 20px 22px;
      }
      .block h2 {
        font-size: 16px;
        margin: 0 0 14px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .items-list {
        display: grid;
        gap: 10px;
        padding-bottom: 14px;
        border-bottom: 1px solid var(--color-border);
      }
      .item-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }
      .item-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .item-name {
        font-size: 14px;
      }
      .item-meta {
        font-size: 12px;
        color: var(--color-muted);
      }
      .item-subtotal {
        font-size: 14px;
      }
      .totals-breakdown {
        padding-top: 12px;
        display: grid;
        gap: 6px;
      }
      .total-row {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        color: var(--color-muted);
      }
      .total-row.total-due {
        font-size: 16px;
        font-weight: 700;
        color: var(--color-text);
        border-top: 1px solid var(--color-border);
        padding-top: 8px;
        margin-top: 4px;
      }
      .due-amount {
        color: var(--color-accent);
      }
      .cod-facts-box {
        margin-top: 10px;
        padding: 10px 12px;
        background: #fafaf9;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        display: grid;
        gap: 6px;
        font-size: 12.5px;
      }
      .cod-fact-item {
        display: flex;
        justify-content: space-between;
      }
      .fact-label {
        color: var(--color-muted);
      }
      .address-details {
        display: grid;
        gap: 8px;
        font-size: 13px;
      }
      .addr-row {
        display: grid;
        grid-template-columns: 100px 1fr;
        gap: 8px;
      }
      .addr-label {
        color: var(--color-muted);
      }
      .actions-block {
        display: grid;
        gap: 12px;
      }
      .policy-window-box {
        display: grid;
        gap: 8px;
      }
      .window-status {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
      }
      .window-open {
        color: #166534;
      }
      .window-closed {
        color: #991b1b;
      }
      .window-note {
        font-size: 12px;
        color: var(--color-muted);
        margin: 0;
      }
      .complaint-link {
        justify-self: start;
        padding-left: 0;
      }
      .report-form-panel {
        padding: 16px;
        margin-top: 8px;
        background: #fdfdfd;
        border: 1px solid var(--color-border-strong);
        display: grid;
        gap: 12px;
      }
      .form-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .form-header h3 {
        margin: 0;
        font-size: 15px;
      }
      .close-btn {
        background: transparent;
        border: 0;
        font-size: 18px;
        cursor: pointer;
      }
      form {
        display: grid;
        gap: 10px;
      }
      form label {
        display: grid;
        gap: 4px;
        font-size: 12.5px;
        font-weight: 600;
      }
      form select,
      form textarea,
      form input {
        width: 100%;
        padding: 8px 10px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        font-size: 13px;
        font-family: inherit;
      }
      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 4px;
      }
      .timeline-block {
        padding: 18px 20px;
      }
      .timeline-sub {
        font-size: 12px;
        color: var(--color-muted);
        margin: -8px 0 16px;
      }
      .timeline {
        display: grid;
        gap: 16px;
        position: relative;
      }
      .timeline::before {
        content: '';
        position: absolute;
        top: 8px;
        bottom: 8px;
        left: 13px;
        width: 2px;
        background: var(--color-border);
      }
      .timeline-step {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        position: relative;
        z-index: 1;
      }
      .step-icon {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #fff;
        border: 2px solid var(--color-border-strong);
        display: grid;
        place-items: center;
        flex-shrink: 0;
        color: var(--color-muted);
      }
      .step-icon.active {
        border-color: var(--color-accent);
        color: var(--color-accent);
      }
      .step-icon.success {
        border-color: #22c55e;
        color: #22c55e;
        background: #f0fdf4;
      }
      .step-icon.warning {
        border-color: #f59e0b;
        color: #f59e0b;
        background: #fffbeb;
      }
      .step-icon.danger {
        border-color: #ef4444;
        color: #ef4444;
        background: #fef2f2;
      }
      .step-content {
        flex: 1;
        display: grid;
        gap: 2px;
      }
      .step-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 8px;
      }
      .step-header strong {
        font-size: 13px;
      }
      .step-time {
        font-size: 11px;
        color: var(--color-muted);
      }
      .step-desc {
        font-size: 12px;
        color: #4b5563;
        margin: 0;
      }
      .step-amount {
        font-size: 12.5px;
        color: var(--color-text);
      }
      .spin {
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @media (max-width: 840px) {
        .detail-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class OrderDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly rentify = inject(RentifyMarketplaceService);
  protected readonly translate = inject(TranslateService);
  private readonly seo = inject(SeoService);

  readonly orderId = this.route.snapshot.paramMap.get('id') || '';

  readonly order = signal<MarketplaceOrder | null>(null);
  readonly events = signal<MarketplaceOrderEvent[]>([]);
  readonly loading = signal(true);
  readonly forbidden = signal(false);
  readonly error = signal('');

  readonly showReportForm = signal(false);
  readonly activeReportType = signal<'return_requested' | 'complaint'>('return_requested');
  readonly submittingReport = signal(false);
  readonly reportError = signal('');
  readonly escalated = signal(false);
  readonly showReportModal = signal(false);
  readonly reportModalSubjectType = signal<'order' | 'return'>('order');

  readonly reportForm = new FormGroup({
    reasonSelect: new FormControl('Damaged on arrival', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    notes: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10), Validators.maxLength(1000)],
    }),
    evidenceUrl: new FormControl('', { nonNullable: true }),
  });

  loadPromise?: Promise<void>;

  ngOnInit(): void {
    this.seo.setPageTitle('Order Details | Rentify Marketplace');
    this.loadPromise = this.loadOrder();
  }

  async loadOrder(): Promise<void> {
    if (!this.orderId) return;

    this.loading.set(true);
    this.error.set('');
    this.forbidden.set(false);

    try {
      const [orderRes, eventsRes] = await Promise.all([
        firstValueFrom(this.rentify.order(this.orderId)),
        firstValueFrom(this.rentify.orderEvents(this.orderId)).catch(() => ({ events: [] })),
      ]);

      this.order.set(orderRes.order);
      this.events.set(eventsRes.events || []);
      if (orderRes.order?.orderNumber) {
        this.seo.setPageTitle(`Order #${orderRes.order.orderNumber} | Rentify Marketplace`);
      }
    } catch (err: any) {
      if (err?.status === 404 || err?.status === 403) {
        this.forbidden.set(true);
      } else {
        this.error.set(err?.error?.message || err?.message || 'Failed to load order.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  readonly returnEligible = computed(() => {
    const ord = this.order();
    if (!ord || ord.deliveryStatus !== 'delivered') return false;

    // Check delivery timestamp (DEC-008: 7 calendar days)
    const delEvent = this.events().find((e) => e.type === 'delivered');
    const delDateStr = delEvent?.createdAt || ord.createdAt;
    if (!delDateStr) return false;

    const deliveredAt = new Date(delDateStr).getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - deliveredAt <= sevenDaysMs;
  });

  readonly activeClaimEvent = computed(() => {
    const list = this.events();
    return list.find((e) => e.type === 'return_requested' || e.type === 'complaint') || null;
  });

  readonly timelineEntries = computed<TimelineEntry[]>(() => {
    const ord = this.order();
    if (!ord) return [];

    const entries: TimelineEntry[] = [];

    // 1. Order Placed
    if (ord.createdAt) {
      entries.push({
        type: 'order_created',
        title: 'Order Placed',
        timestamp: ord.createdAt,
        icon: 'package',
        badgeClass: 'active',
      });
    }

    // 2. Authoritative Events
    for (const ev of this.events()) {
      if (ev.type === 'delivered') {
        entries.push({
          type: 'delivered',
          title: 'Parcel Delivered',
          timestamp: ev.createdAt,
          icon: 'check',
          badgeClass: 'success',
        });
      } else if (ev.type === 'collect_cod') {
        entries.push({
          type: 'collect_cod',
          title: 'COD Payment Collected',
          timestamp: ev.createdAt,
          icon: 'banknote',
          badgeClass: 'success',
          amount: ev.amount,
        });
      } else if (ev.type === 'delivery_failed') {
        entries.push({
          type: 'delivery_failed',
          title: 'Delivery Failed',
          timestamp: ev.createdAt,
          icon: 'x-circle',
          badgeClass: 'danger',
          details: ev.details,
        });
      } else if (ev.type === 'retry_delivery') {
        entries.push({
          type: 'retry_delivery',
          title: 'Delivery Rescheduled',
          timestamp: ev.createdAt,
          icon: 'refresh-cw',
          badgeClass: 'warning',
        });
      } else if (ev.type === 'return_requested') {
        entries.push({
          type: 'return_requested',
          title: 'Return Requested',
          timestamp: ev.createdAt,
          icon: 'rotate-ccw',
          badgeClass: 'warning',
          details: ev.details,
        });
      } else if (ev.type === 'complaint') {
        entries.push({
          type: 'complaint',
          title: 'Issue Reported',
          timestamp: ev.createdAt,
          icon: 'alert-triangle',
          badgeClass: 'warning',
          details: ev.details,
        });
      } else if (ev.type === 'confirm_refund') {
        entries.push({
          type: 'confirm_refund',
          title: 'Refund Confirmed by Merchant',
          timestamp: ev.createdAt,
          icon: 'dollar-sign',
          badgeClass: 'success',
          amount: ev.amount,
          details: ev.details,
        });
      }
    }

    return entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  });

  responseDeadline(createdAt: string): string {
    const date = new Date(createdAt);
    // 48 business hours / 2 days from submission (DEC-009)
    date.setHours(date.getHours() + 48);
    return date.toLocaleString();
  }

  toggleReportForm(type: 'return_requested' | 'complaint'): void {
    this.activeReportType.set(type);
    this.reportForm.reset({
      reasonSelect: type === 'return_requested' ? 'Damaged on arrival' : 'Delivery delay or missing delivery',
      notes: '',
      evidenceUrl: '',
    });
    this.reportError.set('');
    this.showReportForm.set(true);
  }

  async submitReport(): Promise<void> {
    if (this.reportForm.invalid || this.submittingReport()) return;

    this.submittingReport.set(true);
    this.reportError.set('');

    const { reasonSelect, notes, evidenceUrl } = this.reportForm.getRawValue();
    const fullReason = `${reasonSelect}: ${notes.trim()}`;
    const evidenceList = evidenceUrl?.trim() ? [evidenceUrl.trim()] : undefined;

    const eventKey = `rpt-${this.activeReportType().slice(0, 3)}-${this.orderId}-${Date.now()}`;

    try {
      await firstValueFrom(
        this.rentify.report(
          this.orderId,
          this.activeReportType(),
          fullReason,
          eventKey,
          evidenceList,
        ),
      );
      this.showReportForm.set(false);
      await this.loadOrder();
    } catch (err: any) {
      this.reportError.set(err?.error?.message || err?.message || 'Failed to submit request.');
    } finally {
      this.submittingReport.set(false);
    }
  }

  escalateToSupport(): void {
    this.escalated.set(true);
    this.openReportModal('order');
  }

  openReportModal(type: 'order' | 'return'): void {
    this.reportModalSubjectType.set(type);
    this.showReportModal.set(true);
  }

  onReportSubmitted(_report: any): void {
    this.showReportModal.set(false);
    this.escalated.set(true);
    this.loadOrder();
  }

  deliveryStatusBadge(status?: string): OrderStatus {
    const s = status?.toUpperCase();
    if (s === 'DELIVERED') return 'DELIVERED';
    if (s === 'CONFIRMED' || s === 'RETRYING') return 'CONFIRMED';
    if (s === 'SHIPPED') return 'SHIPPED';
    if (s === 'CANCELLED' || s === 'FAILED') return 'CANCELLED';
    return 'PENDING';
  }

  paymentStatusBadge(status?: string): PaymentStatus {
    const s = status?.toUpperCase();
    if (s === 'PAID') return 'PAID';
    if (s === 'REFUNDED') return 'REFUNDED';
    if (s === 'FAILED') return 'FAILED';
    return 'PENDING';
  }

  parseFloat(val: string | null | undefined): number {
    return parseFloat(val || '0') || 0;
  }
}
