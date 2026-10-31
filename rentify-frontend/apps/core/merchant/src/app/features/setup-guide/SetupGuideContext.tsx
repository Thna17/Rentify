import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { RENTIFY_API_BASE } from '@rentify/shared/config/urls';
import { useAccess } from '../../../utils/access';
import { toSetupGuide, type LaunchChecklist, type SetupGuide } from './setupGuideModel';

interface SetupGuideState {
  /** null until loaded, and always null for staff (the owner's guide is not theirs to do). */
  guide: SetupGuide | null;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
  /** "Hide" is remembered on this device only; the guide stays in the menu. */
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
  /** The delivery fee sheet can be opened from the card, the hand-off and empty states. */
  deliverySheetOpen: boolean;
  setDeliverySheetOpen: (open: boolean) => void;
}

const SetupGuideContext = createContext<SetupGuideState | null>(null);

const hiddenKey = (storeId?: string | null) => `rentify_setup_guide_hidden:${storeId || 'unknown'}`;

const readHidden = (storeId?: string | null) => {
  try {
    return localStorage.getItem(hiddenKey(storeId)) === 'true';
  } catch {
    return false;
  }
};

async function fetchChecklist(): Promise<LaunchChecklist> {
  const response = await fetch(`${RENTIFY_API_BASE}/api/stores/mine/launch-checklist`, { credentials: 'include' });
  if (!response.ok) throw new Error(`Launch checklist request failed (${response.status})`);
  const body = await response.json();
  return body.data as LaunchChecklist;
}

export function SetupGuideProvider({ storeId, children }: { storeId?: string | null; children: React.ReactNode }) {
  const access = useAccess();
  const [guide, setGuide] = useState<SetupGuide | null>(null);
  const [loading, setLoading] = useState(access.isOwner);
  const [error, setError] = useState(false);
  const [hidden, setHiddenState] = useState(() => readHidden(storeId));
  const [deliverySheetOpen, setDeliverySheetOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!access.isOwner || !storeId) return;
    setLoading(true);
    try {
      setGuide(toSetupGuide(await fetchChecklist()));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [access.isOwner, storeId]);

  useEffect(() => {
    setHiddenState(readHidden(storeId));
    void refresh();
  }, [storeId, refresh]);

  // Steps are often finished in another tab (POS app, storefront editor), so re-check on return.
  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  const setHidden = useCallback((value: boolean) => {
    setHiddenState(value);
    try {
      localStorage.setItem(hiddenKey(storeId), String(value));
    } catch {
      // A private window can refuse storage; hiding then lasts for this visit only.
    }
  }, [storeId]);

  const value = useMemo(
    () => ({ guide, loading, error, refresh, hidden, setHidden, deliverySheetOpen, setDeliverySheetOpen }),
    [guide, loading, error, refresh, hidden, setHidden, deliverySheetOpen],
  );
  return <SetupGuideContext.Provider value={value}>{children}</SetupGuideContext.Provider>;
}

const OUTSIDE_PROVIDER: SetupGuideState = {
  guide: null, loading: false, error: false, refresh: async () => undefined,
  hidden: false, setHidden: () => undefined, deliverySheetOpen: false, setDeliverySheetOpen: () => undefined,
};

export const useSetupGuide = (): SetupGuideState => useContext(SetupGuideContext) ?? OUTSIDE_PROVIDER;
