import { LayoutGrid, MonitorSmartphone, ShoppingBag, Store } from 'lucide-react';
import { useChannels, type ChannelView } from '../context/ChannelContext';

const VIEW_META: Record<ChannelView, { label: string; icon: typeof LayoutGrid }> = {
  all: { label: 'All channels', icon: LayoutGrid },
  marketplace: { label: 'Marketplace', icon: ShoppingBag },
  storefront: { label: 'Online store', icon: Store },
  pos: { label: 'POS', icon: MonitorSmartphone },
};

/**
 * Focus the whole dashboard on one sales channel, or see everything together.
 * Hidden when the Store only sells through one channel — there is nothing to switch.
 */
export function ChannelViewSwitcher({ className = '' }: { className?: string }) {
  const { view, setView, availableViews } = useChannels();
  if (availableViews.length <= 2) return null;

  return (
    <div
      role="radiogroup"
      aria-label="Dashboard channel"
      className={`flex w-max items-center gap-1 rounded-2xl bg-muted p-1 ${className}`}
    >
      {availableViews.map((key) => {
        const { label, icon: Icon } = VIEW_META[key];
        const active = view === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setView(key)}
            className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-[13px] font-semibold transition-colors ${
              active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export const channelViewLabel = (view: ChannelView) => VIEW_META[view].label;

export default ChannelViewSwitcher;
