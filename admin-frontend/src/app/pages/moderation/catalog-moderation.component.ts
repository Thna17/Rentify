// admin-frontend/src/app/pages/moderation/catalog-moderation.component.ts
// P5-SUP-002: Catalog Moderation Console.
// Enforces versioned restricted-product taxonomy, review of merchant appeals,
// actionable moderator decisions, and immutable compliance audit history.

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslateService } from '../../core/i18n/translate.service';
import {
  ModerationFilter,
  ModerationProductItem,
  ProhibitedTaxonomyCode,
} from '../../core/support/support-operations.models';
import { SupportOperationsService } from '../../services/support-operations.service';
import { BadgeComponent } from '../../ui/badge.component';
import { ConfirmComponent } from '../../ui/confirm.component';
import { IconComponent } from '../../ui/icon.component';

@Component({
  selector: 'app-catalog-moderation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BadgeComponent,
    IconComponent,
    ConfirmComponent,
    TranslatePipe,
  ],
  template: `
    <div class="moderation-page" role="main" aria-labelledby="mod-title">
      <!-- Header -->
      <header class="moderation-header">
        <div>
          <p class="eyebrow">{{ 'moderation.eyebrow' | translate }}</p>
          <h1 id="mod-title" class="page-title">{{ 'moderation.title' | translate }}</h1>
          <p class="page-sub">{{ 'moderation.subtitle' | translate }}</p>
        </div>
        <div class="header-actions">
          <button
            type="button"
            class="btn btn-outline btn-sm"
            (click)="reloadItems()"
            [disabled]="loading()"
            [attr.aria-label]="'moderation.refreshQueue' | translate"
          >
            <kc-icon name="swap" [size]="14" />
            <span>{{ 'nav.refresh' | translate }}</span>
          </button>
        </div>
      </header>

      <!-- Queue Tabs -->
      <nav class="queue-tabs" [attr.aria-label]="'moderation.queues' | translate">
        <button
          type="button"
          class="queue-tab"
          [class.active]="activeQueue() === 'flagged'"
          (click)="switchQueue('flagged')"
        >
          <kc-icon name="flag" [size]="14" />
          {{ 'moderation.queueFlagged' | translate }}
        </button>
        <button
          type="button"
          class="queue-tab"
          [class.active]="activeQueue() === 'appeals'"
          (click)="switchQueue('appeals')"
        >
          <kc-icon name="swap" [size]="14" />
          {{ 'moderation.queueAppeals' | translate }}
        </button>
        <button
          type="button"
          class="queue-tab"
          [class.active]="activeQueue() === 'delisted'"
          (click)="switchQueue('delisted')"
        >
          <kc-icon name="shield" [size]="14" />
          {{ 'moderation.queueDelisted' | translate }}
        </button>
      </nav>

      <!-- Filter Controls Strip -->
      <section class="filters-bar card" [attr.aria-label]="'common.filterControls' | translate">
        <div class="search-group">
          <input
            type="search"
            class="filter-input search-input"
            [placeholder]="'common.search' | translate"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange()"
            [attr.aria-label]="'moderation.searchListings' | translate"
          />
        </div>
        <button
          type="button"
          class="btn btn-ghost btn-sm clear-btn"
          (click)="clearFilters()"
          [title]="'moderation.resetFilter' | translate"
        >
          {{ 'common.clearFilters' | translate }}
        </button>
      </section>

      <!-- Main Layout -->
      <div class="moderation-body">
        <!-- Master List Pane -->
        <aside class="items-list-pane card" [attr.aria-label]="'moderation.list' | translate">
          @if (loading()) {
            <div class="state-box" aria-live="polite">
              <span class="spinner"></span>
              <p>{{ 'common.loading' | translate }}</p>
            </div>
          } @else if (error()) {
            <div class="state-box error-box" role="alert">
              <kc-icon name="shield" [size]="24" />
              <h3>{{ 'common.errorTitle' | translate }}</h3>
              <p>{{ error() }}</p>
              <button type="button" class="btn btn-outline btn-sm" (click)="reloadItems()">
                {{ 'common.retry' | translate }}
              </button>
            </div>
          } @else if (items().length === 0) {
            <div class="state-box empty-box">
              <kc-icon name="box" [size]="28" />
              <h3>{{ 'common.emptyTitle' | translate }}</h3>
              <p>{{ 'common.emptyDesc' | translate }}</p>
            </div>
          } @else {
            <ul class="mod-items" role="listbox" [attr.aria-label]="'moderation.queueItems' | translate">
              @for (item of items(); track item.id) {
                <li
                  class="mod-item"
                  [class.selected]="selectedItem()?.id === item.id"
                  (click)="selectItem(item)"
                  (keydown.enter)="selectItem(item)"
                  (keydown.space)="selectItem(item)"
                  tabindex="0"
                  role="option"
                  [attr.aria-selected]="selectedItem()?.id === item.id"
                >
                  <div class="mod-item-top">
                    <span class="product-name">{{ item.productName }}</span>
                    <kc-badge [value]="item.status" />
                  </div>
                  <div class="mod-item-meta">
                    <span>Store: {{ item.storeName }}</span>
                    <span>\${{ item.price }}</span>
                    @if (item.violationCode) {
                      <span class="violation-badge">{{ item.violationCode }}</span>
                    }
                  </div>
                  @if (item.appeal && item.appeal.status === 'pending') {
                    <div class="appeal-pending-badge">
                      <kc-icon name="swap" [size]="12" />
                      <span>{{ 'moderation.appealPending' | translate }}</span>
                    </div>
                  }
                </li>
              }
            </ul>
          }
        </aside>

        <!-- Detail Console Pane -->
        <main class="item-detail-pane card" [attr.aria-label]="'moderation.detailConsole' | translate">
          @if (!selectedItem()) {
            <div class="state-box empty-detail">
              <kc-icon name="box" [size]="36" />
              <h3>{{ 'moderation.selectListing' | translate }}</h3>
              <p>{{ 'moderation.selectListingHint' | translate }}</p>
            </div>
          } @else if (selectedItem(); as p) {
            <!-- Detail Header -->
            <div class="detail-header-block">
              <div class="header-row">
                <h2>{{ p.productName }}</h2>
                <kc-badge [value]="p.status" />
              </div>
              <div class="header-meta">
                <span><strong>{{ 'moderation.idLabel' | translate }}</strong> <code class="font-mono">{{ p.productId }}</code></span>
                <span><strong>{{ 'moderation.storeLabel' | translate }}</strong> {{ p.storeName }}</span>
                <span><strong>{{ 'moderation.categoryLabel' | translate }}</strong> {{ p.category }}</span>
                <span><strong>{{ 'moderation.priceLabel' | translate }}</strong> \${{ p.price }}</span>
              </div>
            </div>

            <!-- Two Column Inspection Grid -->
            <div class="inspection-grid">
              <!-- Left Inspection: Product & Violation Details -->
              <div class="inspection-col">
                <!-- Image Gallery -->
                <div class="inspect-card card">
                  <h4>{{ 'moderation.productPhotos' | translate }}</h4>
                  @if (p.images && p.images.length) {
                    <div class="photo-strip">
                      @for (img of p.images; track img) {
                        <img [src]="img" [alt]="'moderation.productPhoto' | translate" class="inspect-img" />
                      }
                    </div>
                  } @else {
                    <p class="text-muted">{{ 'moderation.noImages' | translate }}</p>
                  }
                </div>

                <!-- Policy & Taxonomy Details -->
                <div class="inspect-card card policy-card">
                  <h4>{{ 'moderation.colViolation' | translate }}</h4>
                  @if (p.violationCode) {
                    <div class="violation-box">
                      <span class="violation-title">{{ p.violationCode }}</span>
                      <p class="violation-desc">{{ p.flagReason }}</p>
                    </div>
                  } @else {
                    <p class="text-muted">{{ 'moderation.noViolation' | translate }}</p>
                  }

                  @if (p.remediationGuidance) {
                    <div class="guidance-box">
                      <small class="guidance-label">{{ 'moderation.remediationGuidance' | translate }}</small>
                      <p class="guidance-text">{{ p.remediationGuidance }}</p>
                    </div>
                  }
                </div>

                <!-- Merchant Appeal Review Box (if appeal exists) -->
                @if (p.appeal; as apl) {
                  <div class="inspect-card card appeal-card">
                    <h4>{{ 'moderation.appealDetails' | translate }}</h4>
                    <div class="appeal-status-row">
                      <span>{{ 'moderation.statusLabel' | translate }}</span>
                      <kc-badge [value]="apl.status" />
                      <span class="appeal-date">{{ apl.submittedAt | date: 'medium' }}</span>
                    </div>

                    <div class="appeal-statement">
                      <strong>{{ 'moderation.appealReason' | translate }}:</strong>
                      <p class="appeal-quote">"{{ apl.reason }}"</p>
                    </div>

                    @if (apl.evidenceUrls && apl.evidenceUrls.length) {
                      <div class="appeal-docs">
                        <strong>{{ 'moderation.appealEvidence' | translate }}:</strong>
                        <ul>
                          @for (doc of apl.evidenceUrls; track doc) {
                            <li>
                              <a [href]="doc" target="_blank" rel="noopener noreferrer" class="doc-link">
                                {{ doc }}
                              </a>
                            </li>
                          }
                        </ul>
                      </div>
                    }

                    <!-- Appeal Decision Controls (if pending) -->
                    @if (apl.status === 'pending') {
                      <div class="appeal-decision-box">
                        <label class="form-label">
                          <span>{{ 'moderation.appealDecisionReason' | translate }}</span>
                          <textarea
                            rows="2"
                            class="form-textarea"
                            [(ngModel)]="appealDecisionReason"
                            [placeholder]="'moderation.appealReasonPlaceholder' | translate"
                            [disabled]="!auth.canModerateCatalog()"
                          ></textarea>
                        </label>

                        <div class="appeal-btn-row">
                          <button
                            type="button"
                            class="btn btn-outline btn-sm"
                            (click)="executeAppealDecision('approved')"
                            [disabled]="!auth.canModerateCatalog() || !appealDecisionReason.trim() || mutatingAction()"
                          >
                            {{ 'moderation.appealApprove' | translate }}
                          </button>
                          <button
                            type="button"
                            class="btn btn-danger btn-sm"
                            (click)="executeAppealDecision('rejected')"
                            [disabled]="!auth.canModerateCatalog() || !appealDecisionReason.trim() || mutatingAction()"
                          >
                            {{ 'moderation.appealReject' | translate }}
                          </button>
                        </div>
                      </div>
                    } @else if (apl.decisionReason) {
                      <div class="appeal-final">
                        <small>Decided by {{ apl.decidedBy }} on {{ apl.decidedAt | date: 'short' }}:</small>
                        <p class="final-reason">"{{ apl.decisionReason }}"</p>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Right Inspection: Moderator Determination & History -->
              <div class="inspection-col">
                <!-- Moderator Decision Controls -->
                <div class="inspect-card card action-inspect-card">
                  <h4>{{ 'moderation.colDecision' | translate }}</h4>

                  <label class="form-label">
                    <span>{{ 'moderation.violationCategory' | translate }}</span>
                    <select
                      class="form-select"
                      [(ngModel)]="selectedViolationCode"
                      [disabled]="!auth.canModerateCatalog()"
                    >
                      <option value="">{{ 'moderation.compliant' | translate }}</option>
                      <option value="PROHIBITED_WEAPONS_EXPLOSIVES">{{ 'moderation.weapons' | translate }}</option>
                      <option value="PROHIBITED_NARCOTICS">{{ 'moderation.narcotics' | translate }}</option>
                      <option value="PROHIBITED_COUNTERFEIT">{{ 'moderation.counterfeit' | translate }}</option>
                      <option value="PROHIBITED_WILDLIFE_FLORA">{{ 'moderation.wildlife' | translate }}</option>
                      <option value="PROHIBITED_ADULT_CONTENT">{{ 'moderation.explicit' | translate }}</option>
                      <option value="PROHIBITED_HAZARDOUS_MATERIALS">{{ 'moderation.hazardous' | translate }}</option>
                      <option value="PROHIBITED_UNLICENSED_MEDICINE">{{ 'moderation.pharma' | translate }}</option>
                    </select>
                  </label>

                  <label class="form-label">
                    <span>{{ 'moderation.reasonLabel' | translate }}</span>
                    <textarea
                      rows="3"
                      class="form-textarea"
                      [(ngModel)]="decisionReason"
                      [placeholder]="'moderation.reasonPlaceholder' | translate"
                      [disabled]="!auth.canModerateCatalog()"
                    ></textarea>
                  </label>

                  <label class="form-label">
                    <span>{{ 'moderation.evidenceLabel' | translate }}</span>
                    <input
                      type="url"
                      class="form-input"
                      [(ngModel)]="decisionEvidenceUrl"
                      [placeholder]="'moderation.evidencePlaceholder' | translate"
                      [disabled]="!auth.canModerateCatalog()"
                    />
                  </label>

                  <div class="decision-buttons">
                    <button
                      type="button"
                      class="btn btn-outline btn-block"
                      (click)="executeDecision('approve')"
                      [disabled]="!auth.canModerateCatalog() || mutatingAction()"
                    >
                      {{ 'moderation.decisionApprove' | translate }}
                    </button>
                    <button
                      type="button"
                      class="btn btn-outline btn-block"
                      (click)="executeDecision('hold')"
                      [disabled]="!auth.canModerateCatalog() || mutatingAction()"
                    >
                      {{ 'moderation.decisionHold' | translate }}
                    </button>
                    <button
                      type="button"
                      class="btn btn-danger btn-block"
                      (click)="promptTakedownConfirm('reject')"
                      [disabled]="!auth.canModerateCatalog() || decisionReason.trim().length < 10 || mutatingAction()"
                    >
                      {{ 'moderation.decisionReject' | translate }}
                    </button>
                    <button
                      type="button"
                      class="btn btn-danger btn-block"
                      (click)="promptTakedownConfirm('takedown')"
                      [disabled]="!auth.canModerateCatalog() || decisionReason.trim().length < 10 || mutatingAction()"
                    >
                      {{ 'moderation.decisionTakedown' | translate }}
                    </button>
                  </div>

                  @if (!auth.canModerateCatalog()) {
                    <small class="permission-notice">
                      {{ 'support.requiresPermission' | translate }} <code>catalog:moderate</code>.
                    </small>
                  }
                </div>

                <!-- Immutable Compliance Audit History -->
                <div class="inspect-card card history-card">
                  <h4>{{ 'moderation.historyTitle' | translate }}</h4>
                  <div class="history-list">
                    @for (h of p.history; track h.id) {
                      <div class="history-item">
                        <div class="history-item-top">
                          <span class="history-action badge font-mono">{{ h.action }}</span>
                          <span class="history-time">{{ h.timestamp | date: 'short' }}</span>
                        </div>
                        <p class="history-reason">"{{ h.reason }}"</p>
                        <small class="history-actor">Actor: {{ h.actorName }} ({{ h.actorId }})</small>
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>
          }
        </main>
      </div>

      <!-- Takedown Confirmation Modal -->
      @if (showTakedownConfirm() && selectedItem(); as item) {
        <kc-confirm
          [title]="'confirm.takedownTitle' | translate"
          [message]="'confirm.takedownMessage' | translate: { product: item.productName }"
          confirmLabel="Execute Takedown"
          (confirm)="executeConfirmedTakedown()"
          (cancel)="showTakedownConfirm.set(false)"
        />
      }
    </div>
  `,
  styles: [
    `
      .moderation-page {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 0 0 40px;
      }
      .moderation-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
      }
      .eyebrow {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.05em;
        color: #6b7280;
        margin: 0 0 4px;
      }
      .page-title {
        font-size: 22px;
        font-weight: 800;
        margin: 0 0 4px;
      }
      .page-sub {
        font-size: 13px;
        color: #6b7280;
        margin: 0;
      }
      .queue-tabs {
        display: flex;
        gap: 6px;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 4px;
        overflow-x: auto;
      }
      .queue-tab {
        padding: 8px 14px;
        border: 0;
        background: transparent;
        font-size: 13px;
        font-weight: 600;
        color: #6b7280;
        border-radius: 6px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
      }
      .queue-tab.active {
        background: #f3f4f6;
        color: #111827;
      }
      .filters-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        background: #fafafa;
      }
      .search-group {
        flex: 1;
      }
      .search-input {
        width: 100%;
        padding: 6px 10px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 12.5px;
      }
      .clear-btn {
        margin-left: auto;
      }
      .moderation-body {
        display: grid;
        grid-template-columns: 340px 1fr;
        gap: 16px;
        align-items: start;
      }
      .items-list-pane {
        padding: 0;
        max-height: 850px;
        overflow-y: auto;
      }
      .mod-items {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .mod-item {
        padding: 12px 14px;
        border-bottom: 1px solid #f3f4f6;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 6px;
        transition: background 0.15s ease;
      }
      .mod-item:hover {
        background: #f9fafb;
      }
      .mod-item.selected {
        background: #eff6ff;
        border-left: 3px solid #2563eb;
      }
      .mod-item-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
      }
      .product-name {
        font-size: 13px;
        font-weight: 700;
        color: #111827;
        line-height: 1.35;
      }
      .mod-item-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11.5px;
        color: #4b5563;
        flex-wrap: wrap;
      }
      .violation-badge {
        font-size: 10px;
        background: #fee2e2;
        color: #b91c1c;
        padding: 1px 5px;
        border-radius: 3px;
        font-weight: 700;
      }
      .appeal-pending-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        color: #92400e;
        background: #fef3c7;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 600;
        width: fit-content;
      }
      .item-detail-pane {
        padding: 18px 20px;
        min-height: 700px;
      }
      .state-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        text-align: center;
        color: #6b7280;
        gap: 10px;
      }
      .detail-header-block {
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 14px;
        margin-bottom: 18px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .header-row h2 {
        font-size: 18px;
        margin: 0;
        font-weight: 800;
      }
      .header-meta {
        display: flex;
        gap: 16px;
        font-size: 12px;
        color: #4b5563;
        flex-wrap: wrap;
      }
      .inspection-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        align-items: start;
      }
      .inspection-col {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .inspect-card {
        padding: 14px;
        background: #fafafa;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
      }
      .inspect-card h4 {
        margin: 0 0 10px;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        color: #6b7280;
      }
      .photo-strip {
        display: flex;
        gap: 8px;
        overflow-x: auto;
      }
      .inspect-img {
        width: 110px;
        height: 110px;
        object-fit: cover;
        border-radius: 4px;
        border: 1px solid #e5e7eb;
      }
      .violation-box {
        padding: 10px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 4px;
        margin-bottom: 8px;
      }
      .violation-title {
        font-size: 11.5px;
        font-weight: 800;
        color: #991b1b;
      }
      .violation-desc {
        font-size: 12px;
        color: #1f2937;
        margin: 4px 0 0;
      }
      .guidance-box {
        padding: 10px;
        background: #f3f4f6;
        border-radius: 4px;
        font-size: 12px;
      }
      .guidance-label {
        font-weight: 700;
        color: #4b5563;
        display: block;
        margin-bottom: 2px;
      }
      .guidance-text {
        margin: 0;
        color: #374151;
      }
      .appeal-card {
        background: #fffbeb;
        border-color: #fde68a;
      }
      .appeal-status-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        margin-bottom: 8px;
      }
      .appeal-date {
        margin-left: auto;
        font-size: 11px;
        color: #92400e;
      }
      .appeal-quote {
        margin: 4px 0 8px;
        font-size: 12.5px;
        color: #1f2937;
        font-style: italic;
      }
      .appeal-docs {
        font-size: 12px;
        margin-bottom: 12px;
      }
      .appeal-docs ul {
        margin: 4px 0 0;
        padding-left: 20px;
      }
      .doc-link {
        color: #2563eb;
        text-decoration: underline;
      }
      .appeal-btn-row {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }
      .form-label {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 11.5px;
        font-weight: 600;
        margin-bottom: 10px;
      }
      .form-select,
      .form-input,
      .form-textarea {
        width: 100%;
        padding: 6px 8px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 12px;
        background: #fff;
        font-family: inherit;
      }
      .decision-buttons {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 10px;
      }
      .btn-block {
        width: 100%;
      }
      .history-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-height: 300px;
        overflow-y: auto;
      }
      .history-item {
        padding: 8px;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        font-size: 11.5px;
      }
      .history-item-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }
      .history-reason {
        margin: 0 0 2px;
        color: #374151;
      }
      .history-actor {
        color: #9ca3af;
      }
      .permission-notice {
        color: #b91c1c;
        font-size: 10.5px;
        margin-top: 6px;
        display: block;
      }
      @media (max-width: 1000px) {
        .inspection-grid {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 768px) {
        .moderation-body {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class CatalogModerationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly supportService = inject(SupportOperationsService);
  protected readonly auth = inject(AuthService);
  protected readonly translate = inject(TranslateService);

  readonly activeQueue = signal<'flagged' | 'appeals' | 'delisted'>('flagged');
  searchQuery = '';

  readonly loading = signal(true);
  readonly error = signal('');
  readonly items = signal<ModerationProductItem[]>([]);
  readonly selectedItem = signal<ModerationProductItem | null>(null);

  readonly mutatingAction = signal(false);
  decisionReason = '';
  selectedViolationCode: ProhibitedTaxonomyCode | '' = '';
  decisionEvidenceUrl = '';
  appealDecisionReason = '';

  pendingTakedownDecision: 'reject' | 'takedown' | null = null;
  readonly showTakedownConfirm = signal(false);

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const q = params.get('queue') as any;
      if (q === 'appeals' || q === 'delisted' || q === 'flagged') {
        this.activeQueue.set(q);
      }
      this.searchQuery = params.get('search') || '';
      const idParam = params.get('id');

      this.fetchItems(idParam);
    });
  }

  async fetchItems(selectId?: string | null): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    const filter: ModerationFilter = {
      queue: this.activeQueue(),
      search: this.searchQuery || undefined,
    };

    try {
      const res = await firstValueFrom(this.supportService.listModerationItems(filter));
      this.items.set(res.items || []);

      if (selectId) {
        const found = res.items.find((i) => i.id === selectId || i.productId === selectId);
        if (found) {
          this.selectItem(found);
          return;
        }
      }

      if (res.items.length > 0 && !this.selectedItem()) {
        this.selectItem(res.items[0]);
      }
    } catch (err: any) {
      this.error.set(err?.message || 'Failed to load moderation items.');
    } finally {
      this.loading.set(false);
    }
  }

  reloadItems(): void {
    this.fetchItems(this.selectedItem()?.id);
  }

  switchQueue(queue: 'flagged' | 'appeals' | 'delisted'): void {
    this.activeQueue.set(queue);
    this.updateQueryParams();
  }

  onSearchChange(): void {
    this.updateQueryParams();
  }

  clearFilters(): void {
    this.activeQueue.set('flagged');
    this.searchQuery = '';
    this.updateQueryParams();
  }

  private updateQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        queue: this.activeQueue() === 'flagged' ? null : this.activeQueue(),
        search: this.searchQuery.trim() || null,
      },
      queryParamsHandling: 'merge',
    });
  }

  selectItem(item: ModerationProductItem): void {
    this.selectedItem.set(item);
    this.decisionReason = '';
    this.selectedViolationCode = item.violationCode || '';
    this.decisionEvidenceUrl = '';
    this.appealDecisionReason = '';
  }

  promptTakedownConfirm(decision: 'reject' | 'takedown'): void {
    this.pendingTakedownDecision = decision;
    this.showTakedownConfirm.set(true);
  }

  async executeConfirmedTakedown(): Promise<void> {
    if (!this.pendingTakedownDecision) return;
    const dec = this.pendingTakedownDecision;
    this.showTakedownConfirm.set(false);
    await this.executeDecision(dec);
  }

  async executeDecision(decision: 'approve' | 'hold' | 'reject' | 'takedown'): Promise<void> {
    const item = this.selectedItem();
    if (!item || this.mutatingAction()) return;

    this.mutatingAction.set(true);
    try {
      const reason = this.decisionReason.trim() || (decision === 'approve' ? 'Listing cleared after manual compliance verification.' : 'Product held for review.');
      const updated = await firstValueFrom(
        this.supportService.decideModeration(
          item.id,
          decision,
          reason,
          this.selectedViolationCode || undefined,
          this.decisionEvidenceUrl.trim() || undefined,
        ),
      );
      this.selectedItem.set(updated);
      this.items.update((list) => list.map((i) => (i.id === item.id ? updated : i)));
      this.decisionReason = '';
    } finally {
      this.mutatingAction.set(false);
    }
  }

  async executeAppealDecision(decision: 'approved' | 'rejected'): Promise<void> {
    const item = this.selectedItem();
    if (!item || !this.appealDecisionReason.trim() || this.mutatingAction()) return;

    this.mutatingAction.set(true);
    try {
      const updated = await firstValueFrom(
        this.supportService.reviewAppeal(item.id, decision, this.appealDecisionReason.trim()),
      );
      this.selectedItem.set(updated);
      this.items.update((list) => list.map((i) => (i.id === item.id ? updated : i)));
      this.appealDecisionReason = '';
    } finally {
      this.mutatingAction.set(false);
    }
  }
}
