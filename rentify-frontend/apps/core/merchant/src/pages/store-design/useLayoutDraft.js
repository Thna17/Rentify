import { useCallback, useEffect, useState } from 'react';
import { normalizeLayout } from '@rentify/storefront/preview';

export function useLayoutDraft(websiteId, templateId, savedLayout) {
  const [layout, setLayout] = useState(() => normalizeLayout(templateId, savedLayout));

  useEffect(() => {
    setLayout(normalizeLayout(templateId, savedLayout));
  }, [websiteId, templateId, savedLayout]);

  const update = useCallback(
    (next) => {
      setLayout(next);
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
