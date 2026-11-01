import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Laptop, RefreshCw, Smartphone } from 'lucide-react';
import { PREVIEW_MESSAGE } from '@rentify/storefront/preview';
import { Button } from '@rentify/shared/ui/button';
import { Skeleton } from '@rentify/shared/ui/skeleton';

const DESKTOP_WIDTH = 1280;
const PHONE_WIDTH = 390;
const SLOW_AFTER_MS = 15000;

/** The merchant's live store at a fixed CSS width, scaled down to fit its column. */
function PreviewFrame({ src, width, height, layout, title, t }) {
  const boxRef = useRef(null);
  const frameRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [state, setState] = useState('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / width)));
    observer.observe(box);
    return () => observer.disconnect();
  }, [width]);

  useEffect(() => {
    setState('loading');
    const timer = setTimeout(() => setState((current) => (current === 'loading' ? 'slow' : current)), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [src, attempt]);

  // Layout changes reach the loaded store without a reload.
  useEffect(() => {
    if (state !== 'ready') return;
    frameRef.current?.contentWindow?.postMessage({ type: PREVIEW_MESSAGE, layout }, new URL(src).origin);
  }, [layout, state, src]);

  return (
    <div ref={boxRef} className="w-full">
      <div
        className="relative mx-auto overflow-hidden rounded-xl border border-border bg-background shadow-sm"
        style={{ width: width * scale, height: height * scale }}
      >
        <iframe
          key={attempt}
          ref={frameRef}
          src={src}
          title={title}
          onLoad={() => setState('ready')}
          className="origin-top-left border-0"
          style={{ width, height, transform: `scale(${scale})` }}
        />
        {state !== 'ready' && (
          <div className="absolute inset-0 flex flex-col gap-3 bg-card p-4" role="status" aria-live="polite">
            {state === 'loading' ? (
              <>
                <span className="sr-only">{t('merchant.storeDesign.preview.loading')}</span>
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-40 w-full" />
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                </div>
              </>
            ) : (
              <div className="m-auto flex max-w-xs flex-col items-center gap-3 text-center">
                <p className="text-sm font-medium text-foreground">{t('merchant.storeDesign.preview.slowTitle')}</p>
                <p className="text-sm text-muted-foreground">{t('merchant.storeDesign.preview.slowBody')}</p>
                <Button variant="outline" className="h-11" onClick={() => setAttempt((value) => value + 1)}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  {t('merchant.storeDesign.preview.reload')}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Desktop and 360px phone previews side by side; one at a time on smaller screens. */
export function StorePreview({ storeUrl, templateId, layout, t }) {
  const [device, setDevice] = useState('desktop');
  const src = `${storeUrl.replace(/\/$/, '')}/?previewTemplate=${templateId}&previewLayout=${encodeURIComponent(layout)}`;
  // The layout travels by message after load, so it must not reload the frame.
  const [frameSrc, setFrameSrc] = useState(src);
  useEffect(() => setFrameSrc(src), [storeUrl, templateId]);

  const devices = [
    { value: 'desktop', label: t('merchant.storeDesign.preview.desktop'), icon: Laptop },
    { value: 'phone', label: t('merchant.storeDesign.preview.phone'), icon: Smartphone },
  ];

  return (
    <section aria-label={t('merchant.storeDesign.preview.label')} className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        {/* Device Switcher Toggle: Laptop vs Phone */}
        <div
          role="group"
          aria-label={t('merchant.storeDesign.preview.device')}
          className="inline-flex items-center rounded-xl border border-border bg-muted/60 p-1 shadow-sm"
        >
          {devices.map(({ value, label, icon: Icon }) => {
            const isActive = device === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={isActive}
                onClick={() => setDevice(value)}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <Button asChild variant="ghost" size="sm" className="h-9 gap-1.5 text-xs sm:text-sm">
          <a href={storeUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            {t('merchant.storeDesign.preview.openStore')}
          </a>
        </Button>
      </div>

      <div className="w-full">
        {device === 'desktop' ? (
          <div className="min-w-0 space-y-2">
            <PreviewFrame
              src={frameSrc}
              width={DESKTOP_WIDTH}
              height={850}
              layout={layout}
              title={t('merchant.storeDesign.preview.desktopFrame')}
              t={t}
            />
          </div>
        ) : (
          <div className="mx-auto max-w-[420px] space-y-2">
            <PreviewFrame
              src={frameSrc}
              width={PHONE_WIDTH}
              height={780}
              layout={layout}
              title={t('merchant.storeDesign.preview.phoneFrame')}
              t={t}
            />
          </div>
        )}
      </div>
    </section>
  );
}
