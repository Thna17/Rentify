import { useCallback, useEffect, useState } from 'react';
import { coreClient } from '@rentify/shared/api';
import type { LaunchChecklistData } from './launchChecklistModel';

export type ChecklistLoadState = 'loading' | 'ready' | 'empty' | 'forbidden' | 'offline' | 'timeout' | 'error';

export const useLaunchChecklist = () => {
  const [data, setData] = useState<LaunchChecklistData | null>(null);
  const [state, setState] = useState<ChecklistLoadState>('loading');

  const refresh = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setState('offline');
      return;
    }
    setState('loading');
    try {
      const response = await Promise.race([
        coreClient.request<{ success: boolean; data: LaunchChecklistData }>({
          method: 'GET', path: '/api/stores/mine/launch-checklist', credentials: 'include',
          headers: { Accept: 'application/json' },
        }),
        new Promise<never>((_, reject) => window.setTimeout(() => reject(new DOMException('Timed out', 'TimeoutError')), 12_000)),
      ]);
      const payload = response.data;
      if (!payload?.data?.items || !Array.isArray(payload.data.items)) throw new Error('launch-checklist:invalid');
      setData(payload.data);
      setState(payload.data.items.length ? 'ready' : 'empty');
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 401 || status === 403) setState('forbidden');
      else if ((error as Error).name === 'TimeoutError') setState('timeout');
      else if (typeof navigator !== 'undefined' && !navigator.onLine) setState('offline');
      else setState('error');
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  return { data, state, refresh };
};
