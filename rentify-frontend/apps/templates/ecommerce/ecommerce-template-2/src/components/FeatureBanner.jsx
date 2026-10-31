import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { OwnerEditButton } from '@rentify/storefront/owner/StorefrontOwner';
import { useI18n } from '../i18n';

export function FeatureBanner({ feature }) {
  const { t } = useI18n();
  const { eyebrow, title, text, image, buttonText, link, note } = feature;
  const action = <>{buttonText || t('home.shopNow')}<ArrowRight className="h-4 w-4" aria-hidden="true" /></>;
  const button = 'btn min-h-12 border border-primary-foreground/40 bg-card px-6 text-foreground hover:bg-background';
  return (
    <section aria-labelledby="feature-title" className="store-container">
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/30 via-accent to-card">
        <OwnerEditButton section="Feature Banner" className="absolute right-4 top-4 z-20" />
        <div className="grid items-center lg:grid-cols-2">
          <div className="relative z-10 p-7 sm:p-12 lg:p-16">
            {eyebrow && <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>}
            <h2 id="feature-title" className="font-display text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">{title}</h2>
            {text && <p className="mt-5 max-w-md text-base text-muted-foreground">{text}</p>}
            <div className="mt-8">{link.external ? <a href={link.to} target="_blank" rel="noopener noreferrer" className={button}>{action}</a> : <Link to={link.to} className={button}>{action}</Link>}</div>
            {note && <p className="mt-6 text-sm font-semibold text-foreground">{note}</p>}
          </div>
          <div className="relative aspect-[16/9] overflow-hidden lg:aspect-auto lg:min-h-[22rem] lg:self-stretch">
            {image ? <img src={image} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" /> : <div className="flex h-full min-h-[12rem] items-center justify-center" aria-hidden="true"><Sparkles className="h-20 w-20 text-primary/40" strokeWidth={1} /></div>}
          </div>
        </div>
      </div>
    </section>
  );
}
