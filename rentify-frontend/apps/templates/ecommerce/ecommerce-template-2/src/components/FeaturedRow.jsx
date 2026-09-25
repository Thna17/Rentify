import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Loader2, Plus } from 'lucide-react';
import { getProductImages } from '@rentify/storefront/commerce';
import { useI18n } from '../i18n';
import { productPath } from '../paths';
import { useAddToCart } from '../hooks/useAddToCart';
import { getCardStock } from './ProductCard';
import { Price } from './Price';
import { ProductImage } from './ProductImage';

const hasOptions = (product) =>
  Array.isArray(product?.ProductVariants) && product.ProductVariants.some((variant) => variant?.status !== 'disabled');

/** Compact horizontal card: thumbnail, name, price and a round add button. */
function RowCard({ product, onAdd }) {
  const { t } = useI18n();
  const [state, setState] = useState('idle');
  const name = product?.name || '';
  const href = productPath(product.id);
  const image = getProductImages(product, name)[0];
  const stock = getCardStock(product);
  const needsOptions = hasOptions(product);

  const add = async () => {
    if (state === 'adding' || !stock.purchasable) return;
    setState('adding');
    try {
      await onAdd(product);
      setState('added');
      window.setTimeout(() => setState('idle'), 1600);
    } catch {
      setState('idle');
    }
  };

  const round =
    'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-foreground/25 text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <article className="group relative flex h-full items-center gap-3 rounded-2xl border border-border bg-card p-2 pr-3">
      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-accent sm:h-24 sm:w-20">
        <ProductImage src={image?.url} alt="" sizes="80px" className="h-full w-full" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 self-stretch py-1">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
          <Link to={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {name}
          </Link>
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2">
          <Price amount={product?.price} compareAt={product?.compareAtPrice} size="sm" className="min-w-0" />
          {needsOptions ? (
            <Link to={href} className={round} aria-label={`${t('product.selectOptions')}: ${name}`}>
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={add}
              disabled={!stock.purchasable || state === 'adding'}
              className={round}
              aria-label={stock.purchasable ? t('product.addNamed', { name }) : `${t('product.outOfStock')}: ${name}`}
            >
              {state === 'adding' ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : state === 'added' ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/** A row of compact cards (the merchant's featured category on the home page). */
export function FeaturedRow({ products }) {
  const addToCart = useAddToCart();
  return (
    <ul className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-5">
      {products.map((product) => (
        <li key={product.id} className="w-[78%] shrink-0 snap-start sm:w-auto">
          <RowCard product={product} onAdd={(item) => addToCart({ product: item, quantity: 1 })} />
        </li>
      ))}
    </ul>
  );
}
