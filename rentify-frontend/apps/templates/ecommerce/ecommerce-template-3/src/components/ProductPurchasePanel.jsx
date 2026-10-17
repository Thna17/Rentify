import { useMemo, useState } from 'react';
import { Check, Loader2, ShoppingBag } from 'lucide-react';
import { clampQuantity, findVariant, getApiErrorMessage, getStockState, toAmount } from '@rentify/storefront/commerce';
import { sanitizeColor } from '@rentify/storefront/theme';
import { useI18n } from '../i18n';
import { Price } from './Price';
import { StockLabel } from './StockLabel';
import { QuantityStepper } from './QuantityStepper';

const activeVariantsOf = (product) =>
  Array.isArray(product?.ProductVariants)
    ? product.ProductVariants.filter((variant) => variant?.status !== 'disabled')
    : [];

const optionsOf = (product) =>
  (Array.isArray(product?.ProductOptions) ? [...product.ProductOptions] : [])
    .filter((option) => option?.name && Array.isArray(option.values) && option.values.length)
    .sort((a, b) => (a.position || 0) - (b.position || 0));

/** Picks, per option, the first value that belongs to a purchasable variant. */
export const initialSelection = (product) => {
  const variants = activeVariantsOf(product);
  const selection = {};
  for (const option of optionsOf(product)) {
    const values = option.values.map((value) => String(value.value));
    const available = values.find((value) =>
      variants.some(
        (variant) =>
          String(variant.optionValues?.[option.name]) === value &&
          Object.entries(selection).every(([key, chosen]) => String(variant.optionValues?.[key]) === chosen) &&
          getStockState(variant, product).purchasable
      )
    );
    selection[option.name] = available ?? values[0];
  }
  return selection;
};

/**
 * Price, availability, variant options, quantity and add-to-cart for one
 * product. Purely driven by the API product; `onAdd` performs the cart call.
 */
export function ProductPurchasePanel({ product, onAdd }) {
  const { t } = useI18n();
  const variants = useMemo(() => activeVariantsOf(product), [product]);
  const options = useMemo(() => optionsOf(product), [product]);
  const hasVariants = variants.length > 0;

  const [selected, setSelected] = useState(() => initialSelection(product));
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState({ state: 'idle', error: '' });

  const variant = hasVariants ? findVariant(variants, selected) : null;
  const stock = hasVariants
    ? variant
      ? getStockState(variant, product)
      : { purchasable: false, maxQuantity: 0, lowStock: false, available: null }
    : getStockState(product);
  const price = variant ? toAmount(variant.price) || toAmount(product.price) : toAmount(product.price);
  const compareAt = variant?.compareAtPrice ?? product.compareAtPrice;
  const effectiveQuantity = clampQuantity(quantity, stock.maxQuantity);
  const canAdd = stock.purchasable && effectiveQuantity > 0 && status.state !== 'adding';

  const isValueAvailable = (optionName, value) =>
    !hasVariants ||
    variants.some((candidate) => {
      const next = { ...selected, [optionName]: value };
      return (
        Object.entries(next).every(([key, chosen]) => String(candidate.optionValues?.[key]) === String(chosen)) &&
        getStockState(candidate, product).purchasable
      );
    });

  const choose = (optionName, value) => {
    setSelected((current) => ({ ...current, [optionName]: value }));
    setStatus({ state: 'idle', error: '' });
  };

  const add = async (event) => {
    event.preventDefault();
    if (!canAdd) return;
    setStatus({ state: 'adding', error: '' });
    try {
      await onAdd({
        product,
        variantId: variant?.id,
        quantity: effectiveQuantity,
        selectedOptions: hasVariants ? selected : {},
      });
      setStatus({ state: 'added', error: '' });
      window.setTimeout(() => setStatus((current) => (current.state === 'added' ? { state: 'idle', error: '' } : current)), 2000);
    } catch (error) {
      setStatus({ state: 'idle', error: getApiErrorMessage(error, t('cart.updateFailed')) });
    }
  };

  return (
    <form onSubmit={add} className="space-y-6" aria-label={product.name}>
      <div className="space-y-2">
        <Price amount={price} compareAt={compareAt} size="lg" />
        {hasVariants && !variant ? (
          <p className="text-sm font-medium text-error">{t('product.combinationUnavailable')}</p>
        ) : (
          <StockLabel stock={stock} className="text-sm" />
        )}
      </div>

      {hasVariants &&
        options.map((option) => (
          <fieldset key={option.id || option.name}>
            <legend className="mb-2 text-sm font-medium text-foreground">
              {option.name}
              <span className="ml-2 font-normal text-muted-foreground">{selected[option.name]}</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {option.values.map((entry) => {
                const value = String(entry.value);
                const label = entry.label || value;
                const available = isValueAvailable(option.name, value);
                const checked = String(selected[option.name]) === value;
                const swatch = option.type === 'color' ? sanitizeColor(entry.hexCode) : null;
                return (
                  <label
                    key={value}
                    className={`relative inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${
                      checked ? 'border-primary bg-primary/5 font-semibold text-foreground' : 'border-border bg-card text-foreground hover:border-foreground/30'
                    } ${available ? '' : 'text-muted-foreground line-through opacity-60'}`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name={`option-${option.name}`}
                      value={value}
                      checked={checked}
                      onChange={() => choose(option.name, value)}
                      aria-label={`${option.name}: ${label}${available ? '' : ` (${t('product.outOfStock')})`}`}
                    />
                    {swatch && <span className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: swatch }} aria-hidden="true" />}
                    <span aria-hidden="true">{label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <QuantityStepper
          label={t('product.quantity')}
          value={Math.max(effectiveQuantity, 1)}
          max={stock.maxQuantity}
          onChange={setQuantity}
          disabled={!stock.purchasable}
        />
        <button type="submit" className="btn-primary min-h-12 flex-1 text-base" disabled={!canAdd}>
          {status.state === 'adding' ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : status.state === 'added' ? (
            <Check className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
          )}
          {!stock.purchasable && !(hasVariants && !variant)
            ? t('product.outOfStock')
            : status.state === 'adding'
              ? t('product.adding')
              : status.state === 'added'
                ? t('product.added')
                : t('product.addToCart')}
        </button>
      </div>

      {status.error && (
        <p role="alert" className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
          {status.error}
        </p>
      )}
    </form>
  );
}
