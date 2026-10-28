import { commerceClient } from '@rentify/shared/api';

export type ImportIssue = { level: 'warning' | 'error'; code: string; field: string; message: string };
export type ImportRow = {
  number: number;
  values: Record<string, string>;
  issues: ImportIssue[];
  state: 'invalid' | 'pending' | 'imported' | 'failed';
  productId?: string | null;
};
export type ImportJob = {
  id: string;
  status: 'preview_ready' | 'queued' | 'processing' | 'completed' | 'completed_with_errors' | 'failed';
  sourceFilename: string;
  templateVersion: string;
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  processedRows: number;
  importedRows: number;
  failedRows: number;
  failureCode?: string | null;
  failureMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  rows?: ImportRow[];
  previewTruncated?: boolean;
};

const timeout = <T>(promise: Promise<T>, milliseconds = 15_000): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_resolve, reject) => window.setTimeout(
      () => reject(new DOMException('Timed out', 'TimeoutError')), milliseconds,
    )),
  ]);

export const productImportApi = {
  async history(storeId: string) {
    const response = await timeout(commerceClient.request<{ jobs: ImportJob[] }>({
      method: 'GET', path: `/api/stores/${storeId}/product-imports`, credentials: 'include',
    }));
    return response.data.jobs;
  },
  async get(storeId: string, jobId: string) {
    const response = await timeout(commerceClient.request<{ job: ImportJob }>({
      method: 'GET', path: `/api/stores/${storeId}/product-imports/${jobId}`, credentials: 'include',
    }));
    return response.data.job;
  },
  async preview(storeId: string, file: File, idempotencyKey: string) {
    const body = new FormData();
    body.append('file', file);
    const response = await timeout(commerceClient.request<{ job: ImportJob }>({
      method: 'POST', path: `/api/stores/${storeId}/product-imports`, body, credentials: 'include',
      headers: { 'Idempotency-Key': idempotencyKey },
    }), 30_000);
    return response.data.job;
  },
  async start(storeId: string, jobId: string, retry = false) {
    const response = await timeout(commerceClient.request<{ job: ImportJob }>({
      method: 'POST',
      path: `/api/stores/${storeId}/product-imports/${jobId}/${retry ? 'retry' : 'start'}`,
      credentials: 'include',
    }));
    return response.data.job;
  },
  async download(storeId: string, kind: 'template' | 'export' | 'report', jobId?: string) {
    const path = kind === 'report'
      ? `/api/stores/${storeId}/product-imports/${jobId}/report`
      : `/api/stores/${storeId}/product-imports/${kind}`;
    const response = await timeout(commerceClient.request<string>({ method: 'GET', path, credentials: 'include' }));
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = kind === 'template' ? 'rentify-product-import-v1.0.csv'
      : kind === 'export' ? 'rentify-products.csv' : `product-import-${jobId}-corrections.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};

export function importStateFor(error: unknown) {
  const status = (error as { status?: number }).status;
  if (status === 401 || status === 403) return 'forbidden';
  if (status === 409) return 'conflict';
  if ((error as Error)?.name === 'TimeoutError') return 'timeout';
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
  return 'error';
}

export function importErrorKey(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code === 'CSV_TOO_LARGE' || code === 'CSV_ROW_LIMIT') return 'dashboard.imports.limit_error';
  if (code === 'CSV_HEADERS_INVALID') return 'dashboard.imports.template_error';
  if (['CSV_REQUIRED', 'CSV_EMPTY', 'CSV_PARSE_INVALID', 'CSV_TYPE_INVALID', 'CSV_UPLOAD_INVALID'].includes(code || '')) {
    return 'dashboard.imports.file_error';
  }
  if (code === 'IDEMPOTENCY_CONFLICT') return 'dashboard.imports.conflict_message';
  return 'dashboard.imports.error_message';
}
