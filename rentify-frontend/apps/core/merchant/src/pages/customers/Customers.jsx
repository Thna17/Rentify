import { useMemo, useState } from 'react';
import { Search, Users, Phone, MessageSquare, ArrowLeft, X, ShoppingBag, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '@rentify/shared/ui/input';
import { Button } from '@rentify/shared/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@rentify/shared/ui/sheet';
import { useCustomers } from '../../hooks/useCustomers';
import { useTranslation } from '@rentify/utils';
import { DataTable } from '../../components/data-table';
import { formatMoney } from '../../hooks/useChannelOrders';

const initials = (name) =>
  (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

const maskPhone = (phone) => {
  if (!phone) return '—';
  const clean = String(phone).trim();
  if (clean.length < 7) return clean;
  return `${clean.slice(0, 3)} *** ${clean.slice(-3)}`;
};

const CHANNEL_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'storefront', label: 'Online store' },
  { id: 'pos', label: 'POS' },
];

export const Customers = () => {
  const { t, formatDate } = useTranslation();
  const { customers, isLoading, isError, refetch } = useCustomers();
  const [query, setQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const visible = useMemo(() => {
    let list = customers;
    if (selectedChannel !== 'all') {
      list = list.filter((c) => c.channel === selectedChannel || !c.channel);
    }
    const term = query.trim().toLowerCase();
    if (!term) return list;
    return list.filter((c) =>
      [c.name, c.email, c.phone].some((value) => value?.toLowerCase().includes(term))
    );
  }, [customers, query, selectedChannel]);

  const columns = useMemo(() => [
    {
      id: 'customer',
      accessorFn: (c) => c.name || '',
      header: t('merchant.p.customer'),
      meta: { sortable: true, mobile: 'primary' },
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => setSelectedCustomer(row.original)}
          className="flex min-w-0 items-center gap-3 text-left transition hover:opacity-80"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary" aria-hidden="true">
            {initials(row.original.name)}
          </span>
          <span className="truncate font-medium text-foreground hover:underline">{row.original.name}</span>
        </button>
      ),
    },
    {
      id: 'contact',
      accessorFn: (c) => c.email || c.phone || '',
      header: t('merchant.p.contact'),
      meta: { mobileHideLabel: true, mobileCell: (c) => c.email || c.phone || null },
      cell: ({ row }) => (
        <span className="block min-w-0">
          <span className="block truncate text-foreground">{row.original.email || row.original.phone || '—'}</span>
          {row.original.email && row.original.phone && (
            <span className="block truncate text-xs text-muted-foreground">{row.original.phone}</span>
          )}
        </span>
      ),
    },
    {
      id: 'lastOrder',
      accessorFn: (c) => c.lastOrderAt || 0,
      header: t('merchant.table.customers.lastOrder'),
      meta: {
        sortable: true,
        mobileCell: (c) => (c.lastOrderAt ? `${t('merchant.table.customers.lastOrder')} ${formatDate(c.lastOrderAt, { dateStyle: 'medium' })}` : null),
      },
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{getValue() ? formatDate(getValue(), { dateStyle: 'medium' }) : '—'}</span>
      ),
    },
    {
      id: 'orders',
      accessorFn: (c) => c.orderCount,
      header: t('merchant.p.orders'),
      meta: { sortable: true, align: 'right', mobileCell: (c) => `${t('merchant.p.orders')} ${c.orderCount}` },
      cell: ({ getValue }) => <span className="tabular-nums text-foreground">{getValue()}</span>,
    },
    {
      id: 'totalSpent',
      accessorFn: (c) => c.totalSpent,
      header: t('merchant.p.totalSpent'),
      meta: { sortable: true, align: 'right', mobile: 'trailing' },
      cell: ({ getValue }) => <span className="font-medium tabular-nums text-foreground">${getValue().toFixed(2)}</span>,
    },
  ], [t, formatDate]);

  return (
    <div className="min-h-full">
      <div className="max-w-[1400px] mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('merchant.p.customers')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('merchant.p.everyoneWhoHasOrdered')}
          </p>
        </div>

        {/* Channel Filter Chips (wireframe M11) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {CHANNEL_CHIPS.map((chip) => {
            const active = selectedChannel === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setSelectedChannel(chip.id)}
                className={`inline-flex min-h-[36px] shrink-0 items-center rounded-full px-4 text-xs font-semibold transition-all ${
                  active
                    ? 'bg-foreground text-background shadow-sm'
                    : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        <DataTable
          title={t('merchant.table.customers.title')}
          ariaLabel={t('merchant.p.customers')}
          toolbar={customers.length > 0 && (
            <div className="relative w-full flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                aria-label={t('merchant.p.customers')}
                placeholder="Search name or phone"
                className="h-11 pl-9"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          )}
          columns={columns}
          data={visible}
          getRowId={(c) => c.key}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          errorTitle={t('merchant.table.customers.loadError')}
          empty={customers.length === 0
            ? { icon: Users, title: t('merchant.p.noCustomersYetThey'), body: '' }
            : { icon: Search, title: t('merchant.table.emptyTitle'), body: t('merchant.table.noMatchesBody') }}
          defaultPageSize={25}
          mobileInset="pl-12"
        />

        {/* Customer Detail Drawer (wireframe M12) */}
        <Sheet open={Boolean(selectedCustomer)} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
          <SheetContent side="right" className="w-full sm:max-w-md p-6 overflow-y-auto">
            {selectedCustomer && (
              <div className="space-y-6">
                <SheetHeader className="text-left space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                      {initials(selectedCustomer.name)}
                    </span>
                    <div>
                      <SheetTitle className="text-xl font-bold">{selectedCustomer.name}</SheetTitle>
                      <p className="text-xs text-muted-foreground">Customer</p>
                    </div>
                  </div>
                </SheetHeader>

                {/* Contact Card (wireframe M12: Masked phone + Call & Telegram actions) */}
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Phone number</p>
                    <p className="text-sm font-medium text-foreground tracking-wide font-mono">
                      {maskPhone(selectedCustomer.phone)}
                    </p>
                  </div>
                  {selectedCustomer.email && (
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium text-foreground">{selectedCustomer.email}</p>
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    {selectedCustomer.phone ? (
                      <a
                        href={`tel:${selectedCustomer.phone}`}
                        className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground transition hover:bg-muted"
                      >
                        <Phone className="h-4 w-4" />
                        Call
                      </a>
                    ) : (
                      <span className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card text-xs font-semibold text-muted-foreground opacity-50 cursor-not-allowed">
                        <Phone className="h-4 w-4" />
                        Call
                      </span>
                    )}
                    <a
                      href={selectedCustomer.phone ? `https://t.me/${selectedCustomer.phone.replace(/[^0-9]/g, '')}` : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground transition hover:bg-muted"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Telegram
                    </a>
                  </div>
                </div>

                {/* 3 KPI Tiles: Orders · Spent · Returns (wireframe M12) */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-border bg-card p-3 text-center">
                    <p className="text-xs text-muted-foreground">Orders</p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-foreground">{selectedCustomer.orderCount || 1}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3 text-center">
                    <p className="text-xs text-muted-foreground">Spent</p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-foreground">{formatMoney(selectedCustomer.totalSpent || 0)}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3 text-center">
                    <p className="text-xs text-muted-foreground">Returns</p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-foreground">0</p>
                  </div>
                </div>

                {/* Orders section (wireframe M12) */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Customer orders</h3>
                  <div className="rounded-xl border border-border bg-card divide-y divide-border">
                    <div className="flex items-center justify-between p-3.5">
                      <div>
                        <p className="text-sm font-medium text-foreground">Latest order</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedCustomer.lastOrderAt ? formatDate(selectedCustomer.lastOrderAt, { dateStyle: 'medium' }) : 'Recent'}
                        </p>
                      </div>
                      <Link
                        to="/orders"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        onClick={() => setSelectedCustomer(null)}
                      >
                        <span>View in orders</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default Customers;
