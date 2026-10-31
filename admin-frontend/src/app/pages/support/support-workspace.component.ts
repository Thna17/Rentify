// admin-frontend/src/app/pages/support/support-workspace.component.ts
// P5-SUP-002: Accessible, bilingual Admin Support Case Workspace.
// Features deep-linkable filters, SLA breach monitoring, linked Commerce facts,
// safe evidence viewer, public & internal communication streams, and binding dispute actions.

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslateService } from '../../core/i18n/translate.service';
import {
  AuthoritativeCommerceFacts,
  CasePriority,
  CaseStatus,
  ResolutionOutcome,
  SupportCase,
  SupportCaseFilter,
} from '../../core/support/support-operations.models';
import { SupportOperationsService } from '../../services/support-operations.service';
import { BadgeComponent } from '../../ui/badge.component';
import { ConfirmComponent } from '../../ui/confirm.component';
import { IconComponent } from '../../ui/icon.component';

@Component({
  selector: 'app-support-workspace',
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
    <div class="workspace-page" role="main" aria-labelledby="page-title">
      <!-- Header -->
      <header class="workspace-header">
        <div>
          <p class="eyebrow">{{ 'support.eyebrow' | translate }}</p>
          <h1 id="page-title" class="page-title">{{ 'support.title' | translate }}</h1>
          <p class="page-sub">{{ 'support.subtitle' | translate }}</p>
        </div>
        <div class="header-actions">
          <button
            type="button"
            class="btn btn-outline btn-sm"
            (click)="reloadCases()"
            [disabled]="loading()"
            [attr.aria-label]="'support.refreshCases' | translate"
          >
            <kc-icon name="swap" [size]="14" />
            <span>{{ 'nav.refresh' | translate }}</span>
          </button>
        </div>
      </header>

      <!-- Queue Selection Tabs -->
      <nav class="queue-tabs" [attr.aria-label]="'support.queues' | translate">
        <button
          type="button"
          class="queue-tab"
          [class.active]="activeQueue() === 'all'"
          (click)="switchQueue('all')"
        >
          {{ 'support.queueAll' | translate }}
        </button>
        <button
          type="button"
          class="queue-tab tab-breached"
          [class.active]="activeQueue() === 'breached'"
          (click)="switchQueue('breached')"
        >
          <span class="breach-dot"></span>
          {{ 'support.queueBreached' | translate }} ({{ breachedCount() }})
        </button>
        <button
          type="button"
          class="queue-tab"
          [class.active]="activeQueue() === 'urgent'"
          (click)="switchQueue('urgent')"
        >
          {{ 'support.queueUrgent' | translate }}
        </button>
        <button
          type="button"
          class="queue-tab"
          [class.active]="activeQueue() === 'tier1'"
          (click)="switchQueue('tier1')"
        >
          {{ 'support.queueTier1' | translate }}
        </button>
        <button
          type="button"
          class="queue-tab"
          [class.active]="activeQueue() === 'tier2'"
          (click)="switchQueue('tier2')"
        >
          {{ 'support.queueTier2' | translate }}
        </button>
        <button
          type="button"
          class="queue-tab"
          [class.active]="activeQueue() === 'resolved'"
          (click)="switchQueue('resolved')"
        >
          {{ 'support.queueResolved' | translate }}
        </button>
      </nav>

      <!-- Filter Controls Strip -->
      <section class="filters-bar card" [attr.aria-label]="'common.filterControls' | translate">
        <div class="filter-group search-group">
          <input
            type="search"
            class="filter-input search-input"
            [placeholder]="'common.search' | translate"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange()"
            [attr.aria-label]="'support.searchCases' | translate"
          />
        </div>

        <div class="filter-group">
          <label class="filter-label">{{ 'support.filterPriority' | translate }}:</label>
          <select
            class="filter-select"
            [(ngModel)]="selectedPriority"
            (ngModelChange)="applyFilters()"
            [attr.aria-label]="'support.filterPriority' | translate"
          >
            <option value="">{{ 'common.all' | translate }}</option>
            <option value="urgent">{{ 'priority.urgent' | translate }}</option>
            <option value="high">{{ 'priority.high' | translate }}</option>
            <option value="normal">{{ 'priority.normal' | translate }}</option>
            <option value="low">{{ 'priority.low' | translate }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">{{ 'support.filterStatus' | translate }}:</label>
          <select
            class="filter-select"
            [(ngModel)]="selectedStatus"
            (ngModelChange)="applyFilters()"
            [attr.aria-label]="'support.filterStatus' | translate"
          >
            <option value="">{{ 'common.all' | translate }}</option>
            <option value="open">{{ 'status.open' | translate }}</option>
            <option value="under_investigation">{{ 'status.under_investigation' | translate }}</option>
            <option value="escalated_to_tier2">{{ 'status.escalated_to_tier2' | translate }}</option>
            <option value="resolved">{{ 'status.resolved' | translate }}</option>
            <option value="dismissed">{{ 'status.dismissed' | translate }}</option>
            <option value="reopened">{{ 'status.reopened' | translate }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">{{ 'support.filterDeadline' | translate }}:</label>
          <select
            class="filter-select"
            [(ngModel)]="selectedDeadline"
            (ngModelChange)="applyFilters()"
            [attr.aria-label]="'support.filterDeadline' | translate"
          >
            <option value="all">{{ 'support.deadlineAll' | translate }}</option>
            <option value="overdue">{{ 'support.deadlineOverdue' | translate }}</option>
            <option value="at_risk">{{ 'support.deadlineAtRisk' | translate }}</option>
            <option value="active">{{ 'support.deadlineActive' | translate }}</option>
          </select>
        </div>

        <button
          type="button"
          class="btn btn-ghost btn-sm clear-btn"
          (click)="clearFilters()"
          [title]="'support.resetFilters' | translate"
        >
          {{ 'common.clearFilters' | translate }}
        </button>
      </section>

      <!-- Main Master-Detail Workspace Layout -->
      <div class="workspace-body">
        <!-- Left: Case List Master Pane -->
        <aside class="case-list-pane card" [attr.aria-label]="'support.caseList' | translate">
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
              <button type="button" class="btn btn-outline btn-sm" (click)="reloadCases()">
                {{ 'common.retry' | translate }}
              </button>
            </div>
          } @else if (cases().length === 0) {
            <div class="state-box empty-box">
              <kc-icon name="flag" [size]="28" />
              <h3>{{ 'common.emptyTitle' | translate }}</h3>
              <p>{{ 'common.emptyDesc' | translate }}</p>
            </div>
          } @else {
            <ul class="case-items" role="listbox" [attr.aria-label]="'support.caseListLabel' | translate">
              @for (c of cases(); track c.id) {
                <li
                  class="case-item"
                  [class.selected]="selectedCase()?.id === c.id"
                  [class.item-breached]="c.slaRisk === 'breached'"
                  (click)="selectCase(c)"
                  (keydown.enter)="selectCase(c)"
                  (keydown.space)="selectCase(c)"
                  tabindex="0"
                  role="option"
                  [attr.aria-selected]="selectedCase()?.id === c.id"
                >
                  <div class="case-item-header">
                    <span class="case-number font-mono">#{{ c.caseNumber }}</span>
                    <span
                      class="sla-pill"
                      [class.pill-breached]="c.slaRisk === 'breached'"
                      [class.pill-at-risk]="c.slaRisk === 'at_risk'"
                      [class.pill-normal]="c.slaRisk === 'normal'"
                    >
                      @if (c.slaRemainingHours < 0) {
                        {{ 'sla.overdueBy' | translate: { hours: Math.abs(c.slaRemainingHours) } }}
                      } @else {
                        {{ 'sla.remaining' | translate: { hours: c.slaRemainingHours } }}
                      }
                    </span>
                  </div>

                  <h4 class="case-title">{{ c.title }}</h4>

                  <div class="case-meta">
                    <span class="meta-tag">{{ c.storeName || 'Merchant' }}</span>
                    <span class="meta-tag font-semibold">Tier {{ c.tier }}</span>
                    <kc-badge [value]="c.status" />
                    <span class="priority-tag" [class]="'priority-' + c.priority">
                      {{ c.priority }}
                    </span>
                  </div>
                </li>
              }
            </ul>
          }
        </aside>

        <!-- Right: Case Detail Console (Three-Column Layout) -->
        <main class="case-detail-pane card" [attr.aria-label]="'support.detailConsole' | translate">
          @if (!selectedCase()) {
            <div class="state-box empty-detail">
              <kc-icon name="grid" [size]="36" />
              <h3>{{ 'support.selectCase' | translate }}</h3>
              <p>{{ 'support.selectCaseHint' | translate }}</p>
            </div>
          } @else if (selectedCase(); as item) {
            <!-- Detail Header Banner -->
            <div class="detail-top-banner">
              <div class="banner-title-block">
                <div class="id-row">
                  <span class="detail-case-num font-mono">#{{ item.caseNumber }}</span>
                  <kc-badge [value]="item.status" />
                  <span class="priority-tag" [class]="'priority-' + item.priority">
                    {{ item.priority }}
                  </span>
                  @if (item.reportReference) {
                    <span class="meta-badge">Report: {{ item.reportReference }}</span>
                  }
                </div>
                <h2>{{ item.title }}</h2>
              </div>

              <!-- SLA Countdown Alert Strip -->
              <div
                class="sla-indicator-strip"
                [class.strip-breached]="item.slaRisk === 'breached'"
                [class.strip-at-risk]="item.slaRisk === 'at_risk'"
              >
                <div class="sla-text">
                  <kc-icon name="shield" [size]="16" />
                  <strong>
                    @if (item.slaRisk === 'breached') {
                      {{ 'sla.breached' | translate }}: {{ 'sla.overdueBy' | translate: { hours: Math.abs(item.slaRemainingHours) } }}
                    } @else if (item.slaRisk === 'at_risk') {
                      {{ 'sla.atRisk' | translate }}: {{ 'sla.remaining' | translate: { hours: item.slaRemainingHours } }}
                    } @else {
                      {{ 'sla.normal' | translate }}: {{ 'sla.remaining' | translate: { hours: item.slaRemainingHours } }}
                    }
                  </strong>
                </div>
                <span class="deadline-date">
                  Deadline: {{ item.serviceDeadline | date: 'medium' }}
                </span>
              </div>
            </div>

            <!-- Three Column Detail Grid -->
            <div class="detail-three-cols">
              <!-- Column 1: Metadata & Commerce Facts -->
              <section class="detail-col col-facts" aria-labelledby="heading-col1">
                <h3 id="heading-col1" class="col-heading">
                  <kc-icon name="cart" [size]="16" />
                  {{ 'support.colMetadata' | translate }}
                </h3>

                <div class="fact-card">
                  <h4>{{ 'support.storeFacts' | translate }}</h4>
                  <div class="fact-item">
                    <span>{{ 'moderation.storeLabel' | translate }}</span>
                    <strong>{{ item.storeName || item.storeId || '—' }}</strong>
                  </div>
                  @if (item.commerceFacts?.storeFacts?.contactEmail; as email) {
                    <div class="fact-item">
                      <span>{{ 'support.emailLabel' | translate }}</span>
                      <code>{{ email }}</code>
                    </div>
                  }
                </div>

                <!-- Authoritative Order Facts -->
                @if (item.commerceFacts?.orderFacts; as ord) {
                  <div class="fact-card order-fact-card">
                    <h4>{{ 'support.orderFacts' | translate }}</h4>
                    <div class="fact-item">
                      <span>{{ 'support.orderLabel' | translate }}</span>
                      <strong class="font-mono">{{ ord.orderNumber }}</strong>
                    </div>
                    <div class="fact-item">
                      <span>{{ 'support.orderAmount' | translate }}:</span>
                      <strong class="text-accent">\${{ ord.totalAmount }}</strong>
                    </div>
                    <div class="fact-item">
                      <span>{{ 'support.orderDelivery' | translate }}:</span>
                      <kc-badge [value]="ord.deliveryStatus" />
                    </div>
                    <div class="fact-item">
                      <span>{{ 'support.orderPayment' | translate }}:</span>
                      <kc-badge [value]="ord.paymentStatus" />
                    </div>
                    @if (ord.deliveredAt) {
                      <div class="fact-item">
                        <span>{{ 'support.orderDeliveredAt' | translate }}:</span>
                        <small>{{ ord.deliveredAt | date: 'short' }}</small>
                      </div>
                    }

                    <!-- Items Purchased -->
                    @if (ord.items && ord.items.length) {
                      <div class="items-summary-list">
                        <small class="text-muted">{{ 'support.orderItems' | translate }}:</small>
                        @for (it of ord.items; track it.productId) {
                          <div class="item-line">
                            <span>{{ it.name }} (×{{ it.quantity }})</span>
                            <strong>\${{ it.price }}</strong>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }

                <!-- Assignee Info -->
                <div class="fact-card">
                  <h4>{{ 'support.assignTitle' | translate }}</h4>
                  <div class="fact-item">
                    <span>{{ 'support.assignedAgent' | translate }}</span>
                    <strong>{{ item.assigneeName || ('support.unassigned' | translate) }}</strong>
                  </div>
                  <div class="fact-item">
                    <span>{{ 'support.currentTier' | translate }}</span>
                    <span class="badge">Tier {{ item.tier }}</span>
                  </div>
                </div>

                <!-- Resolution Snapshot if Closed -->
                @if (item.resolution; as res) {
                  <div class="fact-card resolution-card">
                    <h4>{{ 'support.resolutionTitle' | translate }}</h4>
                    <div class="fact-item">
                      <span>{{ 'support.outcomeLabel' | translate }}</span>
                      <strong class="text-accent">{{ res.outcome }}</strong>
                    </div>
                    <p class="resolution-summary">"{{ res.summary }}"</p>
                    <small class="text-muted">By {{ res.resolvedBy }} on {{ res.resolvedAt | date: 'short' }}</small>
                  </div>
                }
              </section>

              <!-- Column 2: Evidence Gallery & Communication Stream -->
              <section class="detail-col col-stream" aria-labelledby="heading-col2">
                <h3 id="heading-col2" class="col-heading">
                  <kc-icon name="box" [size]="16" />
                  {{ 'support.colEvidence' | translate }}
                </h3>

                <!-- Evidence Gallery -->
                <div class="evidence-box card">
                  <div class="evidence-header">
                    <h4>{{ 'support.evidenceTitle' | translate }} ({{ item.evidence.length }})</h4>
                  </div>

                  @if (item.evidence.length === 0) {
                    <p class="no-evidence-text">{{ 'support.noEvidence' | translate }}</p>
                  } @else {
                    <div class="evidence-grid">
                      @for (ev of item.evidence; track ev.url; let i = $index) {
                        <div class="evidence-card" (click)="openLightbox(ev.url)">
                          <img [src]="ev.url" [alt]="'support.evidencePhoto' | translate" class="evidence-thumb" />
                          <span class="evidence-badge">{{ ev.label }}</span>
                        </div>
                      }
                    </div>
                  }
                </div>

                <!-- Communications & Activity Stream -->
                <div class="stream-box card">
                  <div class="stream-tabs">
                    <button
                      type="button"
                      class="stream-tab"
                      [class.active]="streamTab() === 'all'"
                      (click)="streamTab.set('all')"
                    >
                      {{ 'support.tabAll' | translate }}
                    </button>
                    <button
                      type="button"
                      class="stream-tab"
                      [class.active]="streamTab() === 'public'"
                      (click)="streamTab.set('public')"
                    >
                      {{ 'support.tabPublic' | translate }}
                    </button>
                    <button
                      type="button"
                      class="stream-tab"
                      [class.active]="streamTab() === 'internal'"
                      (click)="streamTab.set('internal')"
                    >
                      {{ 'support.tabInternal' | translate }}
                    </button>
                    <button
                      type="button"
                      class="stream-tab"
                      [class.active]="streamTab() === 'events'"
                      (click)="streamTab.set('events')"
                    >
                      {{ 'support.tabEvents' | translate }}
                    </button>
                  </div>

                  <!-- Messages & Notes List -->
                  <div class="message-feed" role="feed" [attr.aria-label]="'support.messages' | translate">
                    @for (msg of filteredMessages(); track msg.id) {
                      <div class="feed-entry" [class.entry-internal]="msg.isInternal">
                        <div class="entry-header">
                          <span class="sender-name font-semibold">{{ msg.senderName }}</span>
                          <span class="sender-role">{{ msg.senderRole }}</span>
                          @if (msg.isInternal) {
                            <span class="internal-tag">{{ 'support.internalBadge' | translate }}</span>
                          }
                          <span class="entry-time">{{ msg.createdAt | date: 'short' }}</span>
                        </div>
                        <p class="entry-content">{{ msg.content }}</p>
                      </div>
                    }

                    <!-- Event Timeline Entries -->
                    @if (streamTab() === 'all' || streamTab() === 'events') {
                      @for (ev of item.events; track ev.id) {
                        <div class="feed-entry entry-audit-event">
                          <div class="entry-header">
                            <span class="event-type font-mono font-bold">{{ ev.type }}</span>
                            <span class="entry-time">{{ ev.createdAt | date: 'short' }}</span>
                          </div>
                          @if (ev.reason) {
                            <p class="event-reason"><em>{{ 'support.reasonLabel' | translate }}</em> {{ ev.reason }}</p>
                          }
                          <small class="event-actor">Actor: {{ ev.actorName }} ({{ ev.actorRole }})</small>
                        </div>
                      }
                    }
                  </div>

                  <!-- New Message / Note Form -->
                  <form class="stream-compose" (ngSubmit)="sendMessage()">
                    <textarea
                      rows="2"
                      class="compose-textarea"
                      [placeholder]="'support.addNotePrompt' | translate"
                      [(ngModel)]="newMessageText"
                      name="messageContent"
                      [disabled]="postingMessage()"
                    ></textarea>

                    <div class="compose-actions">
                      <label class="internal-toggle">
                        <input
                          type="checkbox"
                          [(ngModel)]="newMessageIsInternal"
                          name="isInternal"
                        />
                        <span>{{ 'support.internalNote' | translate }}</span>
                      </label>

                      <button
                        type="submit"
                        class="btn btn-primary btn-sm"
                        [disabled]="!newMessageText.trim() || postingMessage()"
                      >
                        {{ newMessageIsInternal ? ('support.postNote' | translate) : ('support.postPublic' | translate) }}
                      </button>
                    </div>
                  </form>
                </div>
              </section>

              <!-- Column 3: Operational Actions & Mediation -->
              <section class="detail-col col-actions" aria-labelledby="heading-col3">
                <h3 id="heading-col3" class="col-heading">
                  <kc-icon name="shield" [size]="16" />
                  {{ 'support.colActions' | translate }}
                </h3>

                <!-- Agent Assignment Card -->
                <div class="action-card card">
                  <h4>{{ 'support.assignTitle' | translate }}</h4>
                  <div class="assign-row">
                    <select
                      class="form-select"
                      [(ngModel)]="assigneeSelection"
                      [disabled]="!auth.canWriteSupport()"
                    >
                      <option value="unassigned">{{ 'support.unassigned' | translate }}</option>
                      <option value="adm-usr-lead">Sokha Meng (Senior Lead)</option>
                      <option value="adm-usr-agent">Dara Chan (Dispute Specialist)</option>
                      <option value="adm-usr-vathana">Chann Vathana (Support Agent)</option>
                    </select>
                    <button
                      type="button"
                      class="btn btn-outline btn-sm"
                      (click)="executeAssignment()"
                      [disabled]="!auth.canWriteSupport() || mutatingAction()"
                    >
                      {{ 'common.save' | translate }}
                    </button>
                  </div>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs assign-me-btn"
                    (click)="assignToMe()"
                    [disabled]="!auth.canWriteSupport() || mutatingAction()"
                  >
                    {{ 'support.assignMe' | translate }}
                  </button>
                </div>

                <!-- Priority Modification -->
                <div class="action-card card">
                  <h4>{{ 'support.changePriority' | translate }}</h4>
                  <div class="assign-row">
                    <select
                      class="form-select"
                      [(ngModel)]="prioritySelection"
                      [disabled]="!auth.canWriteSupport()"
                    >
                      <option value="low">{{ 'priority.low' | translate }}</option>
                      <option value="normal">{{ 'priority.normal' | translate }}</option>
                      <option value="high">{{ 'priority.high' | translate }}</option>
                      <option value="urgent">{{ 'priority.urgent' | translate }}</option>
                    </select>
                    <button
                      type="button"
                      class="btn btn-outline btn-sm"
                      (click)="executePriorityChange()"
                      [disabled]="!auth.canWriteSupport() || mutatingAction()"
                    >
                      {{ 'common.save' | translate }}
                    </button>
                  </div>
                </div>

                <!-- Tier 2 Escalation (if in Tier 1) -->
                @if (item.tier === 1 && item.status !== 'resolved') {
                  <div class="action-card card alert-card">
                    <h4>{{ 'support.escalateTitle' | translate }}</h4>
                    <p class="action-desc">
                      {{ 'support.escalateHint' | translate }}
                    </p>
                    <textarea
                      rows="2"
                      class="form-textarea"
                      [(ngModel)]="escalateReason"
                      [placeholder]="'support.escalateReason' | translate"
                      [disabled]="!auth.canWriteSupport()"
                    ></textarea>
                    <button
                      type="button"
                      class="btn btn-primary btn-sm btn-block"
                      (click)="executeEscalation()"
                      [disabled]="!auth.canWriteSupport() || !escalateReason.trim() || mutatingAction()"
                    >
                      {{ 'support.escalateBtn' | translate }}
                    </button>
                  </div>
                }

                <!-- Binding Dispute Resolution -->
                @if (item.status !== 'resolved' && item.status !== 'dismissed') {
                  <div class="action-card card resolve-card">
                    <h4>{{ 'support.resolveTitle' | translate }}</h4>
                    <p class="action-desc">
                      {{ 'support.bindingNote' | translate }} <code>support:dispute:resolve</code>.
                    </p>

                    <label class="form-label">
                      <span>{{ 'support.resolveOutcome' | translate }} *</span>
                      <select class="form-select" [(ngModel)]="resolveOutcome">
                        <option value="refund_ordered">{{ 'support.outcomeRefund' | translate }}</option>
                        <option value="claim_rejected">{{ 'support.outcomeClaimRejected' | translate }}</option>
                        <option value="seller_fault">{{ 'support.outcomeSellerFault' | translate }}</option>
                        <option value="buyer_fault">{{ 'support.outcomeBuyerFault' | translate }}</option>
                        <option value="mediated_settlement">{{ 'support.outcomeSettlement' | translate }}</option>
                        <option value="dismissed">{{ 'support.outcomeDismiss' | translate }}</option>
                      </select>
                    </label>

                    <label class="form-label">
                      <span>{{ 'support.resolveSummaryLabel' | translate }}</span>
                      <textarea
                        rows="3"
                        class="form-textarea"
                        [(ngModel)]="resolveSummary"
                        [placeholder]="'support.resolveSummaryPlaceholder' | translate"
                      ></textarea>
                    </label>

                    <button
                      type="button"
                      class="btn btn-primary btn-block btn-resolve"
                      (click)="promptResolveConfirm()"
                      [disabled]="!auth.canResolveDisputes() || resolveSummary.trim().length < 15 || mutatingAction()"
                    >
                      {{ 'support.resolveBtn' | translate }}
                    </button>

                    @if (!auth.canResolveDisputes()) {
                      <small class="permission-notice">
                        {{ 'support.requiresPermission' | translate }} <code>support:dispute:resolve</code>.
                      </small>
                    }
                  </div>
                }

                <!-- Reopen Case (if resolved or dismissed) -->
                @if (item.status === 'resolved' || item.status === 'dismissed') {
                  <div class="action-card card reopen-card">
                    <h4>{{ 'support.reopenTitle' | translate }}</h4>
                    <p class="action-desc">
                      {{ 'support.reopenHint' | translate }}
                    </p>
                    <textarea
                      rows="2"
                      class="form-textarea"
                      [(ngModel)]="reopenReason"
                      [placeholder]="'support.reopenReasonPlaceholder' | translate"
                    ></textarea>
                    <button
                      type="button"
                      class="btn btn-outline btn-block"
                      (click)="promptReopenConfirm()"
                      [disabled]="!auth.canResolveDisputes() || !reopenReason.trim() || mutatingAction()"
                    >
                      {{ 'support.reopenBtn' | translate }}
                    </button>
                  </div>
                }
              </section>
            </div>
          }
        </main>
      </div>

      <!-- Evidence Photo Lightbox Modal -->
      @if (lightboxUrl()) {
        <div class="lightbox-backdrop" (click)="lightboxUrl.set(null)" role="presentation">
          <div class="lightbox-container" (click)="$event.stopPropagation()">
            <button
              type="button"
              class="lightbox-close-btn"
              (click)="lightboxUrl.set(null)"
              [attr.aria-label]="'support.closePhoto' | translate"
            >
              ×
            </button>
            <img [src]="lightboxUrl()" [alt]="'support.enlargedPhoto' | translate" class="lightbox-img" />
          </div>
        </div>
      }

      <!-- Destructive Resolution Confirmation Modal -->
      @if (showResolveConfirm()) {
        <kc-confirm
          [title]="'confirm.resolveTitle' | translate"
          [message]="'confirm.resolveMessage' | translate: { outcome: resolveOutcome }"
          confirmLabel="Execute Determination"
          (confirm)="executeResolution()"
          (cancel)="showResolveConfirm.set(false)"
        />
      }

      <!-- Reopen Confirmation Modal -->
      @if (showReopenConfirm() && selectedCase(); as c) {
        <kc-confirm
          [title]="'confirm.reopenTitle' | translate"
          [message]="'confirm.reopenMessage' | translate: { caseNumber: c.caseNumber }"
          confirmLabel="Reopen Case"
          (confirm)="executeReopen()"
          (cancel)="showReopenConfirm.set(false)"
        />
      }
    </div>
  `,
  styles: [
    `
      .workspace-page {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 0 0 40px;
      }
      .workspace-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
      }
      .eyebrow {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.05em;
        color: var(--color-muted, #6b7280);
        margin: 0 0 4px;
      }
      .page-title {
        font-size: 22px;
        font-weight: 800;
        margin: 0 0 4px;
      }
      .page-sub {
        font-size: 13px;
        color: var(--color-muted, #6b7280);
        margin: 0;
      }
      .queue-tabs {
        display: flex;
        gap: 6px;
        border-bottom: 1px solid var(--color-border, #e5e7eb);
        padding-bottom: 4px;
        overflow-x: auto;
      }
      .queue-tab {
        padding: 8px 14px;
        border: 0;
        background: transparent;
        font-size: 13px;
        font-weight: 600;
        color: var(--color-muted, #6b7280);
        border-radius: var(--radius-sm, 6px);
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
      .tab-breached {
        color: #b91c1c;
      }
      .breach-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #ef4444;
      }
      .filters-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        flex-wrap: wrap;
        background: #fafafa;
      }
      .filter-group {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .search-group {
        flex: 1;
        min-width: 220px;
      }
      .filter-label {
        font-size: 12px;
        color: var(--color-muted, #6b7280);
        font-weight: 500;
      }
      .filter-input,
      .filter-select {
        padding: 6px 10px;
        border: 1px solid var(--color-border, #d1d5db);
        border-radius: 4px;
        font-size: 12.5px;
        background: #fff;
      }
      .search-input {
        width: 100%;
      }
      .clear-btn {
        margin-left: auto;
      }
      .workspace-body {
        display: grid;
        grid-template-columns: 340px 1fr;
        gap: 16px;
        align-items: start;
      }
      .case-list-pane {
        padding: 0;
        max-height: 850px;
        overflow-y: auto;
      }
      .case-items {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .case-item {
        padding: 12px 14px;
        border-bottom: 1px solid var(--color-border, #f3f4f6);
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 6px;
        transition: background 0.15s ease;
      }
      .case-item:hover {
        background: #f9fafb;
      }
      .case-item.selected {
        background: #eff6ff;
        border-left: 3px solid #2563eb;
      }
      .case-item.item-breached {
        border-left: 3px solid #ef4444;
      }
      .case-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .case-number {
        font-size: 12px;
        font-weight: 700;
        color: #374151;
      }
      .sla-pill {
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 600;
      }
      .pill-normal {
        background: #ecfdf5;
        color: #065f46;
      }
      .pill-at-risk {
        background: #fffbeb;
        color: #92400e;
      }
      .pill-breached {
        background: #fef2f2;
        color: #991b1b;
      }
      .case-title {
        font-size: 13.5px;
        margin: 0;
        font-weight: 600;
        color: #111827;
        line-height: 1.35;
      }
      .case-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        font-size: 11.5px;
      }
      .meta-tag {
        color: #4b5563;
      }
      .priority-tag {
        font-size: 10px;
        text-transform: uppercase;
        font-weight: 700;
        padding: 1px 5px;
        border-radius: 3px;
      }
      .priority-urgent {
        background: #fee2e2;
        color: #b91c1c;
      }
      .priority-high {
        background: #fef3c7;
        color: #b45309;
      }
      .priority-normal {
        background: #f3f4f6;
        color: #4b5563;
      }
      .priority-low {
        background: #f9fafb;
        color: #6b7280;
      }
      .case-detail-pane {
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
      .detail-top-banner {
        border-bottom: 1px solid var(--color-border, #e5e7eb);
        padding-bottom: 14px;
        margin-bottom: 18px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .id-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 4px;
      }
      .detail-case-num {
        font-size: 15px;
        font-weight: 800;
      }
      .meta-badge {
        font-size: 11px;
        padding: 2px 7px;
        background: #f3f4f6;
        border-radius: 4px;
        color: #4b5563;
      }
      .banner-title-block h2 {
        font-size: 18px;
        margin: 0;
        font-weight: 750;
      }
      .sla-indicator-strip {
        padding: 8px 12px;
        border-radius: 4px;
        background: #ecfdf5;
        color: #065f46;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12.5px;
      }
      .strip-at-risk {
        background: #fffbeb;
        color: #92400e;
      }
      .strip-breached {
        background: #fef2f2;
        color: #991b1b;
      }
      .sla-text {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .detail-three-cols {
        display: grid;
        grid-template-columns: 280px 1fr 280px;
        gap: 16px;
        align-items: start;
      }
      .col-heading {
        font-size: 13.5px;
        font-weight: 700;
        margin: 0 0 12px;
        display: flex;
        align-items: center;
        gap: 6px;
        padding-bottom: 6px;
        border-bottom: 2px solid #f3f4f6;
      }
      .fact-card,
      .action-card {
        padding: 12px;
        border: 1px solid var(--color-border, #e5e7eb);
        border-radius: var(--radius-sm, 6px);
        margin-bottom: 12px;
        background: #fafafa;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .fact-card h4,
      .action-card h4 {
        margin: 0 0 4px;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #6b7280;
      }
      .fact-item {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
      }
      .fact-item span {
        color: #6b7280;
      }
      .items-summary-list {
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px dashed #e5e7eb;
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 11.5px;
      }
      .item-line {
        display: flex;
        justify-content: space-between;
      }
      .evidence-box,
      .stream-box {
        padding: 12px;
        margin-bottom: 14px;
      }
      .evidence-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
        gap: 8px;
        margin-top: 8px;
      }
      .evidence-card {
        position: relative;
        cursor: pointer;
        border-radius: 4px;
        overflow: hidden;
        border: 1px solid #e5e7eb;
        aspect-ratio: 1;
      }
      .evidence-thumb {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .evidence-badge {
        position: absolute;
        bottom: 2px;
        left: 2px;
        right: 2px;
        background: rgba(0, 0, 0, 0.65);
        color: #fff;
        font-size: 9px;
        padding: 1px 3px;
        text-align: center;
        border-radius: 2px;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
      }
      .stream-tabs {
        display: flex;
        gap: 4px;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 6px;
        margin-bottom: 10px;
      }
      .stream-tab {
        border: 0;
        background: transparent;
        font-size: 11.5px;
        font-weight: 600;
        color: #6b7280;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
      }
      .stream-tab.active {
        background: #f3f4f6;
        color: #111827;
      }
      .message-feed {
        max-height: 380px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding-right: 4px;
      }
      .feed-entry {
        padding: 8px 10px;
        border-radius: 4px;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        font-size: 12px;
      }
      .entry-internal {
        background: #fffbeb;
        border-color: #fde68a;
      }
      .entry-audit-event {
        background: #f3f4f6;
        border-style: dashed;
        font-size: 11.5px;
      }
      .entry-header {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 4px;
      }
      .internal-tag {
        font-size: 10px;
        font-weight: 700;
        background: #fef08a;
        color: #854d0e;
        padding: 1px 4px;
        border-radius: 3px;
      }
      .entry-time {
        margin-left: auto;
        font-size: 10.5px;
        color: #9ca3af;
      }
      .entry-content {
        margin: 0;
        line-height: 1.4;
      }
      .stream-compose {
        margin-top: 10px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .compose-textarea,
      .form-textarea {
        width: 100%;
        padding: 8px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 12px;
        font-family: inherit;
      }
      .compose-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .internal-toggle {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11.5px;
        color: #4b5563;
        cursor: pointer;
      }
      .assign-row {
        display: flex;
        gap: 6px;
      }
      .form-select {
        flex: 1;
        padding: 6px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 12px;
        background: #fff;
      }
      .assign-me-btn {
        margin-top: 4px;
        align-self: flex-start;
      }
      .form-label {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 11.5px;
        font-weight: 600;
        margin-bottom: 6px;
      }
      .action-desc {
        font-size: 11.5px;
        color: #6b7280;
        margin: 0 0 6px;
      }
      .btn-block {
        width: 100%;
      }
      .permission-notice {
        color: #b91c1c;
        font-size: 10.5px;
        margin-top: 4px;
        display: block;
      }
      .lightbox-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.75);
        display: grid;
        place-items: center;
        z-index: 100;
      }
      .lightbox-container {
        position: relative;
        max-width: 90vw;
        max-height: 90vh;
      }
      .lightbox-img {
        max-width: 100%;
        max-height: 85vh;
        border-radius: 4px;
      }
      .lightbox-close-btn {
        position: absolute;
        top: -30px;
        right: 0;
        background: transparent;
        color: #fff;
        border: 0;
        font-size: 28px;
        cursor: pointer;
      }
      @media (max-width: 1100px) {
        .detail-three-cols {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 768px) {
        .workspace-body {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class SupportWorkspaceComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly supportService = inject(SupportOperationsService);
  protected readonly auth = inject(AuthService);
  protected readonly translate = inject(TranslateService);

  readonly Math = Math;

  // Filter signals
  readonly activeQueue = signal<string>('all');
  searchQuery = '';
  selectedPriority = '';
  selectedStatus = '';
  selectedDeadline = 'all';

  // State signals
  readonly loading = signal(true);
  readonly error = signal('');
  readonly cases = signal<SupportCase[]>([]);
  readonly selectedCase = signal<SupportCase | null>(null);
  readonly streamTab = signal<'all' | 'public' | 'internal' | 'events'>('all');

  // Mutation states
  readonly mutatingAction = signal(false);
  readonly postingMessage = signal(false);
  newMessageText = '';
  newMessageIsInternal = true;

  assigneeSelection = 'unassigned';
  prioritySelection = 'normal';
  escalateReason = '';
  resolveOutcome: ResolutionOutcome = 'refund_ordered';
  resolveSummary = '';
  reopenReason = '';

  // Modals & Lightbox
  readonly lightboxUrl = signal<string | null>(null);
  readonly showResolveConfirm = signal(false);
  readonly showReopenConfirm = signal(false);

  readonly breachedCount = computed(() => {
    return this.cases().filter((c) => c.slaRisk === 'breached').length;
  });

  readonly filteredMessages = computed(() => {
    const sc = this.selectedCase();
    if (!sc) return [];
    const tab = this.streamTab();
    if (tab === 'public') return sc.messages.filter((m) => !m.isInternal);
    if (tab === 'internal') return sc.messages.filter((m) => m.isInternal);
    if (tab === 'events') return [];
    return sc.messages;
  });

  ngOnInit(): void {
    // Read deep-linkable query parameters
    this.route.queryParamMap.subscribe((params) => {
      this.activeQueue.set(params.get('queue') || 'all');
      this.selectedPriority = params.get('priority') || '';
      this.selectedStatus = params.get('status') || '';
      this.selectedDeadline = params.get('deadline') || 'all';
      this.searchQuery = params.get('search') || '';
      const caseIdParam = params.get('caseId');

      this.fetchCases(caseIdParam);
    });
  }

  async fetchCases(selectCaseId?: string | null): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    const filter: SupportCaseFilter = {
      queue: this.activeQueue() as any,
      priority: this.selectedPriority || undefined,
      status: this.selectedStatus || undefined,
      deadline: this.selectedDeadline as any,
      search: this.searchQuery || undefined,
    };

    try {
      const res = await firstValueFrom(this.supportService.listSupportCases(filter));
      this.cases.set(res.cases || []);

      if (selectCaseId) {
        const found = res.cases.find((c) => c.id === selectCaseId || c.caseNumber === selectCaseId);
        if (found) {
          this.selectCase(found);
          return;
        }
      }

      if (res.cases.length > 0 && !this.selectedCase()) {
        this.selectCase(res.cases[0]);
      }
    } catch (err: any) {
      this.error.set(err?.message || 'Failed to load support cases.');
    } finally {
      this.loading.set(false);
    }
  }

  reloadCases(): void {
    this.fetchCases(this.selectedCase()?.id);
  }

  switchQueue(queue: string): void {
    this.activeQueue.set(queue);
    this.updateQueryParams();
  }

  setQueue(queue: string): void {
    this.switchQueue(queue);
  }

  onSearchChange(): void {
    this.updateQueryParams();
  }

  applyFilters(): void {
    this.updateQueryParams();
  }

  clearFilters(): void {
    this.activeQueue.set('all');
    this.searchQuery = '';
    this.selectedPriority = '';
    this.selectedStatus = '';
    this.selectedDeadline = 'all';
    this.updateQueryParams();
  }

  private updateQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        queue: this.activeQueue() === 'all' ? null : this.activeQueue(),
        priority: this.selectedPriority || null,
        status: this.selectedStatus || null,
        deadline: this.selectedDeadline === 'all' ? null : this.selectedDeadline,
        search: this.searchQuery.trim() || null,
      },
      queryParamsHandling: 'merge',
    });
  }

  async selectCase(c: SupportCase): Promise<void> {
    this.selectedCase.set(c);
    this.assigneeSelection = c.assigneeId || 'unassigned';
    this.prioritySelection = c.priority;
    this.escalateReason = '';
    this.resolveSummary = '';
    this.reopenReason = '';

    if (!c.commerceFacts && (c.reportReference || c.orderId)) {
      try {
        const facts = await firstValueFrom(
          this.supportService.getCommerceFacts(c.id, c.reportReference || undefined),
        );
        c.commerceFacts = facts;
        this.selectedCase.set({ ...c });
      } catch {}
    }
  }

  openLightbox(url: string): void {
    this.lightboxUrl.set(url);
  }

  closeLightbox(): void {
    this.lightboxUrl.set(null);
  }

  async sendMessage(): Promise<void> {
    const sc = this.selectedCase();
    if (!sc || !this.newMessageText.trim() || this.postingMessage()) return;

    this.postingMessage.set(true);
    try {
      const msg = await firstValueFrom(
        this.supportService.addMessage(sc.id, this.newMessageText.trim(), this.newMessageIsInternal),
      );
      this.newMessageText = '';
      // Refresh current case facts
      await this.refreshSelectedCase(sc.id);
    } finally {
      this.postingMessage.set(false);
    }
  }

  async executeAssignment(): Promise<void> {
    const sc = this.selectedCase();
    if (!sc || this.mutatingAction()) return;

    const names: Record<string, string> = {
      'adm-usr-lead': 'Sokha Meng (Senior Lead)',
      'adm-usr-agent': 'Dara Chan (Dispute Specialist)',
      'adm-usr-vathana': 'Chann Vathana (Support Agent)',
      unassigned: 'Unassigned',
    };

    const targetName = names[this.assigneeSelection] || 'Agent';

    this.mutatingAction.set(true);
    try {
      await firstValueFrom(this.supportService.assignCase(sc.id, this.assigneeSelection, targetName));
      await this.refreshSelectedCase(sc.id);
    } finally {
      this.mutatingAction.set(false);
    }
  }

  assignToMe(): void {
    const user = this.auth.user();
    if (!user) return;
    this.assigneeSelection = user.id;
    this.executeAssignment();
  }

  async executePriorityChange(): Promise<void> {
    const sc = this.selectedCase();
    if (!sc || this.mutatingAction()) return;

    this.mutatingAction.set(true);
    try {
      await firstValueFrom(this.supportService.updatePriority(sc.id, this.prioritySelection as CasePriority));
      await this.refreshSelectedCase(sc.id);
    } finally {
      this.mutatingAction.set(false);
    }
  }

  async executeEscalation(): Promise<void> {
    const sc = this.selectedCase();
    if (!sc || !this.escalateReason.trim() || this.mutatingAction()) return;

    this.mutatingAction.set(true);
    try {
      await firstValueFrom(this.supportService.escalateCase(sc.id, this.escalateReason.trim()));
      this.escalateReason = '';
      await this.refreshSelectedCase(sc.id);
    } finally {
      this.mutatingAction.set(false);
    }
  }

  promptResolveConfirm(): void {
    this.showResolveConfirm.set(true);
  }

  async executeResolution(): Promise<void> {
    const sc = this.selectedCase();
    if (!sc || !this.resolveSummary.trim() || this.mutatingAction()) return;

    this.showResolveConfirm.set(false);
    this.mutatingAction.set(true);
    try {
      await firstValueFrom(
        this.supportService.resolveCase(sc.id, this.resolveOutcome, this.resolveSummary.trim()),
      );
      this.resolveSummary = '';
      await this.refreshSelectedCase(sc.id);
    } finally {
      this.mutatingAction.set(false);
    }
  }

  promptReopenConfirm(): void {
    this.showReopenConfirm.set(true);
  }

  async executeReopen(): Promise<void> {
    const sc = this.selectedCase();
    if (!sc || !this.reopenReason.trim() || this.mutatingAction()) return;

    this.showReopenConfirm.set(false);
    this.mutatingAction.set(true);
    try {
      await firstValueFrom(this.supportService.reopenCase(sc.id, this.reopenReason.trim()));
      this.reopenReason = '';
      await this.refreshSelectedCase(sc.id);
    } finally {
      this.mutatingAction.set(false);
    }
  }

  private async refreshSelectedCase(id: string): Promise<void> {
    try {
      const updated = await firstValueFrom(this.supportService.getSupportCase(id));
      this.selectedCase.set(updated);
      this.cases.update((list) => list.map((c) => (c.id === id ? updated : c)));
    } catch {}
  }
}
