import { Link } from 'react-router-dom';
import { Loader2, ShoppingBag, Trash2 } from 'lucide-react';
import { formatMoney, getLineTotal, getLineUnitPrice, getProductImages, getStockState } from '@rentify/storefront/commerce';
import { useI18n } from '../i18n';
import { PATHS, productPath } from '../paths';
import { ProductImage } from './ProductImage';
import { QuantityStepper } from './QuantityStepper';
import { StockLabel } from './StockLabel';
import { EmptyState } from './StatusMessage';

const lineOptions = (line) =>
  Object.entries(line?.selectedOptions || {})
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key}: ${value}`)
    .join(' · ');

/** Stock limits for a cart line come from its variant when it has one. */
export const getLineStock = (line) =>
  line?.ProductVariant ? getStockState(line.ProductVariant, line.Product) : getStockState(line?.Product);

export function CartLine({ line, currency, onQuantityChange, onRemove, busy }) {
  const { t } = useI18n();
  const product = line.Product || {};
  const name = product.name || '';
  const images = getProductImages(line.ProductVariant, name);
  const image = images[0] || getProductImages(product, name)[0];
  const stock = getLineStock(line);
  const options = lineOptions(line);
  // Bounds the stepper only; the API re-validates stock on every update and at checkout.
  const max = Math.max(stock.maxQuantity, stock.purchasable ? 1 : 0);
  const overStock = stock.available !== null && line.quantity > stock.available;

  return (
    <li className="flex gap-3 py-4 sm:gap-4">
      <Link to={productPath(product.id || line.productId)} className="shrink-0" tabIndex={-1} aria-hidden="true">
        <ProductImage src={image?.url} alt="" className="h-20 w-20 rounded-lg sm:h-24 sm:w-24" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link to={productPath(product.id || line.productId)} className="line-clamp-2 text-sm font-medium text-foreground hover:text-primary sm:text-base">
              {name}
            </Link>
            {options && <p className="mt-0.5 text-xs text-muted-foreground">{options}</p>}
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('cart.each', { price: formatMoney(getLineUnitPrice(line), currency) })}
            </p>
          </div>
          <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground sm:text-base">
            {formatMoney(getLineTotal(line), currency)}
          </p>
        </div>
        {(overStock || !stock.purchasable || stock.lowStock) && <StockLabel stock={stock} />}
        <div className="flex items-center justify-between gap-3">
          <QuantityStepper
            size="sm"
            value={line.quantity}
            max={max}
            onChange={(quantity) => onQuantityChange(line, quantity)}
            disabled={busy}
          />
          <button
            type="button"
            onClick={() => onRemove(line)}
            disabled={busy}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground hover:bg-muted hover:text-error disabled:opacity-50"
            aria-label={t('cart.removeNamed', { name })}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
            <span className="hidden sm:inline">{t('cart.remove')}</span>
          </button>
        </div>
      </div>
    </li>
  );
}

export function CartSummary({ totals, quote, currency, leading, children }) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">{t('cart.summary')}</h2>
      {leading && <div className="mt-2 border-b border-border pb-1">{leading}</div>}
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4 text-base">
          <dt className="font-semibold text-foreground">
            {t('cart.subtotal')}
            <span className="ml-1.5 text-sm font-normal text-muted-foreground">({t('cart.items', { count: totals.itemCount })})</span>
          </dt>
          <dd className="font-semibold tabular-nums text-foreground" data-testid="cart-subtotal">
            {formatMoney(totals.subtotal, currency)}
          </dd>
        </div>
        {quote?.deliveryFee != null && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t('order.delivery')}</dt>
            <dd className="tabular-nums text-foreground">{formatMoney(quote.deliveryFee, currency)}</dd>
          </div>
        )}
        {quote?.totalAmount != null && (
          <div className="flex justify-between gap-4 border-t border-border pt-2 text-base">
            <dt className="font-semibold text-foreground">{t('order.total')}</dt>
            <dd className="font-semibold tabular-nums text-foreground" data-testid="cart-total">
              {formatMoney(quote.totalAmount, currency)}
            </dd>
          </div>
        )}
      </dl>
      {quote?.issues?.length > 0 && (
        <ul role="alert" className="mt-3 space-y-1 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
          {quote.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}
      {quote?.totalAmount == null && <p className="mt-3 text-xs text-muted-foreground">{t('cart.feesNote')}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

/** Cart lines and summary, or the empty state. */
export function CartView({ lines, totals, quote, currency = 'USD', onQuantityChange, onRemove, busyLineId }) {
  const { t } = useI18n();

  if (!lines.length) {
    return (
      <EmptyState icon={ShoppingBag} title={t('cart.emptyTitle')} body={t('cart.emptyBody')}>
        <Link to={PATHS.PRODUCTS} className="btn-primary">
          {t('cart.continue')}
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
      <ul className="divide-y divide-border rounded-xl border border-border bg-card px-4 sm:px-5">
        {lines.map((line) => (
          <CartLine
            key={line.id}
            line={line}
            currency={currency}
            onQuantityChange={onQuantityChange}
            onRemove={onRemove}
            busy={busyLineId === line.id}
          />
        ))}
      </ul>
      <div className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)]">
        <CartSummary totals={totals} quote={quote} currency={currency}>
          <Link to={PATHS.CHECKOUT} className="btn-primary min-h-12 w-full text-base">
            {t('cart.checkout')}
          </Link>
          <Link to={PATHS.PRODUCTS} className="btn-ghost mt-2 w-full">
            {t('cart.continue')}
          </Link>
        </CartSummary>
      </div>
    </div>
  );
}
