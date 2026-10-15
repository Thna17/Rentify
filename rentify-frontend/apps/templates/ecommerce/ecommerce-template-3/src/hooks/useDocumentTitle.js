import { useEffect } from 'react';
import { useStorefrontWebsite } from '@rentify/storefront/website';

/** Sets `Page · Store` as the document title, and the store logo as favicon. */
export function useDocumentTitle(page) {
  const { identity } = useStorefrontWebsite();
  const store = identity?.name;

  useEffect(() => {
    const parts = [page, store].filter(Boolean);
    if (parts.length) document.title = parts.join(' · ');
  }, [page, store]);

  useEffect(() => {
    if (!identity?.logoUrl) return;
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = identity.logoUrl;
  }, [identity?.logoUrl]);
}
