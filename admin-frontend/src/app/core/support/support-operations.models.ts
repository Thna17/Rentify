// admin-frontend/src/app/core/support/support-operations.models.ts
// P5-SUP-002: Typed models for Admin Support Cases, Commerce Fact Linkages,
// Restricted Product Moderation, Maker-Checker Dual-Approval, and Frozen Core Claims.

/**
 * Frozen Core Permission Claims consumed by platform administration.
 * Invariant: UI checks are only presentation controls; backend enforces authorization.
 */
export type CorePermissionClaim =
  | 'ops:overview:read'
  | 'support:case:read'
  | 'support:case:write'
  | 'support:dispute:resolve'
  | 'catalog:moderate'
  | 'review:moderate'
  | 'inventory:adjust'
  | 'seller:review'
  | 'maker_checker:approve';

export type CaseStatus =
  | 'open'
  | 'under_investigation'
  | 'escalated_to_tier2'
  | 'resolved'
  | 'dismissed'
  | 'reopened';

export type CasePriority = 'low' | 'normal' | 'high' | 'urgent';

export type CaseSubjectType = 'order' | 'return' | 'product' | 'merchant';

export type SlaRisk = 'normal' | 'at_risk' | 'breached';

export type ResolutionOutcome =
  | 'refund_ordered'
  | 'claim_rejected'
  | 'seller_fault'
  | 'buyer_fault'
  | 'mediated_settlement'
  | 'dismissed';

export interface CaseEvidence {
  id?: string;
  url: string;
  label: 'damage' | 'packaging' | 'shipping_label' | 'general' | string;
  type?: 'photo' | 'video' | 'document';
  uploadedAt: string;
}

export interface CaseMessage {
  id: string;
  caseId: string;
  senderId: string;
  senderName: string;
  senderRole: 'buyer' | 'merchant' | 'agent' | 'system';
  isInternal: boolean;
  content: string;
  createdAt: string;
}

export interface CaseEvent {
  id: string;
  caseId: string;
  type: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  reason?: string;
  details?: Record<string, any>;
  createdAt: string;
}

export interface AuthoritativeCommerceOrderFacts {
  orderId: string;
  orderNumber: string;
  status: string;
  deliveryStatus: string;
  paymentStatus: string;
  totalAmount: string;
  currency?: string;
  deliveredAt?: string | null;
  items: Array<{
    id?: string;
    productId: string;
    name: string;
    quantity: number;
    price: string;
  }>;
  timeline?: Array<{
    id?: string;
    type: string;
    actorId?: string;
    occurredAt: string;
    reason?: string | null;
  }>;
}

export interface AuthoritativeCommerceStoreFacts {
  storeId: string;
  name: string;
  status: string;
  contactEmail?: string | null;
}

export interface AuthoritativeCommerceProductFacts {
  productId: string;
  name: string;
  price?: string;
  status?: string;
}

export interface AuthoritativeCommerceFacts {
  report?: {
    id: string;
    reportNumber: string;
    category: string;
    reason: string;
    description: string;
    createdAt: string;
  };
  orderFacts?: AuthoritativeCommerceOrderFacts | null;
  storeFacts?: AuthoritativeCommerceStoreFacts | null;
  productFacts?: AuthoritativeCommerceProductFacts | null;
}

export interface SupportCase {
  id: string;
  caseNumber: string;
  title: string;
  subjectType: CaseSubjectType;
  subjectId: string;
  orderId?: string | null;
  storeId?: string | null;
  storeName?: string | null;
  buyerId: string;
  buyerName?: string | null;
  status: CaseStatus;
  priority: CasePriority;
  tier: 1 | 2;
  assigneeId?: string | null;
  assigneeName?: string | null;
  serviceDeadline: string;
  isOverdue: boolean;
  slaRisk: SlaRisk;
  slaRemainingHours: number;
  reportReference?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  reopenedAt?: string | null;
  reopenReason?: string | null;
  resolution?: {
    outcome: ResolutionOutcome;
    summary: string;
    resolvedBy: string;
    resolvedAt: string;
  } | null;
  evidence: CaseEvidence[];
  messages: CaseMessage[];
  events: CaseEvent[];
  commerceFacts?: AuthoritativeCommerceFacts | null;
}

export interface SupportCaseFilter {
  queue?: 'all' | 'breached' | 'urgent' | 'tier1' | 'tier2' | 'resolved';
  status?: string;
  priority?: string;
  assigneeId?: string;
  subjectType?: string;
  deadline?: 'all' | 'overdue' | 'at_risk' | 'active';
  search?: string;
  page?: number;
  limit?: number;
}

// Moderation Models
export type ModerationState = 'pending' | 'flagged' | 'rejected' | 'approved';

export type ProhibitedTaxonomyCode =
  | 'PROHIBITED_WEAPONS_EXPLOSIVES'
  | 'PROHIBITED_NARCOTICS'
  | 'PROHIBITED_COUNTERFEIT'
  | 'PROHIBITED_WILDLIFE_FLORA'
  | 'PROHIBITED_ADULT_CONTENT'
  | 'PROHIBITED_HAZARDOUS_MATERIALS'
  | 'PROHIBITED_UNLICENSED_MEDICINE'
  | 'OTHER_POLICY_VIOLATION';

export interface ModerationAppeal {
  id: string;
  reason: string;
  evidenceUrls: string[];
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  decisionReason?: string | null;
  decidedBy?: string | null;
  decidedAt?: string | null;
}

export interface ModerationHistoryItem {
  id: string;
  action: 'flagged' | 'delisted' | 'reinstated' | 'appeal_submitted' | 'appeal_approved' | 'appeal_rejected';
  actorId: string;
  actorName: string;
  reason: string;
  timestamp: string;
}

export interface ModerationProductItem {
  id: string;
  productId: string;
  productName: string;
  storeId: string;
  storeName: string;
  category: string;
  price: string;
  images: string[];
  status: ModerationState;
  violationCode?: ProhibitedTaxonomyCode;
  flagReason?: string;
  remediationGuidance?: string;
  evidence?: Array<{ url: string; label: string; uploadedAt: string }>;
  appeal?: ModerationAppeal | null;
  history: ModerationHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ModerationFilter {
  queue?: 'flagged' | 'appeals' | 'delisted';
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// Maker-Checker Models
export type MakerCheckerActionType =
  | 'bulk_takedown'
  | 'store_suspension'
  | 'direct_chargeback'
  | 'high_value_refund';

export type MakerCheckerStatus = 'pending_approval' | 'approved' | 'rejected';

export interface MakerCheckerItem {
  id: string;
  actionType: MakerCheckerActionType;
  targetResource: string;
  targetId: string;
  initiatedBy: {
    id: string;
    name: string;
    role: string;
  };
  reason: string;
  details?: Record<string, any>;
  status: MakerCheckerStatus;
  createdAt: string;
  approvedBy?: {
    id: string;
    name: string;
  } | null;
  approvedAt?: string | null;
  decisionReason?: string | null;
}
