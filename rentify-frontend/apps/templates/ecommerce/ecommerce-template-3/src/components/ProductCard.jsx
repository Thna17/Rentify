import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Loader2, Plus } from 'lucide-react';
import { getProductImages, getStockState, hasSelectableOptions, toAmount } from '@rentify/storefront/commerce';
import { useI18n } from '../i18n';
import { productPath } from '../paths';
import { ProductImage } from './ProductImage';
import { Price } from './Price';
import { StockLabel } from './StockLabel';

export const activeVariants = (product) =>
  Array.isArray(product?.ProductVariants)
    ? product.ProductVariants.filter((variant) => variant?.status !== 'disabled')
    : [];

/** Availability for the card: a product with variants is available if any variant is. */
export const getCardStock = (product) => {
  const variants = activeVariants(product);
  if (!variants.length) return getStockState(product);
  const states = variants.map((variant) => getStockState(variant, product));
  const purchasable = states.some((state) => state.purchasable);
  return { purchasable, maxQuantity: purchasable ? 1 : 0, lowStock: false, available: null };
};

export const NEW_PRODUCT_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * One badge from the product's own data: the discount when the merchant set a
 * higher compare-at price, otherwise "New" for products added recently.
 */
export const getProductBadge = (product, now = Date.now()) => {
  const price = toAmount(product?.price);
  const compareAt = toAmount(product?.compareAtPrice);
  if (compareAt > price && price > 0) {
    const percent = Math.round((1 - price / compareAt) * 100);
    if (percent >= 1) return { kind: 'sale', percent };
  }
  const created = Date.parse(product?.createdAt);
  if (Number.isFinite(created) && created <= now && now - created < NEW_PRODUCT_DAYS * DAY_MS) return { kind: 'new' };
  return null;
};

/** First line of the merchant's description, as plain text, for cards and menu rows. */
export const productSummary = (product) =>
  String(product?.shortDescription || product?.description || '')
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean) || '';

/**
 * Round "+" button for cards and menu rows. Adds the item, shows a spinner and
 * a tick, and reverts after a moment. Items with options (such as cup sizes)
 * link to their page instead, because the shopper has to choose first.
 */
export function QuickAdd({ product, onAdd, size = 'md', className = '' }) {
  const { t } = useI18n();
  const [state, setState] = useState('idle');
  const reset = useRef(null);
  const name = product?.name || '';
  const stock = getCardStock(product);
  const needsOptions = hasSelectableOptions(product);
  const dimension = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';

  useEffect(() => () => window.clearTimeout(reset.current), []);

  const handleAdd = async () => {
    if (!onAdd || state === 'adding' || !stock.purchasable) return;
    setState('adding');
    try {
      await onAdd(product);
      setState('added');
      reset.current = window.setTimeout(() => setState('idle'), 1600);
    } catch {
      setState('idle');
    }
  };

  const base = `relative z-10 inline-flex ${dimension} shrink-0 items-center justify-center rounded-full transition-colors ${className}`;

  if (needsOptions) {
    return (
      <Link
        to={productPath(product.id)}
        className={`${base} border border-primary/40 bg-card text-primary hover:bg-primary hover:text-primary-foreground`}
        aria-label={`${t('product.selectOptions')}: ${name}`}
        title={t('product.selectOptions')}
      >
        <Plus className="h-5 w-5" aria-hidden="true" />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={!stock.purchasable || state === 'adding'}
      aria-label={stock.purchasable ? t('product.addNamed', { name }) : `${t('product.outOfStock')}: ${name}`}
      className={`${base} bg-primary text-primary-foreground shadow-[0_10px_20px_-12px_oklch(var(--primary))] hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none`}
    >
      {state === 'adding' ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : state === 'added' ? (
        <Check className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Plus className="h-5 w-5" aria-hidden="true" />
      )}
      <span className="sr-only" aria-live="polite">
        {state === 'added' ? t('product.added') : ''}
      </span>
    </button>
  );
}

/**
 * Drink card for the signature row and search results: a round-cornered photo,
 * name, first line of the description, price and a quick "+" button. The name
 * link stretches over the whole card.
 */
export function ProductCard({ product, onAdd, priority = false, showCategory = true }) {
  const { t } = useI18n();
  const name = product?.name || '';
  const href = productPath(product.id);
  const image = getProductImages(product, name)[0];
  const stock = getCardStock(product);
  const badge = getProductBadge(product);
  const summary = productSummary(product);

  return (
    <article className="group relative flex h-full flex-col rounded-[1.5rem] border border-border bg-card p-2.5 transition-shadow hover:shadow-[0_22px_44px_-28px_oklch(var(--foreground)/0.5)]">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.1rem] bg-accent">
        {badge && (
          <span
            className={`absolute left-2.5 top-2.5 z-[1] rounded-full px-2.5 py-0.5 text-[0.6875rem] font-semibold ${
              badge.kind === 'sale' ? 'bg-error text-primary-foreground' : 'bg-card/90 text-primary'
            }`}
          >
            {badge.kind === 'sale' ? `-${badge.percent}%` : t('home.newBadge')}
          </span>
        )}
        <ProductImage
          src={image?.url}
          alt=""
          priority={priority}
          sizes="(min-width: 1024px) 22vw, (min-width: 640px) 33vw, 60vw"
          className={`h-full w-full transition-transform duration-500 group-hover:scale-[1.04] ${stock.purchasable ? '' : 'opacity-60 grayscale'}`}
        />
      </div>

      <div className="flex flex-1 flex-col px-1.5 pb-1.5 pt-3">
        {showCategory && product?.Category?.name && (
          <p className="truncate text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-primary">{product.Category.name}</p>
        )}
        <h3 className="mt-0.5 line-clamp-2 font-display text-base font-semibold leading-snug text-foreground sm:text-lg">
          <Link to={href} className="after:absolute after:inset-0 after:rounded-[1.5rem] after:content-[''] focus-visible:outline-none">
            {name}
          </Link>
        </h3>
        {summary && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">{summary}</p>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="min-w-0">
            <Price amount={product?.price} compareAt={product?.compareAtPrice} size="sm" />
            <StockLabel stock={stock} quiet className="mt-0.5" />
          </div>
          <QuickAdd product={product} onAdd={onAdd} />
        </div>
      </div>
    </article>
  );
}
