import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '@rentify/utils';
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Info,
  Loader2,
  Lock,
  Package,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@rentify/shared/ui/button';
import { RENTIFY_API_BASE } from '@rentify/shared/config/urls';
import { useChannels } from '../../context/ChannelContext';
import { PageShell, PageTitle, Panel } from '../../components/page/PagePrimitives';
import { marketplaceStoreUrl } from '../../utils/storeLinks';

export const CANONICAL_MARKETPLACE_COLORS = [
  { value: '#4f46e5', labelKey: 'merchant.marketplace.colors.indigo', defaultLabel: 'Indigo', hex: '#4F46E5' },
  { value: '#275643', labelKey: 'merchant.marketplace.colors.forest', defaultLabel: 'Forest', hex: '#275643' },
  { value: '#963827', labelKey: 'merchant.marketplace.colors.clay', defaultLabel: 'Clay', hex: '#963827' },
  { value: '#9a691b', labelKey: 'merchant.marketplace.colors.gold', defaultLabel: 'Gold', hex: '#9A691B' },
  { value: '#263750', labelKey: 'merchant.marketplace.colors.midnight', defaultLabel: 'Midnight', hex: '#263750' },
] as const;

export function MarketplaceCustomization() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { store, setStore } = useChannels();

  const currentSavedColor = store?.marketplaceColor || CANONICAL_MARKETPLACE_COLORS[0].value;
  const [selectedColor, setSelectedColor] = useState<string>(currentSavedColor);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (store?.marketplaceColor) {
      setSelectedColor(store.marketplaceColor);
    }
  }, [store?.marketplaceColor]);

  const hasChanges = selectedColor.toLowerCase() !== currentSavedColor.toLowerCase();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${RENTIFY_API_BASE}/api/stores/mine`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketplaceColor: selectedColor }),
      });

      const result = await response.json();
      if (!response.ok || !result.data) {
        throw new Error(result.error || t('merchant.marketplace.saveError'));
      }

      setStore((prev: any) => ({ ...prev, ...result.data }));
      toast.success(t('merchant.marketplace.saveSuccess'));
    } catch (err: any) {
      toast.error(err?.message || t('merchant.marketplace.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevert = () => {
    setSelectedColor(currentSavedColor);
  };

  const storeName = store?.name || 'Your Store';
  const storeSlug = store?.slug || 'your-store';
  const categoryName = store?.primaryCategory || 'General Merchandise';
  const externalUrl = marketplaceStoreUrl(store);

  return (
    <PageShell width="wide">
      <PageTitle
        back={{ to: '/marketplace', label: t('merchant.marketplace.backToMarketplace') }}
        title={t('merchant.marketplace.customizationTitle')}
        description={t('merchant.marketplace.customizationSubtitle')}
      />

      <div className="grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)] items-start">
        {/* Left Column: Color Controls & Actions */}
        <div className="space-y-6">
          <Panel className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {t('merchant.marketplace.colorLabel')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('merchant.marketplace.colorDescription')}
              </p>
            </div>

            <div
              role="radiogroup"
              aria-label={t('merchant.marketplace.colorLabel')}
              className="grid gap-2.5"
            >
              {CANONICAL_MARKETPLACE_COLORS.map((item) => {
                const isSelected = selectedColor.toLowerCase() === item.value.toLowerCase();
                const label = t(item.labelKey, item.defaultLabel);
                return (
                  <button
                    key={item.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedColor(item.value)}
                    className={`flex min-h-[52px] items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20 bg-muted/40 font-semibold shadow-sm'
                        : 'border-border bg-card hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white shadow-sm ring-1 ring-black/10"
                        style={{ backgroundColor: item.value }}
                      >
                        {isSelected && <Check className="h-4 w-4 stroke-[2.5]" />}
                      </span>
                      <div>
                        <div className="text-sm text-foreground">{label}</div>
                        <div className="text-xs text-muted-foreground font-mono">{item.hex}</div>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 text-xs text-muted-foreground flex items-start gap-2.5">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" aria-hidden="true" />
              <p className="leading-relaxed">
                Rentify Marketplace applies this accent color to your store badge, action buttons, and storefront banner in the shared marketplace.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                className="min-h-[44px] w-full rounded-xl font-semibold"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    {t('merchant.common.saving')}
                  </>
                ) : (
                  t('merchant.common.save')
                )}
              </Button>

              {hasChanges && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleRevert}
                  disabled={isSaving}
                  className="min-h-[44px] w-full rounded-xl text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                  Revert changes
                </Button>
              )}
            </div>
          </Panel>
        </div>

        {/* Right Column: Live Marketplace Browser Mockup Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t('merchant.marketplace.previewTitle')}
            </h2>
            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>Open marketplace</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
            {/* Simulated Browser Chrome Top Bar */}
            <div className="flex items-center gap-3 border-b border-border bg-muted/60 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-border" />
                <div className="h-2.5 w-2.5 rounded-full bg-border" />
                <div className="h-2.5 w-2.5 rounded-full bg-border" />
              </div>
              <div className="flex flex-1 items-center justify-center">
                <div className="flex max-w-sm flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-1 text-xs text-muted-foreground shadow-xs">
                  <Lock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate font-mono">rentifymarket.com/store/{storeSlug}</span>
                </div>
              </div>
            </div>

            {/* Accent Color Band */}
            <div
              className="h-2.5 w-full transition-colors duration-200"
              style={{ backgroundColor: selectedColor }}
            />

            {/* Marketplace Simulated Viewport */}
            <div className="p-6 space-y-6 bg-muted/10 min-h-[460px]">
              {/* Marketplace Header Simulation */}
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div className="flex items-center gap-2">
                  <div
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-xs"
                    style={{ backgroundColor: selectedColor }}
                  >
                    R
                  </div>
                  <span className="font-bold text-sm tracking-tight text-foreground">Rentify Market</span>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border px-2.5 py-1 bg-card">Phnom Penh</span>
                  <span className="rounded-full border border-border px-2.5 py-1 bg-card flex items-center gap-1">
                    <Truck className="h-3 w-3" /> Flat $1.00 Delivery
                  </span>
                </div>
              </div>

              {/* Store Profile Card Preview */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-md ring-4 ring-card"
                      style={{ backgroundColor: selectedColor }}
                    >
                      {storeName.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-foreground">{storeName}</h3>
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={{
                            backgroundColor: `${selectedColor}18`,
                            color: selectedColor,
                          }}
                        >
                          <ShieldCheck className="h-3 w-3" />
                          {t('merchant.marketplace.verifiedMerchant')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{categoryName} · ★ 5.0 (New)</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-95 active:scale-95 shrink-0"
                    style={{ backgroundColor: selectedColor }}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    {t('merchant.marketplace.shopProducts')}
                  </button>
                </div>

                {/* Delivery Guarantee Strip */}
                <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-muted/30 px-3.5 py-2.5 text-xs text-muted-foreground">
                  <Truck className="h-4 w-4 shrink-0 text-foreground" />
                  <span>
                    Flat <strong className="text-foreground">$1.00</strong> delivery across Phnom Penh. Paid on delivery or via CutLuy KHQR.
                  </span>
                </div>
              </div>

              {/* Simulated Product Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>FEATURED PRODUCTS</span>
                  <span>ALL IN STOCK</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { name: 'Signature Item 01', price: '$12.00', stock: '24 in stock' },
                    { name: 'Premium Pack', price: '$25.00', stock: '8 in stock' },
                    { name: 'Special Reserve', price: '$18.50', stock: '15 in stock' },
                  ].map((product, idx) => (
                    <div
                      key={idx}
                      className="group rounded-xl border border-border bg-card p-3 shadow-xs space-y-2.5"
                    >
                      <div className="aspect-square w-full rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground/40 group-hover:bg-muted/80 transition-colors">
                        <Package className="h-8 w-8 stroke-[1.5]" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground truncate">{product.name}</div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs font-bold text-foreground">{product.price}</span>
                          <span className="text-[10px] text-muted-foreground">{product.stock}</span>
                        </div>
                      </div>
                      <div
                        className="w-full rounded-lg py-1.5 text-center text-[11px] font-semibold border transition-all text-foreground"
                        style={{
                          borderColor: `${selectedColor}40`,
                        }}
                      >
                        Add to cart
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

export default MarketplaceCustomization;
