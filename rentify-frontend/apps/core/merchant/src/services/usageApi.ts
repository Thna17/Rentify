import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  UsageSummaryResponse,
  UsageBreakdownResponse,
  BillingSummaryResponse,
} from "../app/features/usage/types";

declare const __ECOMMERCE_API_: string;

const API_BASE = __ECOMMERCE_API_.replace(/\/ecommerce\/?$/, "");

const buildQuery = (params: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.append(key, String(value));
  });
  return query.toString();
};

const useApiQuery = <T,>(
  url: string,
  enabled = true
): {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
} => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      const json = (await response.json()) as T;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [url, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
};

export const useGetUsageSummaryQuery = ({
  websiteId,
  rangeDays,
}: {
  websiteId?: string | null;
  rangeDays: number;
}) => {
  const query = useMemo(
    () => buildQuery({ websiteId: websiteId || undefined, rangeDays }),
    [websiteId, rangeDays]
  );
  const url = `${API_BASE}/api/usage/summary?${query}`;
  return useApiQuery<UsageSummaryResponse>(url, Boolean(websiteId));
};

export const useGetUsageBreakdownQuery = ({
  websiteId,
  from,
  to,
  eventType,
  page,
  pageSize,
}: {
  websiteId?: string | null;
  from: string;
  to: string;
  eventType?: string;
  page: number;
  pageSize: number;
}) => {
  const query = useMemo(
    () =>
      buildQuery({
        websiteId: websiteId || undefined,
        from,
        to,
        eventType,
        page,
        pageSize,
      }),
    [websiteId, from, to, eventType, page, pageSize]
  );
  const url = `${API_BASE}/api/usage/breakdown?${query}`;
  return useApiQuery<UsageBreakdownResponse>(url, Boolean(websiteId));
};

export const useGetBillingSummaryQuery = ({
  websiteId,
  month,
}: {
  websiteId?: string | null;
  month: string;
}) => {
  const query = useMemo(
    () => buildQuery({ websiteId: websiteId || undefined, month }),
    [websiteId, month]
  );
  const url = `${API_BASE}/api/usage/billing?${query}`;
  return useApiQuery<BillingSummaryResponse>(url, Boolean(websiteId));
};
