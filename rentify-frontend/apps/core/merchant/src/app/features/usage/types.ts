export type UsageEventType = "ORDER_PAID" | "INVOICE_PAID" | "STORE_VIEW";

export interface UsageSummaryResponse {
  data: {
    breakdown: Record<string, { count: number; cost: number }>;
    totalCost: number;
    range: { from: string; to: string };
  };
}

export interface UsageBreakdownRow {
  date: string;
  eventType: UsageEventType;
  count: number;
  cost: number;
}

export interface UsageBreakdownResponse {
  data: UsageBreakdownRow[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface BillingSummaryResponse {
  data: {
    websiteId: string;
    month: string;
    totalAmount: number;
    breakdown: Record<string, { count: number; cost: number }>;
    status: "pending" | "paid";
  };
}
