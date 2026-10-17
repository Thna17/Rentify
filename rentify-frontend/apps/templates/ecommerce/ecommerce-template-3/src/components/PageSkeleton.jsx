import { useI18n } from '../i18n';
import { ProductGridSkeleton } from './ProductGrid';

/** Loading placeholder shaped like the editorial hero and a product row. */
export function PageSkeleton() {
  const { t } = useI18n();
  return (
    <div className="store-container py-10 sm:py-14">
      <span className="sr-only" role="status">
        {t('common.loading')}
      </span>
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]" aria-hidden="true">
        <div className="space-y-4">
          <div className="h-3 w-40 animate-pulse rounded bg-muted" />
          <div className="h-12 w-4/5 animate-pulse rounded-lg bg-muted" />
          <div className="h-12 w-3/5 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-12 w-36 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="mx-auto aspect-[4/5] w-full max-w-[19rem] animate-pulse rounded-t-full bg-muted sm:max-w-sm lg:mr-0 lg:max-w-[26rem]" />
      </div>
      <ProductGridSkeleton count={5} layout="rail" className="mt-14" />
    </div>
  );
}
