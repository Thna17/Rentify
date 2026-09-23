export type ReminderStatus = "sent" | "failed" | "skipped" | "blocked";
export type ReminderType = "first" | "second" | "overdue";
export type ReminderChannel = "telegram" | "sms" | "email";

export interface ReminderLog {
  id: string;
  websiteId: string;
  invoiceId: string;
  contractId?: string | null;
  orderId?: string | null;
  channel: ReminderChannel;
  reminderType: ReminderType;
  status: ReminderStatus;
  sentAt?: string | null;
  dueDate?: string | null;
  createdAt?: string | null;
  messagePreview?: string | null;
  errorMessage?: string | null;
}

export interface ReminderLogResponse {
  data: ReminderLog[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ReminderEffectiveness {
  totalRemindersSent: number;
  paidWithin24h: number;
  rate: number;
}

export interface OutcomeSummaryResponse {
  data: {
    totalInvoices: number;
    paidTotal: number;
    paidOnTime: number;
    onTimeRate: number;
    overdueUnpaid: number;
    overdueRate: number;
    reminderEffectiveness: ReminderEffectiveness;
    range: {
      from: string;
      to: string;
    };
  };
}

export interface AtRiskInvoice {
  id: string;
  websiteId: string;
  orderId?: string | null;
  invoiceNumber?: string | null;
  dueDate?: string | null;
  totalAmount?: number | null;
  paymentLink?: string | null;
  currency?: string | null;
  lastReminder?: ReminderLog | null;
}

export interface AtRiskResponse {
  data: {
    overdue: AtRiskInvoice[];
    dueSoon: AtRiskInvoice[];
  };
  meta: {
    dueSoonDays: number;
    counts: {
      overdue: number;
      dueSoon: number;
    };
  };
}

export interface ContractStatus {
  id: string;
  status: "active" | "paused" | "completed" | "unknown";
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}
