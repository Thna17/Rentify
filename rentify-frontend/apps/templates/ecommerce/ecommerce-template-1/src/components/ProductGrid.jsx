import { useI18n } from '../i18n';
import { useAddToCart } from '../hooks/useAddToCart';
import { ProductCard } from './ProductCard';

export const GRID_CLASSES = 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5';

/** Grid of product cards wired to the storefront cart. */
export function ProductGrid({ products, priorityCount = 0, showCategory = true, className = '' }) {
  const addToCart = useAddToCart();
  return (
    <ul className={`${GRID_CLASSES} ${className}`}>
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard
            product={product}
            priority={index < priorityCount}
            showCategory={showCategory}
            onAdd={(item) => addToCart({ product: item, quantity: 1 })}
          />
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({ count = 8, className = '' }) {
  const { t } = useI18n();
  return (
    <div role="status" aria-label={t('catalog.loading')} className={`${GRID_CLASSES} ${className}`}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-border/60 bg-card" aria-hidden="true">
          <div className="m-1.5 aspect-square animate-pulse rounded-xl bg-muted" />
          <div className="space-y-2 p-3 sm:p-4">
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/4 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-10 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
