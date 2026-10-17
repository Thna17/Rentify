import { Clock3, MapPin, Navigation, Phone } from 'lucide-react';
import { OwnerEditButton } from '@rentify/storefront/owner/StorefrontOwner';
import { useI18n } from '../i18n';
import { OpenStatus } from './OpenStatus';
import { SteamCup } from './decor/Artwork';

/** Monday-first index of today, matching the parsed opening hours. */
const todayIndex = () => (new Date().getDay() + 6) % 7;

/**
 * "Visit us": opening hours (today's line highlighted), address, phone and a
 * directions button — each shown only when the merchant has provided it.
 */
export function VisitSection({ visit, identity }) {
  const { t } = useI18n();
  const { hours, mapUrl, title } = visit;
  const today = todayIndex();
  const telHref = identity.phone ? `tel:${identity.phone.replace(/[^\d+]/g, '')}` : null;

  return (
    <section id="visit" aria-labelledby="visit-title" className="store-container relative">
      <OwnerEditButton section="Visit Us" className="absolute -top-11 right-4 sm:right-6 lg:right-8" />
      <div className="relative grid overflow-hidden rounded-[2rem] bg-secondary text-secondary-foreground lg:grid-cols-[1.1fr_1fr]">
        <SteamCup className="pointer-events-none absolute -bottom-12 -right-8 h-56 w-56 text-secondary-foreground/[0.06]" />

        <div className="relative p-7 sm:p-10 lg:p-12">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary-foreground/70">{t('visit.eyebrow')}</p>
            <OpenStatus hours={hours} onDark />
          </div>
          <h2 id="visit-title" className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {title || t('visit.title')}
          </h2>

          <ul className="mt-7 space-y-4 text-sm sm:text-base">
            {identity.location && (
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 opacity-70" aria-hidden="true" />
                <span className="whitespace-pre-line">{identity.location}</span>
              </li>
            )}
            {identity.phone && (
              <li className="flex gap-3">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 opacity-70" aria-hidden="true" />
                <a href={telHref} className="rounded underline-offset-4 hover:underline">
                  {identity.phone}
                </a>
              </li>
            )}
          </ul>

          {mapUrl && (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn mt-8 min-h-12 rounded-full bg-secondary-foreground px-7 text-secondary hover:bg-secondary-foreground/90"
            >
              <Navigation className="h-4 w-4" aria-hidden="true" />
              {t('visit.directions')}
            </a>
          )}
        </div>

        {hours.length > 0 && (
          <div className="relative border-t border-secondary-foreground/10 p-7 sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-secondary-foreground/70">
              <Clock3 className="h-4 w-4" aria-hidden="true" />
              {t('visit.hours')}
            </h3>
            <dl className="mt-5 divide-y divide-secondary-foreground/10">
              {hours.map((entry, index) => {
                const isToday = entry.days?.includes(today);
                return (
                  <div
                    key={`${entry.label}-${index}`}
                    className={`flex items-baseline justify-between gap-4 py-3 ${isToday ? 'font-semibold' : 'text-secondary-foreground/80'}`}
                  >
                    <dt className="flex items-center gap-2">
                      {entry.label}
                      {isToday && (
                        <span className="rounded-full bg-secondary-foreground/15 px-2 py-px text-[0.625rem] font-semibold uppercase tracking-wide">
                          {t('visit.today')}
                        </span>
                      )}
                    </dt>
                    <dd className="text-right tabular-nums">{entry.closed ? t('visit.closed') : entry.time}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        )}
      </div>
    </section>
  );
}
