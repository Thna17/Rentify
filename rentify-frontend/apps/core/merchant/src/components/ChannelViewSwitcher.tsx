import { LayoutGrid, MonitorSmartphone, ShoppingBag, Store } from 'lucide-react';
import { useTranslation } from '@rentify/utils';
import { useChannels, type ChannelView } from '../context/ChannelContext';

const VIEW_ICON: Record<ChannelView, typeof LayoutGrid> = {
  all: LayoutGrid,
  marketplace: ShoppingBag,
  storefront: Store,
  pos: MonitorSmartphone,
};

/** True when the Store sells through more than one channel, so there is something to switch. */
export const useHasChannelChoice = () => useChannels().availableViews.length > 2;

/**
 * Focus the whole dashboard on one sales channel, or see everything together.
 * Hidden when the Store only sells through one channel — there is nothing to switch.
 */
export function ChannelViewSwitcher({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const { view, setView, availableViews } = useChannels();
  if (availableViews.length <= 2) return null;

  return (
    <div
      role="radiogroup"
      aria-label={t('merchant.shell.channelView.label')}
      className={`inline-flex w-max items-center gap-0.5 rounded-xl bg-muted p-0.5 ${className}`}
    >
      {availableViews.map((key) => {
        const Icon = VIEW_ICON[key];
        const active = view === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setView(key)}
            className={`inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-[10px] px-3 text-sm font-semibold transition-colors ${
              active ? 'bg-card text-foreground shadow-[var(--shadow-soft)]' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {t(`merchant.shell.channelView.${key}`)}
          </button>
        );
      })}
    </div>
  );
}

export default ChannelViewSwitcher;
