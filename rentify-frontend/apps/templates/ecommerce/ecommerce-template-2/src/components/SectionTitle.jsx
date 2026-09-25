import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useI18n } from '../i18n';

/** Editorial section heading: serif title with an optional "View all" link. */
export function SectionTitle({ id, title, to, linkLabel, as: Heading = 'h2', className = '' }) {
  const { t } = useI18n();
  return (
    <div className={`mb-5 flex items-end justify-between gap-4 sm:mb-6 ${className}`}>
      <Heading id={id} className="font-display text-2xl font-medium text-foreground sm:text-[2rem] sm:leading-tight">
        {title}
      </Heading>
      {to && (
        <Link
          to={to}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full py-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          {linkLabel ? (
            <>
              <span className="sm:hidden">{t('home.viewAll')}</span>
              <span className="hidden sm:inline">{linkLabel}</span>
            </>
          ) : (
            t('home.viewAll')
          )}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
