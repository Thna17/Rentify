import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '@rentify/utils';
import {
  Search,
  Download,
  Plus,
  ArrowRight,
  Clock,
  Truck,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import { Badge } from '@rentify/shared/ui/badge';
import { useChannels } from '../../context/ChannelContext';
import { ECOMMERCE_API_ROOT } from '@rentify/shared/config/urls';
import { RecordCashSheet } from './components/RecordCashSheet';

export type WorkTab = 'confirm' | 'deliver' | 'cash' | 'done' | 'cancelled' | 'problems';
export type ChannelFilter = 'all' | 'marketplace' | 'storefront' | 'pos' | 'invoice';

export function classifyOrder(order: any): WorkTab {
  if (order.status === 'cancelled') return 'cancelled';
  if ((order.reports && order.reports.length > 0) || order.fulfillmentStatus === 'failed') return 'problems';

  // To confirm: pending confirmation
  if (order.status === 'pending' || order.fulfillmentStatus === 'pending') return 'confirm';

  // To deliver: confirmed, processing, or dispatched
  if (
    order.fulfillmentStatus === 'confirmed' ||
    order.fulfillmentStatus === 'processing' ||
    order.fulfillmentStatus === 'dispatched'
  ) {
    return 'deliver';
  }

  // Cash to collect: delivered and COD payment is still pending!
  // Note: KHQR orders (online payment) are already paid or pending CutLuy confirmation, NEVER in cash to collect!
  const isCod = order.payment?.method === 'cod' || order.payment?.codState !== 'none';
  const isPaid = order.payment?.status === 'paid' || order.payment?.status === 'collected';
  if (order.fulfillmentStatus === 'delivered' && isCod && !isPaid) {
    return 'cash';
  }

  // Done: completed or delivered + paid
  if (order.status === 'completed' || (order.fulfillmentStatus === 'delivered' && isPaid)) {
    return 'done';
  }

  return 'confirm';
}

const CHANNELS: { id: ChannelFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'storefront', label: 'Online store' },
  { id: 'pos', label: 'POS' },
  { id: 'invoice', label: 'Invoice' },
];

const WORK_TABS: { id: WorkTab; label: string; icon: any }[] = [
  { id: 'confirm', label: 'To confirm', icon: Clock },
  { id: 'deliver', label: 'To deliver', icon: Truck },
  { id: 'cash', label: 'Cash to collect', icon: DollarSign },
  { id: 'done', label: 'Done', icon: CheckCircle2 },
  { id: 'cancelled', label: 'Cancelled', icon: XCircle },
  { id: 'problems', label: 'Problems', icon: AlertCircle },
];

export function OrderManagement() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { store } = useChannels();

  const activeChannel = (searchParams.get('channel') as ChannelFilter) || 'all';
  const [activeTab, setActiveTab] = useState<WorkTab>('confirm');
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Cash sheet modal state
  const [cashSheetOrder, setCashSheetOrder] = useState<any | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!store?.id) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${ECOMMERCE_API_ROOT}/api/stores/${store.id}/orders`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load orders');
      const data = await res.json();
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [store?.id]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Handle Channel filter change
  const handleChannelChange = (channelId: ChannelFilter) => {
    if (channelId === 'all') {
      searchParams.delete('channel');
    } else {
      searchParams.set('channel', channelId);
    }
    setSearchParams(searchParams);
  };

  // Filter orders by channel and search
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (activeChannel !== 'all' && order.channel !== activeChannel) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          String(order.orderNumber || '').toLowerCase().includes(q) ||
          String(order.id || '').toLowerCase().includes(q) ||
          String(order.buyer?.name || '').toLowerCase().includes(q) ||
          String(order.buyer?.phone || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [orders, activeChannel, searchQuery]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts: Record<WorkTab, number> = {
      confirm: 0,
      deliver: 0,
      cash: 0,
      done: 0,
      cancelled: 0,
      problems: 0,
    };
    filteredOrders.forEach((o) => {
      const tab = classifyOrder(o);
      counts[tab] = (counts[tab] || 0) + 1;
    });
    return counts;
  }, [filteredOrders]);

  // Orders in current active tab
  const displayedOrders = useMemo(() => {
    return filteredOrders.filter((order) => classifyOrder(order) === activeTab);
  }, [filteredOrders, activeTab]);

  // Execute quick order action
  const handleAction = async (order: any, action: string, body = {}) => {
    if (!store?.id) return;
    try {
      const res = await fetch(
        `${ECOMMERCE_API_ROOT}/api/stores/${store.id}/orders/${order.id}/actions/${action}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error('Action failed');
      await fetchOrders();
    } catch (err: any) {
      alert(err?.message || 'Action failed');
    }
  };

  // Export visible orders to CSV
  const handleExport = () => {
    if (!displayedOrders.length) return;
    const headers = ['Order Number', 'Channel', 'Date', 'Customer', 'Total', 'Payment Status', 'Status'];
    const rows = displayedOrders.map((o) => [
      o.orderNumber || o.id,
      o.channel,
      new Date(o.createdAt).toLocaleDateString(),
      o.buyer?.name || 'Customer',
      o.totals?.total || '0.00',
      o.payment?.status || 'pending',
      o.status,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `orders-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const channelLabel = (channel: string) => {
    switch (channel) {
      case 'marketplace':
        return 'Marketplace';
      case 'storefront':
        return 'Online store';
      case 'pos':
        return 'POS';
      case 'invoice':
        return 'Invoice';
      default:
        return channel;
    }
  };

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 md:px-8 md:py-8">
        {/* Header with Title and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Orders</h1>
            <p className="mt-1 text-sm text-muted-foreground hidden sm:block">
              One inbox for every channel: Marketplace, Online store, POS, and Invoices.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={displayedOrders.length === 0}
              className="h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold border-card-border"
            >
              <Download className="mr-1.5 h-4 w-4" />
              <span>Export</span>
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/invoices')}
              className="h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              <span>New order</span>
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order number, buyer name or phone…"
            className="pl-10 h-11 rounded-xl bg-card border-card-border text-sm shadow-xs focus-visible:ring-1"
          />
        </div>

        {/* Channel Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {CHANNELS.map((ch) => {
            const isSelected = activeChannel === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => handleChannelChange(ch.id)}
                className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {ch.label}
              </button>
            );
          })}
        </div>

        {/* Work State Tabs */}
        <div className="flex items-center gap-1.5 border-b border-border overflow-x-auto pb-2 [scrollbar-width:none]">
          {WORK_TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            const count = tabCounts[tab.id] || 0;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-card text-foreground font-semibold shadow-xs border border-card-border'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                      isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Orders Content */}
        {loading ? (
          <div className="rounded-2xl border border-card-border bg-card p-12 text-center text-sm text-muted-foreground">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-muted-foreground/60 mb-2" />
            <span>Loading orders…</span>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center text-sm text-destructive">
            <AlertCircle className="mx-auto h-6 w-6 mb-2" />
            <p>Could not load orders.</p>
            <Button variant="outline" size="sm" onClick={fetchOrders} className="mt-3 rounded-xl">
              Retry
            </Button>
          </div>
        ) : displayedOrders.length === 0 ? (
          <div className="rounded-2xl border border-card-border bg-card p-12 text-center text-sm text-muted-foreground">
            <p className="font-semibold text-foreground text-base">No orders in {WORK_TABS.find((t) => t.id === activeTab)?.label}</p>
            <p className="mt-1 text-xs">Orders appear here as buyers place them across your channels.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-card-border bg-card shadow-soft">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Order</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayedOrders.map((order) => {
                    const isKhqr = order.payment?.method === 'khqr' || order.payment?.status === 'paid';
                    return (
                      <tr
                        key={order.id}
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="hover:bg-muted/30 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 font-semibold text-foreground">
                          #{order.orderNumber || order.id.slice(0, 8)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                            {channelLabel(order.channel)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-foreground font-medium truncate max-w-[150px]">
                          {order.buyer?.name || 'Customer'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              isKhqr
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {isKhqr ? 'Paid · KHQR' : 'COD'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold font-mono text-foreground">
                          ${order.totals?.total || '0.00'}
                        </td>
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          {activeTab === 'confirm' && (
                            <Button
                              size="sm"
                              onClick={() => handleAction(order, 'confirm')}
                              className="rounded-xl h-8 px-3 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              Confirm
                            </Button>
                          )}
                          {activeTab === 'deliver' && (
                            <Button
                              size="sm"
                              onClick={() => handleAction(order, 'dispatch')}
                              className="rounded-xl h-8 px-3 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              Deliver
                            </Button>
                          )}
                          {activeTab === 'cash' && (
                            <Button
                              size="sm"
                              onClick={() => setCashSheetOrder(order)}
                              className="rounded-xl h-8 px-3 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              Collect cash
                            </Button>
                          )}
                          {(activeTab === 'done' || activeTab === 'cancelled' || activeTab === 'problems') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/orders/${order.id}`)}
                              className="rounded-xl h-8 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                            >
                              View →
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Rows */}
            <div className="md:hidden space-y-3">
              {displayedOrders.map((order) => {
                const isKhqr = order.payment?.method === 'khqr' || order.payment?.status === 'paid';
                return (
                  <div
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="rounded-2xl border border-card-border bg-card p-4 shadow-soft space-y-3 cursor-pointer hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">#{order.orderNumber || order.id.slice(0, 8)}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
                          {channelLabel(order.channel)}
                        </span>
                      </div>
                      <span className="text-sm font-bold font-mono text-foreground">${order.totals?.total || '0.00'}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{order.buyer?.name || 'Customer'} · {order.items?.length || 1} items</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          isKhqr
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {isKhqr ? 'Paid · KHQR' : 'COD'}
                      </span>
                    </div>

                    {/* Primary Row Action on Mobile */}
                    <div className="pt-1 flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                      {activeTab === 'confirm' && (
                        <Button
                          size="sm"
                          onClick={() => handleAction(order, 'confirm')}
                          className="w-full rounded-xl h-9 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          Confirm
                        </Button>
                      )}
                      {activeTab === 'deliver' && (
                        <Button
                          size="sm"
                          onClick={() => handleAction(order, 'dispatch')}
                          className="w-full rounded-xl h-9 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          Deliver
                        </Button>
                      )}
                      {activeTab === 'cash' && (
                        <Button
                          size="sm"
                          onClick={() => setCashSheetOrder(order)}
                          className="w-full rounded-xl h-9 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          Collect cash
                        </Button>
                      )}
                      {(activeTab === 'done' || activeTab === 'cancelled' || activeTab === 'problems') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="w-full rounded-xl h-9 text-xs font-semibold border-card-border"
                        >
                          View order details
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 text-center text-xs text-muted-foreground">
              Showing {displayedOrders.length} {displayedOrders.length === 1 ? 'order' : 'orders'}
            </div>
          </div>
        )}

        {/* Record Cash Sheet modal */}
        <RecordCashSheet
          open={Boolean(cashSheetOrder)}
          onOpenChange={(open) => !open && setCashSheetOrder(null)}
          order={cashSheetOrder}
          onConfirm={async (amount) => {
            if (cashSheetOrder) {
              await handleAction(cashSheetOrder, 'collect_cod', { amount });
              setCashSheetOrder(null);
            }
          }}
        />
      </div>
    </div>
  );
}

export default OrderManagement;
