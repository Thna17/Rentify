import React, { useState } from 'react';
import {
  Copy,
  Check,
  Send,
  Share2,
  QrCode,
  Download,
  Printer,
  ExternalLink,
  Store,
  ShoppingBag,
} from 'lucide-react';
import { useTranslation } from '@rentify/utils';
import { Button } from '@rentify/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@rentify/shared/ui/card';
import { toast } from 'sonner';
import { useChannels } from '../../context/ChannelContext';
import { marketplaceStoreUrl, storefrontUrl } from '../../utils/storeLinks';
import qrcode from 'qrcode-generator/dist/qrcode.js';

export const SharePage: React.FC = () => {
  const { t } = useTranslation();
  const { store, hasMarketplace, hasStorefront } = useChannels();
  const storeLike = store as Parameters<typeof marketplaceStoreUrl>[0];

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const marketUrl = marketplaceStoreUrl(storeLike) || 'https://market.rentify.com';
  const onlineStoreUrl = storefrontUrl(storeLike) || 'https://rentifystore.shop';

  const handleCopy = async (url: string, key: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(key);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleDownloadQr = (url: string, filename: string) => {
    try {
      const qr = qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      const link = document.createElement('a');
      link.href = qr.createDataURL(8, 4);
      link.download = filename;
      link.click();
      toast.success('QR code downloaded');
    } catch {
      toast.error('Failed to generate QR code');
    }
  };

  const shareTargets = [
    {
      key: 'market',
      title: 'Rentify Market page',
      description: 'Your verified listing on the central Rentify marketplace',
      url: marketUrl,
      icon: ShoppingBag,
      visible: hasMarketplace ?? true,
    },
    {
      key: 'storefront',
      title: 'Online store',
      description: 'Your branded custom website storefront',
      url: onlineStoreUrl,
      icon: Store,
      visible: hasStorefront ?? true,
    },
  ].filter((t) => t.visible);

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Share your store
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Promote your store to customers on social media, chat apps, and in-person counters.
          </p>
        </div>

        {/* Share Cards (Screen M20) */}
        <div className="space-y-4">
          {shareTargets.map((target) => {
            const encodedUrl = encodeURIComponent(target.url);
            const telegramUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(`Check out ${store?.name || 'our store'} on Rentify!`)}`;
            const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;

            return (
              <Card
                key={target.key}
                className="border border-[var(--rentify-color-border-subtle,#ece8e1)] bg-card shadow-[var(--shadow-soft)] overflow-hidden"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-muted/40 border border-border/50 text-muted-foreground shrink-0">
                      <target.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold text-foreground">
                        {target.title}
                      </CardTitle>
                      <p className="text-xs font-mono text-muted-foreground break-all mt-0.5">
                        {target.url}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-1">
                  {/* Full 44px WCAG touch-target buttons in a responsive 2x2 grid (Screen M20) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleCopy(target.url, target.key)}
                      className="min-h-[44px] h-11 text-xs sm:text-sm font-medium flex items-center justify-center gap-2"
                    >
                      {copiedKey === target.key ? (
                        <>
                          <Check className="h-4 w-4 text-[var(--rentify-color-success-text)]" />
                          <span className="text-[var(--rentify-color-success-text)] font-semibold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>Copy link</span>
                        </>
                      )}
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      className="min-h-[44px] h-11 text-xs sm:text-sm font-medium"
                    >
                      <a href={telegramUrl} target="_blank" rel="noopener noreferrer">
                        <Send className="h-4 w-4 mr-2 text-[var(--rentify-color-info-text)]" />
                        <span>Telegram</span>
                      </a>
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      className="min-h-[44px] h-11 text-xs sm:text-sm font-medium"
                    >
                      <a href={facebookUrl} target="_blank" rel="noopener noreferrer">
                        <Share2 className="h-4 w-4 mr-2 text-primary-strong" />
                        <span>Facebook</span>
                      </a>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        handleDownloadQr(
                          target.url,
                          `${store?.slug || 'rentify'}-${target.key}-qr.png`
                        )
                      }
                      className="min-h-[44px] h-11 text-xs sm:text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <QrCode className="h-4 w-4 text-foreground" />
                      <span>QR code</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Print a poster (Screen M20 Note 1) */}
        <div className="space-y-3 pt-2">
          <h3 className="text-base font-semibold text-foreground px-1">Print a poster</h3>

          <Card className="border border-[var(--rentify-color-border-subtle,#ece8e1)] bg-card shadow-[var(--shadow-soft)] p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="h-24 w-20 rounded-xl border border-dashed border-border flex flex-col items-center justify-center bg-muted/20 shrink-0 text-center p-2">
                  <QrCode className="h-7 w-7 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground font-mono mt-1">A4 / A5</span>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-foreground">
                    Tabletop or Window Poster
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    &ldquo;Scan to shop · Cash on delivery &amp; KHQR&rdquo;
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ready-to-print PDF with your QR code and store branding for your physical counter.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  handleDownloadQr(marketUrl, `${store?.slug || 'rentify'}-counter-poster.png`)
                }
                className="min-h-[44px] h-11 px-5 w-full sm:w-auto font-medium shrink-0 flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4" />
                <span>Download poster</span>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SharePage;
