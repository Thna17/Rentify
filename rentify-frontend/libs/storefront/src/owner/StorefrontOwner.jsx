import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { RENTIFY_API_BASE } from '@rentify/shared/config/urls';
import { useStorefrontWebsite } from '../website';
import { ownerText } from './ownerText';
import { ADD_CATEGORY, ADD_PRODUCT } from './ownerModes';

/**
 * Store-owner tools for the live storefront. Every visitor gets only this
 * small module; the editor itself (OwnerToolbar) is a separate chunk loaded
 * after Core confirms that the signed-in account owns this store. Core checks
 * ownership again on every save, so hiding the tools is a convenience, not the
 * security boundary.
 */
const OwnerToolbar = lazy(() => import('./OwnerToolbar'));

const OwnerContext = createContext({ isOwner: false, openEditor: () => undefined });

/** True when the signed-in Rentify account owns this website (never for shoppers). */
const useOwnerAccess = (websiteId) => {
  const [isOwner, setIsOwner] = useState(false);
  useEffect(() => {
    if (!websiteId || !RENTIFY_API_BASE) return undefined;
    const controller = new AbortController();
    fetch(`${RENTIFY_API_BASE}/api/websites/${encodeURIComponent(websiteId)}/owner-access`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => setIsOwner(Boolean(body?.owner)))
      .catch(() => setIsOwner(false));
    return () => controller.abort();
  }, [websiteId]);
  return isOwner;
};

/**
 * Wrap a template's layout. `fields` lists what the owner may edit, grouped by
 * `category` (the section), e.g. Template 2's TEMPLATE_2_FIELDS.
 */
export function StorefrontOwnerProvider({ fields, children }) {
  const { websiteId } = useStorefrontWebsite();
  const isOwner = useOwnerAccess(websiteId);
  const [editor, setEditor] = useState({ open: false, section: null });
  const openEditor = useCallback((section = null, options = {}) => setEditor({ open: true, section, ...options }), []);
  const value = useMemo(() => ({ isOwner, openEditor }), [isOwner, openEditor]);

  return (
    <OwnerContext.Provider value={value}>
      {children}
      {isOwner && (
        <Suspense fallback={null}>
          <OwnerToolbar fields={fields} editor={editor} onEditorChange={setEditor} />
        </Suspense>
      )}
    </OwnerContext.Provider>
  );
}

export const useStorefrontOwner = () => useContext(OwnerContext);

/** Small "Edit" button on a section, shown only to the store owner. */
export function OwnerEditButton({ section, className = '' }) {
  const { isOwner, openEditor } = useStorefrontOwner();
  if (!isOwner) return null;
  const t = ownerText();
  return (
    <button
      type="button"
      onClick={() => openEditor(section)}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary/40 bg-card/95 px-3 text-xs font-semibold text-primary shadow-sm backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground ${className}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
      {t.edit} <span className="sr-only">{t.sectionName(section)}</span>
    </button>
  );
}

/** "+ Add product" / "+ Add category" for the owner, e.g. beside a product row. */
export function OwnerAddButton({ kind, categoryId, className = '' }) {
  const { isOwner, openEditor } = useStorefrontOwner();
  if (!isOwner) return null;
  const t = ownerText();
  const product = kind === 'product';
  return (
    <button
      type="button"
      onClick={() => openEditor(product ? ADD_PRODUCT : ADD_CATEGORY, product && categoryId ? { categoryId } : {})}
      className={`inline-flex min-h-9 items-center gap-1 rounded-full border border-primary/40 bg-card/95 px-3 text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground ${className}`}
    >
      + {product ? t.addProduct : t.addCategory}
    </button>
  );
}

/**
 * Where a section is hidden because it is empty, shows the owner an outline
 * inviting them to fill it in. Shoppers see nothing.
 */
export function OwnerSectionPlaceholder({ section, className = '' }) {
  const { isOwner, openEditor } = useStorefrontOwner();
  if (!isOwner) return null;
  const t = ownerText();
  return (
    <div className={`store-container ${className}`}>
      <button
        type="button"
        onClick={() => openEditor(section)}
        className="flex w-full flex-col items-center gap-1 rounded-2xl border-2 border-dashed border-primary/35 bg-primary/5 px-4 py-8 text-center transition-colors hover:border-primary/60 hover:bg-primary/10"
      >
        <span className="text-sm font-semibold text-primary">{t.addSection(section)}</span>
        <span className="text-xs text-muted-foreground">{t.onlyYouSeeThis}</span>
      </button>
    </div>
  );
}
