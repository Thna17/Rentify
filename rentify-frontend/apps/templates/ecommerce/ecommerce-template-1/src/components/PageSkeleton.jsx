import { useI18n } from '../i18n';
import { ProductGridSkeleton } from './ProductGrid';

export function PageSkeleton() {
  const { t } = useI18n();
  return (
    <div className="store-container py-6 sm:py-8">
      <span className="sr-only" role="status">
        {t('common.loading')}
      </span>
      <div className="mb-6 aspect-[2/1] animate-pulse rounded-[1.75rem] bg-muted sm:aspect-[3/1] lg:aspect-[7/2]" aria-hidden="true" />
      <ProductGridSkeleton count={4} />
    </div>
  );
}
