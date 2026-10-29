// marketplace-frontend/src/app/core/support/support.models.ts
// P5-SUP-001: Typed models for buyer report intake, eligibility, evidence, and Core case linkage.

export type ReportSubjectType = 'order' | 'return' | 'product' | 'merchant';

export type ReportCategory =
  | 'damaged_item'
  | 'defective'
  | 'wrong_item'
  | 'not_as_described'
  | 'delivery_delay'
  | 'courier_conduct'
  | 'counterfeit_suspected'
  | 'prohibited_listing'
  | 'seller_unresponsive'
  | 'other';

export type EvidenceLabel = 'product_damage' | 'packaging' | 'shipping_label' | 'general';

export interface EvidenceItem {
  url: string;
  label?: EvidenceLabel;
  type?: 'photo' | 'video' | 'document';
  fileName?: string;
  uploadedAt?: string;
}

export interface ReportEligibility {
  eligible: boolean;
  subjectType: ReportSubjectType;
  subjectId: string;
  orderId?: string | null;
  storeId?: string | null;
  productId?: string | null;
  subjectTitle?: string;
  deadline?: string | null;
  reasonCodes: string[];
  guidance: string;
  existingReport?: {
    id: string;
    reportNumber: string;
    category: string;
    coreCaseNumber?: string | null;
    linkageStatus: string;
    createdAt: string;
  } | null;
}

export interface CreateBuyerReportPayload {
  subjectType: ReportSubjectType;
  subjectId: string;
  category: string;
  reason: string;
  description: string;
  evidence?: EvidenceItem[];
}

export interface BuyerReportResult {
  id: string;
  reportNumber: string;
  subjectType: ReportSubjectType;
  subjectId: string;
  category: string;
  reason: string;
  linkageStatus: 'linked' | 'pending_linkage' | 'linkage_failed';
  coreCaseId?: string | null;
  coreCaseNumber?: string | null;
  createdAt: string;
}
