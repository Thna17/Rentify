import { useEffect, useMemo, useState } from 'react';
import { useStorefrontWebsite } from './website';
import { getContentValue } from './content';

/**
 * Template preview and home-page section layout.
 *
 * The merchant's store design page shows their own live store inside an
 * iframe. Two query parameters, honoured only while the store is framed,
 * let that preview try another look without changing what is saved:
 *
 *   ?previewTemplate=3            render with Template 3
 *   ?previewLayout=menu,-visit    home sections in this order; "-" hides one
 *
 * Layout changes after load arrive as a `PREVIEW_MESSAGE` postMessage from
 * the parent page, so the preview updates without reloading.
 *
 * Shoppers outside a frame see the layout saved for the current template,
 * falling back to its default order when no layout has been saved.
 */
export const PREVIEW_MESSAGE = 'rentify:storefront-preview';

/** Reorderable home sections per template, in default order. The hero always stays first. */
export const TEMPLATE_SECTIONS = Object.freeze({
  1: ['categories', 'newArrivals', 'categoryRows'],
  2: ['highlights', 'categories', 'newArrivals', 'feature', 'featured', 'needs', 'story'],
  3: ['highlights', 'signature', 'menu', 'feature', 'story', 'visit'],
  4: ['categories', 'newArrivals', 'closing'],
});

export const isFramed = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

const previewParam = (name) => {
  if (typeof window === 'undefined' || !isFramed()) return null;
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
};

/** The template id a framed preview asks for, or null. */
export const previewTemplateId = () => {
  const id = Number(previewParam('previewTemplate'));
  return Object.prototype.hasOwnProperty.call(TEMPLATE_SECTIONS, id) ? id : null;
};

/**
 * Normalizes a layout for `templateId`: known sections in the given order,
 * then any the layout left out, in default order and visible.
 * Accepts `[{ id, hidden }]` or the `menu,-visit` string form.
 */
export const normalizeLayout = (templateId, layout) => {
  const sections = TEMPLATE_SECTIONS[templateId] || [];
  const items = typeof layout === 'string'
    ? layout.split(',').map((part) => part.trim()).filter(Boolean)
      .map((part) => ({ id: part.replace(/^-/, ''), hidden: part.startsWith('-') }))
    : Array.isArray(layout) ? layout : [];
  const seen = new Set();
  const result = [];
  for (const item of items) {
    if (!item || !sections.includes(item.id) || seen.has(item.id)) continue;
    seen.add(item.id);
    result.push({ id: item.id, hidden: Boolean(item.hidden) });
  }
  for (const id of sections) if (!seen.has(id)) result.push({ id, hidden: false });
  return result;
};

export const serializeLayout = (layout) =>
  layout.map((item) => (item.hidden ? `-${item.id}` : item.id)).join(',');

/**
 * Home-page section layout for a template. Returns `section(id)`, which is
 * null when the section is hidden, otherwise the style that places it.
 * The home page's container must be a flex column.
 */
export function useSectionLayout(templateId) {
  const { content } = useStorefrontWebsite();
  const saved = getContentValue(content, 'Page Layout');
  const savedLayout = saved && typeof saved === 'object' ? saved[templateId] : null;
  const [layout, setLayout] = useState(() => previewParam('previewLayout'));

  useEffect(() => {
    if (!isFramed()) return undefined;
    const onMessage = (event) => {
      if (event.source !== window.parent || event.data?.type !== PREVIEW_MESSAGE) return;
      if (typeof event.data.layout === 'string') setLayout(event.data.layout);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return useMemo(() => {
    const items = new Map(normalizeLayout(templateId, layout ?? savedLayout).map((item, index) => [item.id, { ...item, order: index + 1 }]));
    return (id) => {
      const item = items.get(id);
      if (!item) return { order: 0 };
      return item.hidden ? null : { order: item.order };
    };
  }, [templateId, layout, savedLayout]);
}

/** Wraps one home section so the layout can place or hide it. */
export function LayoutSection({ layout, id, children }) {
  const style = layout(id);
  if (!style) return null;
  return <div data-section={id} style={style}>{children}</div>;
}
