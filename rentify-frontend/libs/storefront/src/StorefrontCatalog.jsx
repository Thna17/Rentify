import { Children, cloneElement, isValidElement } from 'react';
import { useGetAllProductsQuery } from './api';
import { useStorefrontWebsite } from './website';

/** Read-only storefront catalog. Product administration stays in Merchant. */
export function StorefrontCatalog({ children }) {
  const { websiteId } = useStorefrontWebsite();
  const { data, isLoading } = useGetAllProductsQuery({ websiteId, page: 1, limit: 24 });
  const card = Children.toArray(children).find(isValidElement);
  if (isLoading) return <p className="p-6">Loading products…</p>;
  return (
    <section className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {(data?.products || []).map((product) =>
        card ? cloneElement(card, { key: product.id, product, preview: false, owner: false }) : null
      )}
    </section>
  );
}
