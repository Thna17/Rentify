import { Link } from 'react-router-dom';
import { ArrowUp, Mail, MapPin, Phone } from 'lucide-react';
import { useStorefrontCategories, useStorefrontWebsite } from '@rentify/storefront/website';
import { useI18n } from '../i18n';
import { PATHS, catalogPath } from '../paths';
import { KhmerSkyline, LotusOrnament } from './decor/Artwork';
import { SocialIcons } from './SocialIcons';
import { StoreMark } from './StoreMark';
import { PaymentMethods } from './PaymentMethods';

function Column({ title, children }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm">{children}</ul>
    </div>
  );
}

const link = 'rounded text-muted-foreground transition-colors hover:text-primary';

/**
 * Light editorial footer over a faint temple skyline. Columns list the real
 * categories, customer pages and only the contact details and social links
 * the merchant has provided.
 */
export function Footer() {
  const { t } = useI18n();
  const { identity } = useStorefrontWebsite();
  const { categories } = useStorefrontCategories();
  const year = new Date().getFullYear();
  const telHref = identity.phone ? `tel:${identity.phone.replace(/[^\d+]/g, '')}` : null;
  const hasSocial = identity.socialLinks.length > 0;

  return (
    <footer className="relative mt-16 overflow-hidden border-t border-border bg-accent/60 sm:mt-20">
      <KhmerSkyline className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full text-primary opacity-60 sm:h-40" />

      <div className={`store-container relative grid gap-10 py-12 sm:grid-cols-2 sm:py-14 ${hasSocial ? 'lg:grid-cols-[1.5fr_1fr_1fr_1fr]' : 'lg:grid-cols-[1.5fr_1fr_1fr]'}`}>
        <div>
          <Link to={PATHS.HOME} className="inline-flex items-center gap-3 rounded-full">
            <StoreMark identity={identity} size="lg" />
          </Link>
          {identity.heroSubtitle && <p className="mt-4 max-w-xs text-sm text-muted-foreground">{identity.heroSubtitle}</p>}
        </div>

        <Column title={t('footer.shop')}>
          <li>
            <Link to={PATHS.PRODUCTS} className={link}>
              {t('nav.shopAll')}
            </Link>
          </li>
          {categories.slice(0, 6).map((category) => (
            <li key={category.id}>
              <Link to={catalogPath({ category: category.id })} className={link}>
                {category.name}
              </Link>
            </li>
          ))}
        </Column>

        <Column title={t('footer.help')}>
          <li>
            <Link to={PATHS.ACCOUNT} className={link}>
              {t('nav.account')}
            </Link>
          </li>
          <li>
            <Link to={PATHS.CART} className={link}>
              {t('nav.cart')}
            </Link>
          </li>
          {identity.phone && (
            <li className="flex gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <a href={telHref} className={link}>
                {identity.phone}
              </a>
            </li>
          )}
          {identity.email && (
            <li className="flex gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <a href={`mailto:${identity.email}`} className={`${link} break-all`}>
                {identity.email}
              </a>
            </li>
          )}
          {identity.location && (
            <li className="flex gap-2 text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {identity.location}
            </li>
          )}
        </Column>

        {hasSocial && (
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t('footer.followUs')}</h2>
            <SocialIcons
              links={identity.socialLinks}
              label={t('footer.followUs')}
              className="mt-4"
              itemClassName="flex h-10 w-10 items-center justify-center rounded-full border border-foreground/20 bg-card text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
            />
          </div>
        )}
      </div>

      <div className="store-container relative">
        <PaymentMethods className="border-t border-foreground/10 py-5" />
        <div className="flex flex-col items-center gap-4 border-t border-foreground/10 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <p>
            {identity.copyright || `© ${year} ${identity.name}`}
            {!/rentify/i.test(identity.copyright) && <span> · {t('footer.poweredBy')}</span>}
          </p>
          <LotusOrnament className="hidden h-5 w-5 text-primary/60 sm:block" />
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-card px-4 py-2 font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            {t('footer.backToTop')}
          </button>
        </div>
      </div>
    </footer>
  );
}
