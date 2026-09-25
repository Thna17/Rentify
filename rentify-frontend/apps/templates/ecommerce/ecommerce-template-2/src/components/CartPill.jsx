import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { formatMoney } from '@rentify/storefront/commerce';
import { useI18n } from '../i18n';
import { PATHS } from '../paths';

const HIDDEN_ON = [PATHS.CART, PATHS.CHECKOUT, '/confirmation/'];

/**
 * Floating cart summary for phones: item count and subtotal, one tap to the
 * cart. Only shown when the cart has items and not during checkout.
 */
export function CartPill({ totals, currency = 'USD' }) {
  const { t } = useI18n();
  const { pathname } = useLocation();
  if (!totals?.itemCount || HIDDEN_ON.some((path) => pathname.startsWith(path))) return null;
  const total = formatMoney(totals.subtotal, currency);

  return (
    <>
      {/* Keeps the footer clear of the floating pill; shares the footer colour so the page ends cleanly. */}
      <div className="h-20 bg-primary md:hidden" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-safe md:hidden">
        <Link
          to={PATHS.CART}
          aria-label={t('shop.cartPill', { count: totals.itemCount, total })}
          className="pointer-events-auto flex min-h-14 items-center gap-3 rounded-full bg-foreground py-2 pl-2 pr-5 text-background shadow-[0_12px_32px_-12px_oklch(var(--foreground)/0.6)]"
        >
          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-card px-1 text-[0.6875rem] font-bold text-foreground tabular-nums">
              {totals.itemCount > 99 ? '99+' : totals.itemCount}
            </span>
          </span>
          <span className="flex-1 text-sm font-semibold">{t('cart.view')}</span>
          <span className="text-base font-bold tabular-nums">{total}</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </>
  );
}
