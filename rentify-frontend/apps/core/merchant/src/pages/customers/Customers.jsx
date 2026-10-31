import { useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { Input } from '@rentify/shared/ui/input';
import { useCustomers } from '../../hooks/useCustomers';
import { useTranslation } from '@rentify/utils';
import { DataTable } from '../../components/data-table';

const initials = (name) =>
  (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

export const Customers = () => {
  const { t, formatDate } = useTranslation();
  const { customers, isLoading, isError, refetch } = useCustomers();
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((c) =>
      [c.name, c.email, c.phone].some((value) => value?.toLowerCase().includes(term)));
  }, [customers, query]);

  const columns = useMemo(() => [
    {
      id: 'customer',
      accessorFn: (c) => c.name || '',
      header: t('merchant.p.customer'),
      meta: { sortable: true, mobile: 'primary' },
      cell: ({ row }) => (
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary" aria-hidden="true">
            {initials(row.original.name)}
          </span>
          <span className="truncate font-medium text-foreground">{row.original.name}</span>
        </span>
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

        <DataTable
          title={t('merchant.table.customers.title')}
          ariaLabel={t('merchant.p.customers')}
          toolbar={customers.length > 0 && (
            <div className="relative w-full flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                aria-label={t('merchant.p.customers')}
                placeholder={t('merchant.table.customers.search')}
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
      </div>
    </div>
  );
};

export default Customers;
