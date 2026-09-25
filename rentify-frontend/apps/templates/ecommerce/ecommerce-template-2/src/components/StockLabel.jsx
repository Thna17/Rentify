import { useI18n } from '../i18n';

/**
 * Availability text derived from API stock data. `quiet` hides the plain
 * "In stock" state (used on product cards to keep them uncluttered).
 */
export function StockLabel({ stock, quiet = false, className = '' }) {
  const { t } = useI18n();
  if (!stock) return null;

  let tone = 'text-success';
  let text = t('product.inStock');
  if (!stock.purchasable) {
    tone = 'text-error';
    text = t('product.outOfStock');
  } else if (stock.lowStock && stock.available !== null) {
    tone = 'text-warning';
    text = t('product.lowStock', { count: stock.available });
  } else if (quiet) {
    return null;
  }

  return (
    <p className={`flex items-center gap-1.5 text-xs font-medium ${tone} ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {text}
    </p>
  );
}
