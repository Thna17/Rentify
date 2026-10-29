// admin-frontend/src/app/services/support-operations.service.ts
// P5-SUP-002: Operations service for Support Cases, Authoritative Commerce Facts,
// Catalog Moderation, and Maker-Checker Dual Verification.
// Uses typed contract adapters with realistic fixtures where Core endpoints are being orchestrated.

import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { RentifyAdminService } from '../core/rentify/rentify-admin.service';
import { AuthService } from '../core/auth/auth.service';
import {
  AuthoritativeCommerceFacts,
  CaseMessage,
  CasePriority,
  CaseStatus,
  MakerCheckerItem,
  ModerationFilter,
  ModerationProductItem,
  ResolutionOutcome,
  SupportCase,
  SupportCaseFilter,
} from '../core/support/support-operations.models';

// Initial contract fixture dataset adhering to Phase 5 SupportCase & Moderation schemas
const FIXTURE_SUPPORT_CASES: SupportCase[] = [
  {
    id: 'cas-001-silk-tear',
    caseNumber: 'CAS-20261028-0001',
    title: 'Damaged Silk Fabric on Delivery',
    subjectType: 'order',
    subjectId: 'ord-uuid-silk-99',
    orderId: 'ord-uuid-silk-99',
    storeId: 'store-angkor-silk',
    storeName: 'Angkor Heritage Silk',
    buyerId: 'usr-buyer-dara',
    buyerName: 'Dara Sok',
    status: 'escalated_to_tier2',
    priority: 'urgent',
    tier: 2,
    assigneeId: null,
    assigneeName: null,
    serviceDeadline: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), // 4h overdue
    isOverdue: true,
    slaRisk: 'breached',
    slaRemainingHours: -4,
    reportReference: 'RPT-20261028-0001',
    createdAt: new Date(Date.now() - 52 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    evidence: [
      {
        url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800',
        label: 'damage',
        type: 'photo',
        uploadedAt: new Date(Date.now() - 52 * 3600 * 1000).toISOString(),
      },
      {
        url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800',
        label: 'packaging',
        type: 'photo',
        uploadedAt: new Date(Date.now() - 52 * 3600 * 1000).toISOString(),
      },
      {
        url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800',
        label: 'shipping_label',
        type: 'photo',
        uploadedAt: new Date(Date.now() - 52 * 3600 * 1000).toISOString(),
      },
    ],
    messages: [
      {
        id: 'msg-1',
        caseId: 'cas-001-silk-tear',
        senderId: 'usr-buyer-dara',
        senderName: 'Dara Sok',
        senderRole: 'buyer',
        isInternal: false,
        content: 'The silk arrived torn down the middle along the fold line. The exterior parcel was punctured.',
        createdAt: new Date(Date.now() - 52 * 3600 * 1000).toISOString(),
      },
      {
        id: 'msg-2',
        caseId: 'cas-001-silk-tear',
        senderId: 'sys-timer',
        senderName: 'SLA Engine',
        senderRole: 'system',
        isInternal: true,
        content: 'Tier 1 SLA expired after 48 business hours without seller confirmation. Case auto-escalated to Tier 2 Platform Mediation.',
        createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      },
    ],
    events: [
      {
        id: 'evt-1',
        caseId: 'cas-001-silk-tear',
        type: 'case_created',
        actorId: 'usr-buyer-dara',
        actorName: 'Dara Sok',
        actorRole: 'buyer',
        reason: 'Return claim filed with damage evidence',
        createdAt: new Date(Date.now() - 52 * 3600 * 1000).toISOString(),
      },
      {
        id: 'evt-2',
        caseId: 'cas-001-silk-tear',
        type: 'tier1_sla_breached',
        actorId: 'system',
        actorName: 'SLA Monitor',
        actorRole: 'system',
        reason: 'Merchant unresponsive within 48 business hours',
        createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      },
    ],
    commerceFacts: {
      orderFacts: {
        orderId: 'ord-uuid-silk-99',
        orderNumber: 'ORD-2026-8888',
        status: 'fulfilled',
        deliveryStatus: 'delivered',
        paymentStatus: 'paid',
        totalAmount: '93.50',
        currency: 'USD',
        deliveredAt: new Date(Date.now() - 55 * 3600 * 1000).toISOString(),
        items: [
          { productId: 'prod-silk-1', name: 'Handwoven Silk Ikat', quantity: 2, price: '45.00' },
        ],
        timeline: [
          { type: 'order_created', occurredAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString() },
          { type: 'delivered', occurredAt: new Date(Date.now() - 55 * 3600 * 1000).toISOString() },
          { type: 'collect_cod', occurredAt: new Date(Date.now() - 55 * 3600 * 1000).toISOString() },
        ],
      },
      storeFacts: {
        storeId: 'store-angkor-silk',
        name: 'Angkor Heritage Silk',
        status: 'active',
        contactEmail: 'contact@angkorsilk.com.kh',
      },
    },
  },
  {
    id: 'cas-002-ceramic-bowl',
    caseNumber: 'CAS-20261028-0002',
    title: 'Cracked Ceramic Teapot on Arrival',
    subjectType: 'order',
    subjectId: 'ord-uuid-ceramic-12',
    orderId: 'ord-uuid-ceramic-12',
    storeId: 'store-khmer-clay',
    storeName: 'Kampong Chhnang Pottery',
    buyerId: 'usr-buyer-srey',
    buyerName: 'Sreymom Kem',
    status: 'under_investigation',
    priority: 'high',
    tier: 1,
    assigneeId: 'adm-usr-lead',
    assigneeName: 'Sokha Meng (Support Lead)',
    serviceDeadline: new Date(Date.now() + 8 * 3600 * 1000).toISOString(), // 8h remaining (< 12h)
    isOverdue: false,
    slaRisk: 'at_risk',
    slaRemainingHours: 8,
    reportReference: 'RPT-20261028-0002',
    createdAt: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    evidence: [
      {
        url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800',
        label: 'damage',
        type: 'photo',
        uploadedAt: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
      },
    ],
    messages: [
      {
        id: 'msg-3',
        caseId: 'cas-002-ceramic-bowl',
        senderId: 'usr-buyer-srey',
        senderName: 'Sreymom Kem',
        senderRole: 'buyer',
        isInternal: false,
        content: 'Handle was broken off the teapot body inside bubble wrap.',
        createdAt: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
      },
      {
        id: 'msg-4',
        caseId: 'cas-002-ceramic-bowl',
        senderId: 'adm-usr-lead',
        senderName: 'Sokha Meng',
        senderRole: 'agent',
        isInternal: true,
        content: 'Merchant contacted by phone; seller agreed to inspect transit photos.',
        createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      },
    ],
    events: [
      {
        id: 'evt-3',
        caseId: 'cas-002-ceramic-bowl',
        type: 'assigned',
        actorId: 'adm-usr-lead',
        actorName: 'Sokha Meng',
        actorRole: 'agent',
        reason: 'Assigned to senior dispute specialist',
        createdAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
      },
    ],
    commerceFacts: {
      orderFacts: {
        orderId: 'ord-uuid-ceramic-12',
        orderNumber: 'ORD-2026-9042',
        status: 'fulfilled',
        deliveryStatus: 'delivered',
        paymentStatus: 'paid',
        totalAmount: '42.00',
        currency: 'USD',
        items: [
          { productId: 'prod-pot-1', name: 'Terracotta Teapot Set', quantity: 1, price: '42.00' },
        ],
      },
      storeFacts: {
        storeId: 'store-khmer-clay',
        name: 'Kampong Chhnang Pottery',
        status: 'active',
      },
    },
  },
  {
    id: 'cas-003-wrong-size',
    caseNumber: 'CAS-20261028-0003',
    title: 'Incorrect Cotton Shirt Size Delivered (S instead of XL)',
    subjectType: 'order',
    subjectId: 'ord-uuid-shirt-55',
    orderId: 'ord-uuid-shirt-55',
    storeId: 'store-khmer-cotton',
    storeName: 'Banteay Cotton Co.',
    buyerId: 'usr-buyer-panha',
    buyerName: 'Panha Vong',
    status: 'open',
    priority: 'normal',
    tier: 1,
    assigneeId: null,
    assigneeName: null,
    serviceDeadline: new Date(Date.now() + 32 * 3600 * 1000).toISOString(),
    isOverdue: false,
    slaRisk: 'normal',
    slaRemainingHours: 32,
    reportReference: 'RPT-20261028-0003',
    createdAt: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
    evidence: [
      {
        url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800',
        label: 'packaging',
        type: 'photo',
        uploadedAt: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
      },
    ],
    messages: [
      {
        id: 'msg-5',
        caseId: 'cas-003-wrong-size',
        senderId: 'usr-buyer-panha',
        senderName: 'Panha Vong',
        senderRole: 'buyer',
        isInternal: false,
        content: 'Tag says Size S, but invoice and confirmation clearly ordered Size XL.',
        createdAt: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
      },
    ],
    events: [
      {
        id: 'evt-4',
        caseId: 'cas-003-wrong-size',
        type: 'case_created',
        actorId: 'usr-buyer-panha',
        actorName: 'Panha Vong',
        actorRole: 'buyer',
        reason: 'Wrong item size received',
        createdAt: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'cas-004-resolved-refund',
    caseNumber: 'CAS-20261028-0004',
    title: 'Mediated Refund for Defective Silver Ring',
    subjectType: 'order',
    subjectId: 'ord-uuid-silver-04',
    orderId: 'ord-uuid-silver-04',
    storeId: 'store-silver-craft',
    storeName: 'Siem Reap Silverworks',
    buyerId: 'usr-buyer-kunthea',
    buyerName: 'Kunthea Chhun',
    status: 'resolved',
    priority: 'high',
    tier: 2,
    assigneeId: 'adm-usr-lead',
    assigneeName: 'Sokha Meng (Support Lead)',
    serviceDeadline: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    isOverdue: false,
    slaRisk: 'normal',
    slaRemainingHours: 0,
    reportReference: 'RPT-20261028-0004',
    createdAt: new Date(Date.now() - 96 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    resolution: {
      outcome: 'refund_ordered',
      summary: 'Merchant accepted return transit discrepancy. Full COD refund of $65.00 executed via Bakong payout.',
      resolvedBy: 'Sokha Meng (Senior Lead)',
      resolvedAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    },
    evidence: [],
    messages: [],
    events: [
      {
        id: 'evt-5',
        caseId: 'cas-004-resolved-refund',
        type: 'dispute_resolved',
        actorId: 'adm-usr-lead',
        actorName: 'Sokha Meng',
        actorRole: 'agent',
        reason: 'Refund confirmed and agreed with merchant',
        createdAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
      },
    ],
  },
];

const FIXTURE_MODERATION_ITEMS: ModerationProductItem[] = [
  {
    id: 'mod-001',
    productId: 'prod-ivory-replica',
    productName: 'Raw Elephant Tusk Carving Ornament',
    storeId: 'store-wood-craft',
    storeName: 'Mekong Artifacts',
    category: 'Home Decor',
    price: '280.00',
    images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800'],
    status: 'flagged',
    violationCode: 'PROHIBITED_WILDLIFE_FLORA',
    flagReason: 'Listing matches prohibited keyword pattern "tusk carving" and endangered wildlife protection regulations.',
    remediationGuidance: 'Products made from ivory, wildlife tusks or protected species are strictly prohibited under Cambodian Forestry Law and DEC-006.',
    history: [
      {
        id: 'h-1',
        action: 'flagged',
        actorId: 'system',
        actorName: 'Taxonomy Scanner v1.0.0',
        reason: 'Automated policy rule hit: PROHIBITED_WILDLIFE_FLORA',
        timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mod-002',
    productId: 'prod-herbal-capsules',
    productName: 'Special Botanical Pain Relief Capsules 500mg',
    storeId: 'store-herbal-cure',
    storeName: 'Traditional Remedies Asia',
    category: 'Health & Wellness',
    price: '19.50',
    images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800'],
    status: 'rejected',
    violationCode: 'PROHIBITED_UNLICENSED_MEDICINE',
    flagReason: 'Pharmaceutical therapeutic claims without Ministry of Health patent license.',
    appeal: {
      id: 'apl-002',
      reason: 'Our traditional herbal mixture is certified by the local artisan cooperative, not an industrial pharmaceutical medicine.',
      evidenceUrls: ['https://cdn.example.com/artisan-certificate.pdf'],
      submittedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      status: 'pending',
    },
    history: [
      {
        id: 'h-2',
        action: 'delisted',
        actorId: 'adm-moderator',
        actorName: 'Chann Vathana',
        reason: 'Unlicensed medical claims violation',
        timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      },
      {
        id: 'h-3',
        action: 'appeal_submitted',
        actorId: 'merchant',
        actorName: 'Traditional Remedies Asia',
        reason: 'Merchant submitted artisan cooperative certification for appeal review',
        timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mod-003',
    productId: 'prod-replica-watch',
    productName: 'Submariner Style Luxury Diver Watch AAA Replica',
    storeId: 'store-fashion-hub',
    storeName: 'Phnom Penh Luxury Store',
    category: 'Watches',
    price: '45.00',
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
    status: 'rejected',
    violationCode: 'PROHIBITED_COUNTERFEIT',
    flagReason: 'Explicitly labeled "AAA Replica" infringing trademark and copyright intellectual property.',
    history: [
      {
        id: 'h-4',
        action: 'delisted',
        actorId: 'adm-moderator',
        actorName: 'Chann Vathana',
        reason: 'Counterfeit trademark violation (DEC-006)',
        timestamp: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
  },
];

const FIXTURE_MAKER_CHECKER_ITEMS: MakerCheckerItem[] = [
  {
    id: 'mc-001',
    actionType: 'bulk_takedown',
    targetResource: 'Store Products (Store ID: store-counterfeit-hub)',
    targetId: 'store-counterfeit-hub',
    initiatedBy: {
      id: 'adm-mod-1',
      name: 'Vannak Kem',
      role: 'catalog_moderator',
    },
    reason: 'Store uploaded 38 counterfeit fashion replica listings in bulk. Requires dual-operator secondary confirmation to delist all store products.',
    status: 'pending_approval',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mc-002',
    actionType: 'store_suspension',
    targetResource: 'Store Account (Store ID: store-fraud-alert)',
    targetId: 'store-fraud-alert',
    initiatedBy: {
      id: 'adm-sup-lead',
      name: 'Sokha Meng',
      role: 'support_lead',
    },
    reason: 'Repeated non-delivery and ghost courier waybills across 5 verified complaints within 7 days (Strike 3 exceeded).',
    status: 'pending_approval',
    createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mc-003',
    actionType: 'high_value_refund',
    targetResource: 'Dispute Case CAS-20261028-0099',
    targetId: 'CAS-20261028-0099',
    initiatedBy: {
      id: 'adm-sup-agent',
      name: 'Dara Chan',
      role: 'support_agent',
    },
    reason: 'Discretionary buyer platform reimbursement of $450.00 exceeds standard agent limit ($100.00). Secondary approval required.',
    status: 'pending_approval',
    createdAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
  },
];

@Injectable({ providedIn: 'root' })
export class SupportOperationsService {
  private readonly http = inject(HttpClient);
  private readonly urls = inject(RentifyAdminService);
  private readonly auth = inject(AuthService);

  // In-memory runtime state for contract fixture adapter
  private casesStore: SupportCase[] = [...FIXTURE_SUPPORT_CASES];
  private moderationStore: ModerationProductItem[] = [...FIXTURE_MODERATION_ITEMS];
  private makerCheckerStore: MakerCheckerItem[] = [...FIXTURE_MAKER_CHECKER_ITEMS];

  private buildParams(query: Record<string, string | number | undefined>): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    }
    return params;
  }

  // --- Support Cases Operations ---

  listSupportCases(filter: SupportCaseFilter = {}): Observable<{ cases: SupportCase[]; total: number }> {
    const params = this.buildParams({
      queue: filter.queue,
      status: filter.status,
      priority: filter.priority,
      assigneeId: filter.assigneeId,
      subjectType: filter.subjectType,
      deadline: filter.deadline,
      search: filter.search,
      page: filter.page,
      limit: filter.limit,
    });

    return this.http
      .get<{ data: { cases: SupportCase[]; total: number } }>(
        `${this.urls.core}/admin/operations/support/cases`,
        { params },
      )
      .pipe(
        map((res) => res.data),
        catchError((_err: HttpErrorResponse) => {
          // Typed contract fixture adapter fallback
          let filtered = [...this.casesStore];

          if (filter.queue) {
            if (filter.queue === 'breached') filtered = filtered.filter((c) => c.slaRisk === 'breached');
            else if (filter.queue === 'urgent') filtered = filtered.filter((c) => c.priority === 'urgent');
            else if (filter.queue === 'tier1') filtered = filtered.filter((c) => c.tier === 1 && c.status !== 'resolved');
            else if (filter.queue === 'tier2') filtered = filtered.filter((c) => c.tier === 2 && c.status !== 'resolved');
            else if (filter.queue === 'resolved') filtered = filtered.filter((c) => c.status === 'resolved' || c.status === 'dismissed');
          }

          if (filter.status) filtered = filtered.filter((c) => c.status === filter.status);
          if (filter.priority) filtered = filtered.filter((c) => c.priority === filter.priority);
          if (filter.assigneeId) {
            filtered = filter.assigneeId === 'unassigned'
              ? filtered.filter((c) => !c.assigneeId)
              : filtered.filter((c) => c.assigneeId === filter.assigneeId);
          }
          if (filter.subjectType) filtered = filtered.filter((c) => c.subjectType === filter.subjectType);
          if (filter.deadline) {
            if (filter.deadline === 'overdue') filtered = filtered.filter((c) => c.slaRemainingHours < 0);
            else if (filter.deadline === 'at_risk') filtered = filtered.filter((c) => c.slaRemainingHours >= 0 && c.slaRemainingHours <= 12);
            else if (filter.deadline === 'active') filtered = filtered.filter((c) => c.slaRemainingHours > 12);
          }
          if (filter.search) {
            const term = filter.search.toLowerCase().trim();
            filtered = filtered.filter(
              (c) =>
                c.caseNumber.toLowerCase().includes(term) ||
                c.title.toLowerCase().includes(term) ||
                (c.reportReference || '').toLowerCase().includes(term) ||
                (c.storeName || '').toLowerCase().includes(term) ||
                (c.buyerName || '').toLowerCase().includes(term),
            );
          }

          const page = Number(filter.page) || 1;
          const limit = Number(filter.limit) || 20;
          const start = (page - 1) * limit;

          return of({
            cases: filtered.slice(start, start + limit),
            total: filtered.length,
          });
        }),
      );
  }

  getSupportCase(id: string): Observable<SupportCase> {
    return this.http
      .get<{ data: SupportCase }>(`${this.urls.core}/admin/operations/support/cases/${id}`)
      .pipe(
        map((res) => res.data),
        catchError(() => {
          const item = this.casesStore.find((c) => c.id === id || c.caseNumber === id);
          if (!item) return throwError(() => new Error(`Support case ${id} not found`));
          return of({ ...item });
        }),
      );
  }

  assignCase(id: string, assigneeId: string, assigneeName: string): Observable<SupportCase> {
    const actor = this.auth.user()?.name || 'Administrator';
    return this.http
      .patch<{ data: SupportCase }>(
        `${this.urls.core}/admin/operations/support/cases/${id}/assign`,
        { assigneeId, assigneeName },
      )
      .pipe(
        map((res) => res.data),
        catchError(() => {
          const item = this.casesStore.find((c) => c.id === id);
          if (!item) return throwError(() => new Error('Case not found'));
          item.assigneeId = assigneeId;
          item.assigneeName = assigneeName;
          item.status = item.status === 'open' ? 'under_investigation' : item.status;
          item.events.unshift({
            id: `evt-assign-${Date.now()}`,
            caseId: id,
            type: 'case_assigned',
            actorId: this.auth.user()?.id || 'admin',
            actorName: actor,
            actorRole: 'agent',
            reason: `Assigned case to ${assigneeName}`,
            createdAt: new Date().toISOString(),
          });
          return of({ ...item });
        }),
      );
  }

  updatePriority(id: string, priority: CasePriority): Observable<SupportCase> {
    const actor = this.auth.user()?.name || 'Administrator';
    return this.http
      .patch<{ data: SupportCase }>(
        `${this.urls.core}/admin/operations/support/cases/${id}/priority`,
        { priority },
      )
      .pipe(
        map((res) => res.data),
        catchError(() => {
          const item = this.casesStore.find((c) => c.id === id);
          if (!item) return throwError(() => new Error('Case not found'));
          const oldPriority = item.priority;
          item.priority = priority;
          item.events.unshift({
            id: `evt-pri-${Date.now()}`,
            caseId: id,
            type: 'priority_changed',
            actorId: this.auth.user()?.id || 'admin',
            actorName: actor,
            actorRole: 'agent',
            reason: `Priority updated from ${oldPriority} to ${priority}`,
            createdAt: new Date().toISOString(),
          });
          return of({ ...item });
        }),
      );
  }

  escalateCase(id: string, reason: string): Observable<SupportCase> {
    const actor = this.auth.user()?.name || 'Administrator';
    return this.http
      .post<{ data: SupportCase }>(
        `${this.urls.core}/admin/operations/support/cases/${id}/escalate`,
        { reason },
      )
      .pipe(
        map((res) => res.data),
        catchError(() => {
          const item = this.casesStore.find((c) => c.id === id);
          if (!item) return throwError(() => new Error('Case not found'));
          item.tier = 2;
          item.status = 'escalated_to_tier2';
          item.priority = 'urgent';
          item.events.unshift({
            id: `evt-esc-${Date.now()}`,
            caseId: id,
            type: 'escalated_to_tier2',
            actorId: this.auth.user()?.id || 'admin',
            actorName: actor,
            actorRole: 'agent',
            reason,
            createdAt: new Date().toISOString(),
          });
          return of({ ...item });
        }),
      );
  }

  resolveCase(
    id: string,
    outcomeOrPayload: ResolutionOutcome | { outcome: ResolutionOutcome; summary: string },
    summaryArg?: string,
  ): Observable<SupportCase> {
    const outcome = typeof outcomeOrPayload === 'string' ? outcomeOrPayload : outcomeOrPayload.outcome;
    const summary = typeof outcomeOrPayload === 'string' ? (summaryArg || '') : outcomeOrPayload.summary;
    const actor = this.auth.user()?.name || 'Administrator';
    return this.http
      .post<{ data: SupportCase }>(
        `${this.urls.core}/admin/operations/support/cases/${id}/resolve`,
        { outcome, summary },
      )
      .pipe(
        map((res) => res.data),
        catchError(() => {
          const item = this.casesStore.find((c) => c.id === id);
          if (!item) return throwError(() => new Error('Case not found'));
          item.status = outcome === 'dismissed' ? 'dismissed' : 'resolved';
          item.resolvedAt = new Date().toISOString();
          item.resolution = {
            outcome,
            summary,
            resolvedBy: actor,
            resolvedAt: new Date().toISOString(),
          };
          item.events.unshift({
            id: `evt-res-${Date.now()}`,
            caseId: id,
            type: 'dispute_resolved',
            actorId: this.auth.user()?.id || 'admin',
            actorName: actor,
            actorRole: 'agent',
            reason: summary,
            details: { outcome },
            createdAt: new Date().toISOString(),
          });
          return of({ ...item });
        }),
      );
  }

  reopenCase(id: string, reason: string): Observable<SupportCase> {
    const actor = this.auth.user()?.name || 'Administrator';
    return this.http
      .post<{ data: SupportCase }>(
        `${this.urls.core}/admin/operations/support/cases/${id}/reopen`,
        { reason },
      )
      .pipe(
        map((res) => res.data),
        catchError(() => {
          const item = this.casesStore.find((c) => c.id === id);
          if (!item) return throwError(() => new Error('Case not found'));
          item.status = 'reopened';
          item.reopenedAt = new Date().toISOString();
          item.reopenReason = reason;
          item.events.unshift({
            id: `evt-reopen-${Date.now()}`,
            caseId: id,
            type: 'case_reopened',
            actorId: this.auth.user()?.id || 'admin',
            actorName: actor,
            actorRole: 'agent',
            reason,
            createdAt: new Date().toISOString(),
          });
          return of({ ...item });
        }),
      );
  }

  addMessage(id: string, content: string, isInternal: boolean): Observable<CaseMessage> {
    const actor = this.auth.user()?.name || 'Administrator';
    const actorId = this.auth.user()?.id || 'admin';
    const payload = { content, isInternal };

    return this.http
      .post<{ data: CaseMessage }>(
        `${this.urls.core}/admin/operations/support/cases/${id}/messages`,
        payload,
      )
      .pipe(
        map((res) => res.data),
        catchError(() => {
          const item = this.casesStore.find((c) => c.id === id);
          if (!item) return throwError(() => new Error('Case not found'));
          const newMsg: CaseMessage = {
            id: `msg-${Date.now()}`,
            caseId: id,
            senderId: actorId,
            senderName: actor,
            senderRole: 'agent',
            isInternal,
            content,
            createdAt: new Date().toISOString(),
          };
          item.messages.push(newMsg);
          return of(newMsg);
        }),
      );
  }

  postInternalNote(id: string, content: string): Observable<CaseMessage> {
    return this.addMessage(id, content, true);
  }

  sendPublicMessage(id: string, content: string): Observable<CaseMessage> {
    return this.addMessage(id, content, false);
  }

  // --- Authoritative Commerce Facts Linkage ---

  getCommerceFacts(caseId: string, reportId?: string): Observable<AuthoritativeCommerceFacts> {
    const targetReportId = reportId || caseId;
    return this.http
      .get<{ data: AuthoritativeCommerceFacts }>(
        `${this.urls.commerce}/api/admin/operations/reports/${targetReportId}/facts`,
      )
      .pipe(
        map((res) => res.data),
        catchError(() => {
          const item = this.casesStore.find((c) => c.id === caseId || c.reportReference === targetReportId);
          return of(item?.commerceFacts || {});
        }),
      );
  }

  // --- Catalog Moderation Operations ---

  listModerationItems(filter: ModerationFilter = {}): Observable<{ items: ModerationProductItem[]; total: number }> {
    const params = this.buildParams({
      queue: filter.queue,
      category: filter.category,
      search: filter.search,
      page: filter.page,
      limit: filter.limit,
    });

    return this.http
      .get<{ data: { items: ModerationProductItem[]; total: number } }>(
        `${this.urls.commerce}/api/admin/operations/moderation/queue`,
        { params },
      )
      .pipe(
        map((res) => res.data),
        catchError(() => {
          let list = [...this.moderationStore];
          if (filter.queue === 'flagged') list = list.filter((m) => m.status === 'flagged' || m.status === 'pending');
          else if (filter.queue === 'appeals') list = list.filter((m) => m.appeal && m.appeal.status === 'pending');
          else if (filter.queue === 'delisted') list = list.filter((m) => m.status === 'rejected');

          if (filter.search) {
            const term = filter.search.toLowerCase().trim();
            list = list.filter(
              (m) =>
                m.productName.toLowerCase().includes(term) ||
                m.storeName.toLowerCase().includes(term) ||
                (m.violationCode || '').toLowerCase().includes(term),
            );
          }

          const page = Number(filter.page) || 1;
          const limit = Number(filter.limit) || 20;
          const start = (page - 1) * limit;

          return of({
            items: list.slice(start, start + limit),
            total: list.length,
          });
        }),
      );
  }

  getModerationItem(id: string): Observable<ModerationProductItem> {
    return this.http
      .get<{ data: ModerationProductItem }>(
        `${this.urls.commerce}/api/admin/operations/products/${id}/moderation-history`,
      )
      .pipe(
        map((res) => res.data),
        catchError(() => {
          const item = this.moderationStore.find((m) => m.id === id || m.productId === id);
          if (!item) return throwError(() => new Error('Moderation item not found'));
          return of({ ...item });
        }),
      );
  }

  decideModeration(
    id: string,
    decision: 'approve' | 'hold' | 'reject' | 'takedown',
    reason: string,
    violationCode?: string,
    evidenceUrl?: string,
  ): Observable<ModerationProductItem> {
    const actor = this.auth.user()?.name || 'Administrator';
    return this.http
      .post<{ data: ModerationProductItem }>(
        `${this.urls.commerce}/api/admin/operations/products/${id}/moderation`,
        { decision, reason, violationCode, evidenceUrl },
      )
      .pipe(
        map((res) => res.data),
        catchError(() => {
          const item = this.moderationStore.find((m) => m.id === id || m.productId === id);
          if (!item) return throwError(() => new Error('Moderation item not found'));

          if (decision === 'approve') {
            item.status = 'approved';
            item.violationCode = undefined;
            item.flagReason = undefined;
          } else if (decision === 'hold') {
            item.status = 'flagged';
          } else {
            item.status = 'rejected';
            if (violationCode) item.violationCode = violationCode as any;
          }

          item.history.unshift({
            id: `h-${Date.now()}`,
            action: decision === 'approve' ? 'reinstated' : decision === 'hold' ? 'flagged' : 'delisted',
            actorId: this.auth.user()?.id || 'admin',
            actorName: actor,
            reason,
            timestamp: new Date().toISOString(),
          });
          return of({ ...item });
        }),
      );
  }

  reviewAppeal(id: string, decision: 'approved' | 'rejected', reason: string): Observable<ModerationProductItem> {
    const actor = this.auth.user()?.name || 'Administrator';
    return this.http
      .post<{ data: ModerationProductItem }>(
        `${this.urls.commerce}/api/admin/operations/products/${id}/appeal/decision`,
        { decision, reason },
      )
      .pipe(
        map((res) => res.data),
        catchError(() => {
          const item = this.moderationStore.find((m) => m.id === id || m.productId === id);
          if (!item || !item.appeal) return throwError(() => new Error('Item or appeal not found'));

          item.appeal.status = decision;
          item.appeal.decisionReason = reason;
          item.appeal.decidedBy = actor;
          item.appeal.decidedAt = new Date().toISOString();

          if (decision === 'approved') {
            item.status = 'approved';
            item.violationCode = undefined;
          }

          item.history.unshift({
            id: `h-apl-${Date.now()}`,
            action: decision === 'approved' ? 'appeal_approved' : 'appeal_rejected',
            actorId: this.auth.user()?.id || 'admin',
            actorName: actor,
            reason,
            timestamp: new Date().toISOString(),
          });
          return of({ ...item });
        }),
      );
  }

  moderateProduct(
    id: string,
    decision: 'approve' | 'hold' | 'reject' | 'takedown' | 'delisted',
    reason: string,
    violationCode?: string,
    evidenceUrl?: string,
  ): Observable<ModerationProductItem> {
    const mapped = decision === 'delisted' ? 'takedown' : decision;
    return this.decideModeration(id, mapped, reason, violationCode, evidenceUrl);
  }

  decideAppeal(id: string, decision: 'approved' | 'rejected', reason: string): Observable<ModerationProductItem> {
    return this.reviewAppeal(id, decision, reason);
  }

  // --- Maker-Checker Operations ---

  listMakerCheckerItems(status = 'pending_approval'): Observable<{ items: MakerCheckerItem[]; total: number }> {
    return this.http
      .get<{ data: { items: MakerCheckerItem[]; total: number } }>(
        `${this.urls.core}/admin/operations/maker-checker`,
        { params: { status } },
      )
      .pipe(
        map((res) => res.data),
        catchError(() => {
          const list = this.makerCheckerStore.filter((i) => i.status === status);
          return of({ items: list, total: list.length });
        }),
      );
  }

  approveMakerChecker(id: string): Observable<MakerCheckerItem> {
    const actor = this.auth.user()?.name || 'Secondary Checker';
    const actorId = this.auth.user()?.id || 'checker';

    return this.http
      .post<{ data: MakerCheckerItem }>(
        `${this.urls.core}/admin/operations/maker-checker/${id}/approve`,
        {},
      )
      .pipe(
        map((res) => res.data),
        catchError(() => {
          const item = this.makerCheckerStore.find((i) => i.id === id);
          if (!item) return throwError(() => new Error('Action item not found'));
          if (item.initiatedBy.id === actorId) {
            return throwError(() => new Error('Maker-Checker Violation: Initiator cannot approve their own high-risk action.'));
          }
          item.status = 'approved';
          item.approvedBy = { id: actorId, name: actor };
          item.approvedAt = new Date().toISOString();
          return of({ ...item });
        }),
      );
  }

  rejectMakerChecker(id: string, reason: string): Observable<MakerCheckerItem> {
    const actor = this.auth.user()?.name || 'Secondary Checker';
    const actorId = this.auth.user()?.id || 'checker';

    return this.http
      .post<{ data: MakerCheckerItem }>(
        `${this.urls.core}/admin/operations/maker-checker/${id}/reject`,
        { reason },
      )
      .pipe(
        map((res) => res.data),
        catchError(() => {
          const item = this.makerCheckerStore.find((i) => i.id === id);
          if (!item) return throwError(() => new Error('Action item not found'));
          item.status = 'rejected';
          item.approvedBy = { id: actorId, name: actor };
          item.approvedAt = new Date().toISOString();
          item.decisionReason = reason;
          return of({ ...item });
        }),
      );
  }
}
