import { formatMoney, toAmount } from '@rentify/storefront/commerce';

/** Current price, with the merchant's compare-at price only when it is actually higher. */
export function Price({ amount, compareAt, currency = 'USD', size = 'md', className = '' }) {
  const current = toAmount(amount);
  const previous = toAmount(compareAt);
  const sizes = { sm: 'text-sm', md: 'text-base', lg: 'text-2xl' };

  return (
    <p className={`flex flex-wrap items-baseline gap-x-2 ${className}`}>
      <span className={`font-semibold tabular-nums text-foreground ${sizes[size] || sizes.md}`}>
        {formatMoney(current, currency)}
      </span>
      {previous > current && (
        <s className="text-sm tabular-nums text-muted-foreground">{formatMoney(previous, currency)}</s>
      )}
    </p>
  );
}
