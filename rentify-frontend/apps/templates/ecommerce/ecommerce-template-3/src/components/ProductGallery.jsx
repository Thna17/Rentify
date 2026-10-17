import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { ProductImage } from './ProductImage';

/** Swipeable main image with thumbnail buttons. */
export function ProductGallery({ images, name }) {
  const { t } = useI18n();
  const track = useRef(null);
  const [active, setActive] = useState(0);
  const list = images.length ? images : [{ url: null, alt: name }];
  const imageKey = list.map((image) => image.url).join('|');

  // Variant changes can swap the image set; start again from the first image.
  useEffect(() => {
    setActive(0);
    track.current?.scrollTo({ left: 0 });
  }, [imageKey]);

  const show = (index) => {
    setActive(index);
    const node = track.current;
    node?.scrollTo({ left: index * node.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="space-y-3" role="group" aria-label={t('product.gallery')}>
      <div
        ref={track}
        onScroll={(event) => {
          const node = event.currentTarget;
          if (node.clientWidth) setActive(Math.round(node.scrollLeft / node.clientWidth));
        }}
        className="scrollbar-none flex aspect-square snap-x snap-mandatory overflow-x-auto rounded-xl border border-border/70 bg-card"
      >
        {list.map((image, index) => (
          <div key={`${image.url}-${index}`} className="h-full w-full shrink-0 snap-center">
            <ProductImage
              src={image.url}
              alt={image.alt || name}
              priority={index === 0}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="h-full w-full"
            />
          </div>
        ))}
      </div>

      {list.length > 1 && (
        <ul className="scrollbar-none flex gap-2 overflow-x-auto">
          {list.map((image, index) => (
            <li key={`${image.url}-thumb-${index}`} className="shrink-0">
              <button
                type="button"
                onClick={() => show(index)}
                aria-label={t('product.showImage', { n: index + 1 })}
                aria-current={index === active ? 'true' : undefined}
                className={`block h-16 w-16 overflow-hidden rounded-lg border-2 sm:h-20 sm:w-20 ${
                  index === active ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <ProductImage src={image.url} alt="" className="h-full w-full" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
