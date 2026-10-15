import { Link } from 'react-router-dom';
import { getProductImages } from '@rentify/storefront/commerce';
import { useI18n } from '../i18n';
import { productPath } from '../paths';
import { useAddToCart } from '../hooks/useAddToCart';
import { ProductImage } from './ProductImage';
import { Price } from './Price';
import { QuickAdd, getCardStock, getProductBadge, productSummary } from './ProductCard';

/**
 * One line of the café menu: thumbnail, name with a dotted leader to the
 * price, the first line of the description and a quick "+" button. The name
 * link covers the row so the whole line opens the item.
 */
export function MenuRow({ product, onAdd, priority = false }) {
  const { t } = useI18n();
  const name = product?.name || '';
  const image = getProductImages(product, name)[0];
  const stock = getCardStock(product);
  const badge = getProductBadge(product);
  const summary = productSummary(product);

  return (
    <article className="group relative flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-card sm:gap-4 sm:p-3">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-accent sm:h-20 sm:w-20">
        <ProductImage
          src={image?.url}
          alt=""
          priority={priority}
          sizes="80px"
          className={`h-full w-full transition-transform duration-500 group-hover:scale-105 ${stock.purchasable ? '' : 'opacity-60 grayscale'}`}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h3 className="line-clamp-2 min-w-0 break-words font-display text-base font-semibold leading-snug text-foreground sm:truncate sm:text-lg">
            <Link to={productPath(product.id)} className="after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none">
              {name}
            </Link>
          </h3>
          <span className="hidden min-w-4 flex-1 translate-y-[-0.2rem] border-b-2 border-dotted border-foreground/20 sm:block" aria-hidden="true" />
          <Price amount={product?.price} compareAt={product?.compareAtPrice} size="sm" className="ml-auto shrink-0 sm:ml-0" />
        </div>
        {(badge || summary || !stock.purchasable) && (
          <p className="mt-0.5 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            {!stock.purchasable ? (
              <span className="shrink-0 text-xs font-semibold text-error">{t('product.outOfStock')}</span>
            ) : (
              badge && (
                <span
                  className={`shrink-0 rounded-full px-2 py-px text-[0.6875rem] font-semibold leading-5 ${
                    badge.kind === 'sale' ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'
                  }`}
                >
                  {badge.kind === 'sale' ? `-${badge.percent}%` : t('home.newBadge')}
                </span>
              )
            )}
            {summary && <span className="truncate">{summary}</span>}
          </p>
        )}
      </div>

      <QuickAdd product={product} onAdd={onAdd} size="sm" />
    </article>
  );
}

/** Menu rows in one column on phones and two on wide screens, wired to the cart. */
export function MenuList({ products, priorityCount = 0, className = '' }) {
  const addToCart = useAddToCart();
  return (
    <ul className={`grid grid-cols-1 gap-x-10 gap-y-1 xl:grid-cols-2 ${className}`}>
      {products.map((product, index) => (
        <li key={product.id}>
          <MenuRow product={product} priority={index < priorityCount} onAdd={(item) => addToCart({ product: item, quantity: 1 })} />
        </li>
      ))}
    </ul>
  );
}

export function MenuListSkeleton({ count = 6, className = '' }) {
  const { t } = useI18n();
  return (
    <div role="status" aria-label={t('catalog.loading')} className={`grid grid-cols-1 gap-x-10 gap-y-1 xl:grid-cols-2 ${className}`}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex items-center gap-3 p-2 sm:gap-4 sm:p-3" aria-hidden="true">
          <div className="h-16 w-16 shrink-0 animate-pulse rounded-xl bg-muted sm:h-20 sm:w-20" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}
