import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AtRiskResponse,
  OutcomeSummaryResponse,
  ReminderLogResponse,
} from "../app/features/ops/types";

declare const __API_URL__: string;

const API_BASE = __API_URL__;

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
      const response = await fetch(url, {
        credentials: "include",
      });
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

const useApiMutation = <T,>(
  url: string,
  method: "POST" | "PATCH" | "PUT"
): {
  mutate: () => Promise<T | null>;
  isLoading: boolean;
  error: string | null;
} => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(url, {
        method,
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      return (await response.json()) as T;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [method, url]);

  return { mutate, isLoading, error };
};

export const useGetOutcomeSummaryQuery = ({
  websiteId,
  from,
  to,
}: {
  websiteId?: string | null;
  from?: string;
  to?: string;
}) => {
  const query = useMemo(
    () => buildQuery({ websiteId: websiteId || undefined, from, to }),
    [websiteId, from, to]
  );
  const url = `${API_BASE}/ops/outcomes/summary?${query}`;
  return useApiQuery<OutcomeSummaryResponse>(url, Boolean(websiteId));
};

export const useGetAtRiskInvoicesQuery = ({
  websiteId,
  dueSoonDays,
  from,
  to,
}: {
  websiteId?: string | null;
  dueSoonDays?: number;
  from?: string;
  to?: string;
}) => {
  const query = useMemo(
    () =>
      buildQuery({
        websiteId: websiteId || undefined,
        dueSoonDays,
        from,
        to,
      }),
    [websiteId, dueSoonDays, from, to]
  );
  const url = `${API_BASE}/ops/invoices/at-risk?${query}`;
  return useApiQuery<AtRiskResponse>(url, Boolean(websiteId));
};

export const useGetRemindersQuery = ({
  websiteId,
  status,
  reminderType,
  from,
  to,
  page,
  limit,
}: {
  websiteId?: string | null;
  status?: string;
  reminderType?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}) => {
  const query = useMemo(
    () =>
      buildQuery({
        websiteId: websiteId || undefined,
        status,
        reminderType,
        from,
        to,
        page,
        limit,
      }),
    [websiteId, status, reminderType, from, to, page, limit]
  );
  const url = `${API_BASE}/ops/reminders?${query}`;
  return useApiQuery<ReminderLogResponse>(url, Boolean(websiteId));
};

export const usePauseContractMutation = (contractId?: string | null) => {
  const url = `${API_BASE}/ops/contracts/${contractId}/pause`;
  return useApiMutation<{ data: unknown }>(url, "POST");
};

export const useResumeContractMutation = (contractId?: string | null) => {
  const url = `${API_BASE}/ops/contracts/${contractId}/resume`;
  return useApiMutation<{ data: unknown }>(url, "POST");
};
