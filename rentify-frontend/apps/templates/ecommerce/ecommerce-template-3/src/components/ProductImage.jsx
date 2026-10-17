import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { useI18n } from '../i18n';

/** Product image with lazy loading and a neutral placeholder on missing/broken URLs. */
export function ProductImage({ src, alt, className = '', priority = false, sizes }) {
  const { t } = useI18n();
  const [failedSrc, setFailedSrc] = useState(null);

  if (!src || failedSrc === src) {
    return (
      <div
        role="img"
        aria-label={alt || t('product.noImage')}
        className={`flex items-center justify-center bg-muted text-muted-foreground/60 ${className}`}
      >
        <ImageOff className="h-8 w-8" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      fetchpriority={priority ? 'high' : undefined}
      decoding="async"
      onError={() => setFailedSrc(src)}
      className={`bg-muted object-cover ${className}`}
    />
  );
}
