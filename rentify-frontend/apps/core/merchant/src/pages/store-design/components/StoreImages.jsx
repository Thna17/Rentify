import { useState } from 'react';
import { useUploadImageMutation } from '@rentify/apis/apis/websiteApi';
import { getStoreIdentity } from '@rentify/storefront/content';

/** The existing upload API creates missing logo/banner content for new stores. */
export function StoreImages({ websiteId, content, onSaved, t }) {
  const identity = getStoreIdentity(content);
  const [upload, { isLoading }] = useUploadImageMutation();
  const [message, setMessage] = useState('');
  const replace = async (event, kind) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage('');
    try {
      const result = await upload({ websiteId, file, ...(kind === 'logo' ? { isLogo: true } : { type: 'cover' }) }).unwrap();
      if (!result?.url) throw new Error('No image URL');
      setMessage(t('merchant.storeDesign.images.saved'));
      onSaved?.();
    } catch { setMessage(t('merchant.storeDesign.images.error')); }
    finally { event.target.value = ''; }
  };
  return <section className="space-y-4 border-b border-border pb-6">
    <h2 className="text-sm font-semibold">{t('merchant.storeDesign.images.title')}</h2>
    {['logo', 'banner'].map((kind) => {
      const src = kind === 'logo' ? identity.logoUrl : identity.heroImages[0];
      return <label key={kind} className="block space-y-2 text-sm"><span className="block font-medium">{t(`merchant.storeDesign.images.${kind}`)}</span>
        {src && <img src={src} alt="" className={kind === 'logo' ? 'h-16 w-16 rounded-lg border border-border object-contain' : 'aspect-[3/1] w-full rounded-lg border border-border object-cover'} />}
        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={isLoading} onChange={(event) => replace(event, kind)} className="block w-full min-w-0 text-xs file:mr-3 file:min-h-11 file:rounded-lg file:border file:border-border file:bg-card file:px-3 file:text-foreground" />
      </label>;
    })}
    <p className="text-xs text-muted-foreground">{t('merchant.storeDesign.images.hint')}</p>
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}
