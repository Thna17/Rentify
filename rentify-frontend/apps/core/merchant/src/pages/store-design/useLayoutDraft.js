import { useCallback, useEffect, useState } from 'react';
import { normalizeLayout } from '@rentify/storefront/preview';

const storageKey = (websiteId, templateId) => `rentify.storeDesign.layout.${websiteId}.${templateId}`;

const readDraft = (websiteId, templateId) => {
  try {
    const saved = window.localStorage.getItem(storageKey(websiteId, templateId));
    return normalizeLayout(templateId, saved ? JSON.parse(saved) : null);
  } catch {
    return normalizeLayout(templateId, null);
  }
};

/**
 * The merchant's home-page layout draft for one template. Core has no saved
 * layout field yet, so the draft lives on this device only (docs/notes.md).
 */
export function useLayoutDraft(websiteId, templateId) {
  const [layout, setLayout] = useState(() => readDraft(websiteId, templateId));

  useEffect(() => {
    setLayout(readDraft(websiteId, templateId));
  }, [websiteId, templateId]);

  const update = useCallback(
    (next) => {
      setLayout(next);
      try {
        window.localStorage.setItem(storageKey(websiteId, templateId), JSON.stringify(next));
      } catch {
        // The preview still updates; the draft just isn't kept for next time.
      }
    },
    [websiteId, templateId]
  );

  const move = useCallback(
    (index, delta) => {
      const target = index + delta;
      if (target < 0 || target >= layout.length) return;
      const next = [...layout];
      [next[index], next[target]] = [next[target], next[index]];
      update(next);
    },
    [layout, update]
  );

  const toggle = useCallback(
    (id) => update(layout.map((item) => (item.id === id ? { ...item, hidden: !item.hidden } : item))),
    [layout, update]
  );

  const reset = useCallback(() => update(normalizeLayout(templateId, null)), [templateId, update]);

  const isDefault = layout.every((item, index) => !item.hidden && item.id === normalizeLayout(templateId, null)[index]?.id);

  return { layout, move, toggle, reset, isDefault };
}
