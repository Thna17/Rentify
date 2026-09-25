import { useI18n } from '../i18n';
import { useAddToCart } from '../hooks/useAddToCart';
import { ProductCard } from './ProductCard';

export const GRID_CLASSES = 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5';
// A swipeable row on phones that becomes a single five-column row on desktop.
export const RAIL_CLASSES =
  'scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-5';

/** Grid (or `layout="rail"`) of product cards wired to the storefront cart. */
export function ProductGrid({ products, priorityCount = 0, showCategory = true, layout = 'grid', className = '' }) {
  const addToCart = useAddToCart();
  const rail = layout === 'rail';
  return (
    <ul className={`${rail ? RAIL_CLASSES : GRID_CLASSES} ${className}`}>
      {products.map((product, index) => (
        <li key={product.id} className={rail ? 'w-[46%] shrink-0 snap-start sm:w-auto' : undefined}>
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

export function ProductGridSkeleton({ count = 8, layout = 'grid', className = '' }) {
  const { t } = useI18n();
  const rail = layout === 'rail';
  return (
    <div role="status" aria-label={t('catalog.loading')} className={`${rail ? RAIL_CLASSES : GRID_CLASSES} ${className}`}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`overflow-hidden rounded-2xl border border-border/60 bg-card ${rail ? 'w-[46%] shrink-0 sm:w-auto' : ''}`} aria-hidden="true">
          <div className="m-2 aspect-square animate-pulse rounded-xl bg-muted" />
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
