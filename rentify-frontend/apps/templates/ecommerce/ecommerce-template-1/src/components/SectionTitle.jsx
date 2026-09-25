import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useI18n } from '../i18n';
import { LotusOrnament } from './decor/Artwork';

/** Section heading: lotus ornament, title, fading rule and optional "View all". */
export function SectionTitle({ id, title, to, action = null, as: Heading = 'h2' }) {
  const { t } = useI18n();
  return (
    <div className="mb-4 flex items-center gap-2.5 sm:mb-5">
      <LotusOrnament className="h-5 w-5 shrink-0 text-primary" />
      <Heading id={id} className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
        {title}
      </Heading>
      {action}
      <span className="h-px flex-1 bg-gradient-to-r from-primary/40 via-primary/15 to-transparent" aria-hidden="true" />
      {to && (
        <Link to={to} className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold text-primary hover:bg-primary/10">
          {t('home.viewAll')}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
