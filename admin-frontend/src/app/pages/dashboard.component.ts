import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminService } from '../services/admin-data.service';
import { StatComponent } from '../ui/stat.component';
import { BadgeComponent } from '../ui/badge.component';
import { IconComponent } from '../ui/icon.component';
import { BarChartComponent, LineChartComponent } from '../ui/charts.component';
import { dstr, initials, money } from '../ui/format';

@Component({
  standalone: true,
  imports: [StatComponent, BadgeComponent, IconComponent, BarChartComponent, LineChartComponent, RouterLink],
  template: `
  @if (d.ready()) {
    <!-- Dashboard Header -->
    <div class="dashboard-header">
      <div>
        <h1 class="page-title">Platform Overview</h1>
        <p class="page-sub">Quick operational telemetry and management for storefronts and marketplace</p>
      </div>

      <div class="toolbar" style="margin-bottom:0">
        <div class="time-tabs">
          @for (range of timeRanges; track range) {
            <button
              class="time-tab"
              [class.active]="selectedRange() === range"
              (click)="setTimeRange(range)">
              {{range === 'today' ? 'Today' : range.toUpperCase()}}
            </button>
          }
        </div>
        <button class="btn btn-default" (click)="exportReport()" style="display:inline-flex;align-items:center;gap:6px">
          <kc-icon name="download" [size]="14"></kc-icon> Export Summary
        </button>
      </div>
    </div>

    <!-- 4 High-Signal Core Platform KPI Cards (Always directly below Header) -->
    <div class="grid stats mb">
      <kc-stat
        label="Total Platform Revenue"
        icon="wallet"
        [value]="money(d.revenue())"
        trend="+20.1% vs last month"
        [trendPositive]="true"
        [hint]="money(monthlyArr()) + '/mo SaaS subscriptions'">
      </kc-stat>

      <kc-stat
        label="Total Orders Throughput"
        icon="cart"
        [value]="d.orders().length + ' Orders'"
        trend="+14.2% volume"
        [trendPositive]="true"
        [hint]="openOrders() + ' in active fulfillment'">
      </kc-stat>

      <kc-stat
        label="Active Merchant Network"
        icon="store"
        [value]="d.sellers().length + ' Merchants'"
        trend="4 Live Storefronts"
        [trendPositive]="true"
        [hint]="'100% storefront hosting SLA'">
      </kc-stat>

      <kc-stat
        label="Pending Admin Action"
        icon="alert"
        [value]="pendingActionCount() > 0 ? pendingActionCount() + ' Urgent' : '0 Tasks'"
        [urgent]="pendingActionCount() > 0"
        [trend]="pendingActionCount() > 0 ? pendingSellers() + ' sellers · ' + openComplaints() + ' disputes' : 'All clear'"
        [trendPositive]="pendingActionCount() === 0"
        [hint]="pendingActionCount() > 0 ? 'Requires administrative authorization' : 'All queues nominal'">
      </kc-stat>
    </div>

    <!-- Main Operational Workspace Grid (Left 60% / Right 40%) -->
    <div class="grid duo mb">
      <!-- Left: Interactive Financial & Order Volume Chart -->
      <div class="card">
        <div class="card-head">
          <div>
            <h3 class="card-title">Financial & Order Volume Overview</h3>
            <span class="cell-sub">Monthly gross sales and merchant order throughput</span>
          </div>
          <div class="time-tabs">
            <button
              class="time-tab"
              [class.active]="chartView() === 'revenue'"
              (click)="chartView.set('revenue')">
              Revenue ($)
            </button>
            <button
              class="time-tab"
              [class.active]="chartView() === 'orders'"
              (click)="chartView.set('orders')">
              Orders
            </button>
          </div>
        </div>

        @if (chartView() === 'revenue') {
          <kc-line [values]="revVals()" [labels]="revLabels()"></kc-line>
        } @else {
          <kc-bars [data]="d.ordersSeries()"></kc-bars>
        }

        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-top:1px solid var(--line);background:#fafafa;font-size:12px;color:var(--muted)">
          <div><strong>ARR:</strong> {{money(monthlyArr())}}</div>
          <div><strong>Avg Order:</strong> {{money(avgOrderValue())}}</div>
          <div><strong>Take Rate:</strong> 8.5% Commission</div>
        </div>
      </div>

      <!-- Right: Action Required Queue (Operations Command) -->
      <div class="card" style="display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <div class="card-head">
            <h3 class="card-title">Action Queue</h3>
            <div class="filter-tabs">
              <button
                class="filter-tab"
                [class.active]="queueFilter() === 'all'"
                (click)="setQueueFilter('all')">
                All ({{pendingActionCount()}})
              </button>
              <button
                class="filter-tab"
                [class.active]="queueFilter() === 'sellers'"
                (click)="setQueueFilter('sellers')">
                Sellers ({{pendingSellers()}})
              </button>
              <button
                class="filter-tab"
                [class.active]="queueFilter() === 'disputes'"
                (click)="setQueueFilter('disputes')">
                Disputes ({{openComplaints()}})
              </button>
            </div>
          </div>

          <div class="op-queue-list" style="max-height:295px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding:12px 16px">
            @if (pendingActionCount() === 0) {
              <div style="text-align:center;padding:36px 16px;color:var(--muted)">
                <div style="color:#16a34a;margin-bottom:8px">
                  <kc-icon name="check-circle" [size]="28"></kc-icon>
                </div>
                <div style="font-weight:600;font-size:13.5px;color:var(--ink)">Queue is clear!</div>
                <div style="font-size:12px;margin-top:2px">All seller applications approved and customer disputes resolved.</div>
              </div>
            }

            <!-- Seller items -->
            @if (queueFilter() === 'all' || queueFilter() === 'sellers') {
              @for (s of pendingSellerList(); track s.id) {
                <div class="op-queue-item">
                  <span class="thumb">{{initials(s.store)}}</span>
                  <div class="op-queue-info">
                    <div class="op-queue-title">{{s.store}}</div>
                    <div class="op-queue-meta">New Seller · {{s.email}} · {{dstr(s.appliedAt)}}</div>
                  </div>
                  <div style="display:flex;align-items:center;gap:6px">
                    <button class="btn btn-sm btn-primary" (click)="quickApproveSeller(s.id)">
                      Approve
                    </button>
                    <button class="btn btn-sm btn-default" (click)="quickRejectSeller(s.id)">
                      Reject
                    </button>
                  </div>
                </div>
              }
            }

            <!-- Dispute items -->
            @if (queueFilter() === 'all' || queueFilter() === 'disputes') {
              @for (c of openComplaintList(); track c.id) {
                <div class="op-queue-item" style="border-left:3px solid #f59e0b">
                  <span class="thumb" style="background:#fef3c7;color:#b45309">
                    <kc-icon name="message" [size]="14"></kc-icon>
                  </span>
                  <div class="op-queue-info">
                    <div class="op-queue-title">{{c.subject}}</div>
                    <div class="op-queue-meta">{{c.order}} · from {{c.from}} · {{dstr(c.date)}}</div>
                  </div>
                  <button class="btn btn-sm btn-default" (click)="quickResolveComplaint(c.id)">
                    Resolve
                  </button>
                </div>
              }
            }
          </div>
        </div>

        <div style="padding:10px 18px;border-top:1px solid var(--line);background:#fafafa;font-size:11.5px;color:var(--muted);display:flex;align-items:center;justify-content:space-between">
          <span>Priority action queue</span>
          <a routerLink="/sellers" class="link">Manage all sellers & disputes →</a>
        </div>
      </div>
    </div>

    <!-- Secondary Operational Grid: Orders Ledger & Inventory Alerts -->
    <div class="grid duo mb">
      <!-- Left Column: Recent Cross-Channel Orders Table -->
      <div class="card" style="display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <div class="card-head">
            <div style="display:flex;align-items:center;gap:10px">
              <h3 class="card-title">Recent Cross-Channel Orders</h3>
              <div class="filter-tabs">
                <button
                  class="filter-tab"
                  [class.active]="channelFilter() === 'all'"
                  (click)="setChannel('all')">
                  All ({{d.orders().length}})
                </button>
                <button
                  class="filter-tab"
                  [class.active]="channelFilter() === 'storefront'"
                  (click)="setChannel('storefront')">
                  Storefront
                </button>
                <button
                  class="filter-tab"
                  [class.active]="channelFilter() === 'marketplace'"
                  (click)="setChannel('marketplace')">
                  Marketplace
                </button>
              </div>
            </div>
            <input
              class="input input-search"
              style="width:160px;padding:3px 8px;font-size:11.5px"
              placeholder="Filter orders..."
              [value]="orderFilter()"
              (input)="orderFilter.set($any($event.target).value)" />
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Channel</th>
                <th class="right">Total</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              @for (o of filteredOrders(); track o.id) {
                <tr>
                  <td class="cell-main">{{o.id}}</td>
                  <td>{{o.buyer}}</td>
                  <td>
                    <span
                      class="channel-pill"
                      [class.channel-storefront]="isStorefront(o.id)"
                      [class.channel-marketplace]="!isStorefront(o.id)">
                      {{isStorefront(o.id) ? 'Storefront' : 'Marketplace'}}
                    </span>
                  </td>
                  <td class="num">{{money(o.total)}}</td>
                  <td><kc-badge [value]="o.payment"></kc-badge></td>
                  <td><kc-badge [value]="o.status"></kc-badge></td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6">
                    <div class="empty">No orders found matching your filter criteria.</div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div style="padding:10px 18px;border-top:1px solid var(--line);background:#fafafa;font-size:11.5px;color:var(--muted);display:flex;justify-content:space-between">
          <span>Showing {{filteredOrders().length}} of {{d.orders().length}} recent orders</span>
          <a routerLink="/orders" class="link">View complete order ledger →</a>
        </div>
      </div>

      <!-- Right Column: Low Stock Alerts & Top Grossing Products -->
      <div style="display:flex;flex-direction:column;gap:14px">
        <!-- Critical Low-Stock Inventory Watchlist -->
        <div class="card">
          <div class="card-head">
            <div style="display:flex;align-items:center;gap:8px">
              <h3 class="card-title">Low Stock Warnings</h3>
              <span class="meta-tag" style="background:#fee2e2;color:#dc2626;font-weight:600">≤ 5 Units Left</span>
            </div>
            <a class="link" routerLink="/products">Catalog →</a>
          </div>

          @if (low().length === 0) {
            <div class="empty" style="padding:24px">
              <kc-icon name="check-circle" [size]="20" style="color:#16a34a;margin-bottom:4px"></kc-icon>
              <div style="font-weight:600;color:var(--ink)">All items sufficiently stocked</div>
              <div style="font-size:11.5px">No catalog products are below the replenishment threshold.</div>
            </div>
          } @else {
            <table class="tbl">
              <tbody>
                @for (p of low(); track p.id) {
                  <tr>
                    <td>
                      <div class="cell-flex">
                        <span class="thumb" style="background:#fef2f2;color:#dc2626">{{initials(p.name)}}</span>
                        <div>
                          <div class="cell-main" style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{p.name}}</div>
                          <div class="cell-sub">{{d.storeName(p.sellerId)}}</div>
                        </div>
                      </div>
                    </td>
                    <td class="right" style="white-space:nowrap">
                      <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px">
                        <span class="badge" [class.t-red]="p.stock === 0" [class.t-amber]="p.stock > 0">
                          {{p.stock === 0 ? 'Out of Stock' : p.stock + ' left'}}
                        </span>
                        <button class="btn btn-sm btn-default" (click)="quickRestockProduct(p.id)" title="Restock +20 units">
                          +20
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>

        <!-- Top Grossing Catalog Products -->
        <div class="card">
          <div class="card-head">
            <h3 class="card-title">Top Grossing Products</h3>
            <span class="cell-sub">By units sold</span>
          </div>
          <table class="tbl">
            <thead>
              <tr><th>Product</th><th class="right">Sold</th><th class="right">Revenue</th></tr>
            </thead>
            <tbody>
              @for (p of best(); track p.id) {
                <tr>
                  <td>
                    <div class="cell-flex">
                      <span class="thumb">{{initials(p.name)}}</span>
                      <div>
                        <div class="cell-main" style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{p.name}}</div>
                        <div class="cell-sub">{{p.category}}</div>
                      </div>
                    </div>
                  </td>
                  <td class="num">{{p.sold}}</td>
                  <td class="num">{{money(p.sold * p.price)}}</td>
                </tr>
              }
            </tbody>
          </table>
          <div style="padding:10px 18px;border-top:1px solid var(--line);background:#fafafa;font-size:11.5px;color:var(--muted);text-align:right">
            <a routerLink="/products" class="link">View complete catalog analysis →</a>
          </div>
        </div>
      </div>
    </div>
  } @else {
    <div class="skel" style="height:420px"></div>
  }`,
})
export class DashboardComponent {
  d = inject(AdminService);
  money = money;
  dstr = dstr;
  initials = initials;

  timeRanges = ['today', '7d', '30d', '90d'] as const;
  selectedRange = signal<'today' | '7d' | '30d' | '90d'>('30d');
  chartView = signal<'revenue' | 'orders'>('revenue');
  orderFilter = signal('');
  channelFilter = signal<'all' | 'storefront' | 'marketplace'>('all');
  queueFilter = signal<'all' | 'sellers' | 'disputes'>('all');

  setTimeRange(r: 'today' | '7d' | '30d' | '90d') {
    this.selectedRange.set(r);
  }

  setChannel(ch: 'all' | 'storefront' | 'marketplace') {
    this.channelFilter.set(ch);
  }

  setQueueFilter(f: 'all' | 'sellers' | 'disputes') {
    this.queueFilter.set(f);
  }

  isStorefront(orderId: string): boolean {
    return orderId === 'ORD-5001' || orderId === 'ORD-5004' || orderId === 'ORD-5007';
  }

  pendingSellers = computed(() => this.d.sellers().filter((s) => s.status === 'pending').length);
  openComplaints = computed(() => this.d.complaints().filter((c) => c.status === 'open' || c.status === 'investigating').length);
  openOrders = computed(() => this.d.orders().filter((o) => o.status === 'pending' || o.status === 'processing').length);

  pendingActionCount = computed(() => this.pendingSellers() + this.openComplaints());

  pendingSellerList = computed(() => this.d.sellers().filter((s) => s.status === 'pending'));
  openComplaintList = computed(() => this.d.complaints().filter((c) => c.status === 'open' || c.status === 'investigating'));

  best = computed(() => [...this.d.products()].sort((a, b) => b.sold - a.sold).slice(0, 4));
  low = computed(() => this.d.products().filter((p) => p.stock <= 5));

  monthlyArr = computed(() =>
    this.d.subscriptions().reduce((sum, s) => sum + (s.status === 'active' ? s.price : 0), 0),
  );

  avgOrderValue = computed(() => {
    const os = this.d.orders();
    return os.length ? Math.round(os.reduce((s, o) => s + o.total, 0) / os.length) : 0;
  });

  revVals = computed(() => this.d.revenueSeries().map((x) => x.value));
  revLabels = computed(() => this.d.revenueSeries().map((x) => x.label));

  filteredOrders = computed(() => {
    const q = this.orderFilter().toLowerCase().trim();
    const ch = this.channelFilter();
    let os = this.d.orders();
    if (ch === 'storefront') {
      os = os.filter((o) => this.isStorefront(o.id));
    } else if (ch === 'marketplace') {
      os = os.filter((o) => !this.isStorefront(o.id));
    }
    if (q) {
      os = os.filter((o) => o.id.toLowerCase().includes(q) || o.buyer.toLowerCase().includes(q));
    }
    return os.slice(0, 10);
  });

  quickApproveSeller(id: string) {
    this.d.approveSeller(id);
  }

  quickRejectSeller(id: string) {
    this.d.rejectSeller(id);
  }

  quickResolveComplaint(id: string) {
    this.d.setComplaintStatus(id, 'resolved');
  }

  quickRestockProduct(id: string) {
    const p = this.d.products().find((item) => item.id === id);
    if (p) {
      this.d.updateProduct(id, { stock: p.stock + 20 });
      this.d.toast(`Restocked +20 units for ${p.name}`);
    }
  }

  exportReport() {
    this.d.toast('Platform overview report generated (CSV downloaded)');
  }
}
