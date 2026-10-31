import { useMemo, useState } from 'react';
import { Search, Users, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '@rentify/shared/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@rentify/shared/ui/sheet';
import { useCustomers } from '../../hooks/useCustomers';
import { useTranslation } from '@rentify/utils';
import { FilterChips, PageShell, PageTitle } from '../../components/page/PagePrimitives';
import { DataTable } from '../../components/data-table';
import { formatMoney } from '../../hooks/useChannelOrders';

const initials = (name) =>
  (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

const CHANNEL_CHIPS = ['all', 'marketplace', 'storefront', 'pos'];

export const Customers = () => {
  const { t, formatDate } = useTranslation();
  const { customers, isLoading, isError, refetch } = useCustomers();
  const [query, setQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const visible = useMemo(() => {
    let list = customers;
    if (selectedChannel !== 'all') {
      list = list.filter((c) => c.channels.has(selectedChannel));
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
          <span className="truncate font-medium text-foreground hover:underline">{row.original.name || t('merchant.orders.buyerUnknown')}</span>
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
      meta: { sortable: true, align: 'right', mobileHideLabel: true, mobileCell: (c) => t('merchant.reports.orderCount', { count: c.orderCount }) },
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
    <PageShell>
        <PageTitle title={t('merchant.p.customers')} description={t('merchant.p.everyoneWhoHasOrdered')} />

        <FilterChips
          label={t('merchant.orders.channelFilter')}
          items={CHANNEL_CHIPS.map((id) => ({ id, label: t(`merchant.orders.channels.${id}`) }))}
          value={selectedChannel}
          onChange={setSelectedChannel}
        />

        <DataTable
          title={t('merchant.table.customers.title')}
          ariaLabel={t('merchant.p.customers')}
          toolbar={customers.length > 0 && (
            <div className="relative w-full flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                aria-label={t('merchant.p.customers')}
                placeholder={t('merchant.customers.search')}
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
                      <SheetTitle className="text-xl font-bold">{selectedCustomer.name || t('merchant.orders.buyerUnknown')}</SheetTitle>
                    </div>
                  </div>
                </SheetHeader>

                <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('merchant.customers.contact')}</p>
                    <p className="text-sm font-medium text-foreground">{selectedCustomer.phone || selectedCustomer.email || '—'}</p>
                  </div>
                  {selectedCustomer.phone && !selectedCustomer.phone.includes('*') && (
                    <a
                      href={`tel:${selectedCustomer.phone}`}
                      className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted"
                    >
                      <Phone className="h-4 w-4" aria-hidden="true" />
                      {t('merchant.orders.detail.call')}
                    </a>
                  )}
                  {selectedCustomer.phone?.includes('*') && (
                    <p className="text-sm text-muted-foreground">{t('merchant.customers.masked')}</p>
                  )}
                </div>

                <dl className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-border bg-card p-3">
                    <dt className="text-sm text-muted-foreground">{t('merchant.p.orders')}</dt>
                    <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">{selectedCustomer.orderCount}</dd>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3">
                    <dt className="text-sm text-muted-foreground">{t('merchant.p.totalSpent')}</dt>
                    <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">{formatMoney(selectedCustomer.totalSpent || 0)}</dd>
                  </div>
                </dl>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {t('merchant.customers.boughtFrom', {
                      channels: [...selectedCustomer.channels].map((c) => t(`merchant.orders.channels.${c}`)).join(', '),
                    })}
                  </p>
                  {selectedCustomer.lastOrderAt ? (
                    <p className="text-sm text-muted-foreground">
                      {t('merchant.table.customers.lastOrder')} {formatDate(selectedCustomer.lastOrderAt, { dateStyle: 'medium' })}
                    </p>
                  ) : null}
                  <Link
                    to="/orders?tab=done"
                    onClick={() => setSelectedCustomer(null)}
                    className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-foreground underline"
                  >
                    {t('merchant.customers.seeOrders')}
                  </Link>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
    </PageShell>
  );
};

export default Customers;
