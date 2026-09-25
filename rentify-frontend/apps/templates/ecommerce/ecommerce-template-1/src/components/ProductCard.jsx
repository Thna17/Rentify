import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Loader2, Plus } from 'lucide-react';
import { getProductImages, getStockState } from '@rentify/storefront/commerce';
import { useI18n } from '../i18n';
import { productPath } from '../paths';
import { ProductImage } from './ProductImage';
import { Price } from './Price';
import { StockLabel } from './StockLabel';

const activeVariants = (product) =>
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

/**
 * Product tile: image, category, name, price, availability and a direct
 * add-to-cart action. Products with variants link to the detail page instead,
 * because the shopper has to choose options first.
 */
export function ProductCard({ product, onAdd, priority = false, showCategory = true }) {
  const { t } = useI18n();
  const [state, setState] = useState('idle');

  const name = product?.name || '';
  const href = productPath(product.id);
  const image = getProductImages(product, name)[0];
  const stock = getCardStock(product);
  const needsOptions = activeVariants(product).length > 0;

  const handleAdd = async () => {
    if (!onAdd || state === 'adding' || !stock.purchasable) return;
    setState('adding');
    try {
      await onAdd(product);
      setState('added');
      window.setTimeout(() => setState('idle'), 1600);
    } catch {
      setState('idle');
    }
  };

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-foreground/[0.07] bg-card shadow-[0_2px_10px_-6px_oklch(var(--foreground)/0.2)] transition-shadow hover:shadow-[0_10px_28px_-14px_oklch(var(--foreground)/0.35)]">
      {/* The name link below stretches over the whole card, so the image needs no link of its own. */}
      <div className="m-1.5 aspect-square overflow-hidden rounded-xl bg-muted">
        <ProductImage
          src={image?.url}
          alt=""
          priority={priority}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className={`h-full w-full transition-transform duration-300 group-hover:scale-[1.03] ${stock.purchasable ? '' : 'opacity-60'}`}
        />
      </div>

      <div className="flex flex-1 flex-col gap-1 px-3 pb-3 pt-1.5 sm:px-4 sm:pb-4">
        {showCategory && product?.Category?.name && (
          <p className="truncate text-xs text-muted-foreground">{product.Category.name}</p>
        )}
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground sm:text-[0.9375rem]">
          <Link to={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {name}
          </Link>
        </h3>
        <div className="mt-auto pt-2">
          <Price amount={product?.price} compareAt={product?.compareAtPrice} size="sm" />
          <StockLabel stock={stock} quiet className="mt-1" />
        </div>

        {needsOptions ? (
          <Link
            to={href}
            className="btn-outline relative z-10 mt-3 min-h-10 w-full px-3 text-xs sm:text-sm"
            aria-label={`${t('product.selectOptions')}: ${name}`}
          >
            {t('product.selectOptions')}
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            disabled={!stock.purchasable || state === 'adding'}
            aria-label={t('product.addNamed', { name })}
            className="btn-primary relative z-10 mt-3 min-h-10 w-full px-3 text-xs sm:text-sm"
          >
            {state === 'adding' ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : state === 'added' ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Plus className="h-4 w-4" aria-hidden="true" />
            )}
            <span>
              {!stock.purchasable
                ? t('product.outOfStock')
                : state === 'added'
                  ? t('product.added')
                  : state === 'adding'
                    ? t('product.adding')
                    : t('product.add')}
            </span>
          </button>
        )}
      </div>
    </article>
  );
}
