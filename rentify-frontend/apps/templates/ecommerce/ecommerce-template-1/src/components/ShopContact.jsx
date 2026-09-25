import { useState } from 'react';
import { Check, Facebook, Phone, Send, Share2 } from 'lucide-react';
import { useI18n } from '../i18n';

/**
 * "Ask the shop" panel on the product page. Uses only contact details the
 * merchant published (Telegram, Facebook, phone) and the browser's share sheet
 * (or a copied link) so shoppers can send the product to friends.
 */
export function ShopContact({ identity, productName }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const telegram = identity.socialLinks.find((link) => link.network === 'telegram');
  const facebook = identity.socialLinks.find((link) => link.network === 'facebook');
  const phone = identity.phone?.replace(/[^\d+]/g, '');
  const hasContact = Boolean(telegram || facebook || phone);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: productName, text: t('shop.shareText', { name: productName }), url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // The shopper dismissed the share sheet or clipboard access was denied.
    }
  };

  const action =
    'inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary';

  const shareButton = (
    <button type="button" onClick={share} className={action} aria-live="polite">
      {copied ? <Check className="h-4 w-4 text-success" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
      {copied ? t('shop.linkCopied') : t('shop.share')}
    </button>
  );

  if (!hasContact) return <div className="flex justify-end">{shareButton}</div>;

  return (
    <section aria-labelledby="ask-shop" className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="ask-shop" className="text-sm font-semibold text-foreground">
            {t('shop.askTitle')}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{t('shop.askBody')}</p>
        </div>
        {shareButton}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {telegram && (
          <a href={telegram.url} target="_blank" rel="noopener noreferrer" className={action}>
            <Send className="h-4 w-4" aria-hidden="true" />
            {t('shop.telegram')}
          </a>
        )}
        {facebook && (
          <a href={facebook.url} target="_blank" rel="noopener noreferrer" className={action}>
            <Facebook className="h-4 w-4" aria-hidden="true" />
            {t('shop.facebook')}
          </a>
        )}
        {phone && (
          <a href={`tel:${phone}`} className={action}>
            <Phone className="h-4 w-4" aria-hidden="true" />
            {t('shop.call', { phone: identity.phone })}
          </a>
        )}
      </div>
    </section>
  );
}
