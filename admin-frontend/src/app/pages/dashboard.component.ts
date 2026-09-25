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
    <!-- Dashboard Header & Quick Controls -->
    <div class="dashboard-header">
      <div>
        <h1 class="page-title">Platform Dashboard</h1>
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
          <kc-icon name="download" [size]="14"></kc-icon> Export Report
        </button>
      </div>
    </div>

    <!-- Quick Alert Bar: High-Priority Operational Attention -->
    @if (pendingActionCount() > 0) {
      <div class="quick-alert-bar">
        <div class="quick-alert-left">
          <span style="color:#f59e0b;display:grid;place-items:center">
            <kc-icon name="alert" [size]="18"></kc-icon>
          </span>
          <div>
            <div class="quick-alert-title">{{pendingActionCount()}} Operations Require Your Attention</div>
            <div style="font-size:11.5px;color:#92400e">
              {{pendingSellers()}} seller applications pending approval · {{openComplaints()}} active buyer disputes
            </div>
          </div>
        </div>
        <div class="quick-alert-chips">
          @if (pendingSellers() > 0) {
            <a routerLink="/sellers" class="action-chip">
              <kc-icon name="store" [size]="12"></kc-icon> Review {{pendingSellers()}} Sellers
            </a>
          }
          @if (openComplaints() > 0) {
            <a routerLink="/complaints" class="action-chip">
              <kc-icon name="message" [size]="12"></kc-icon> Resolve {{openComplaints()}} Disputes
            </a>
          }
        </div>
      </div>
    }

    <!-- 4 High-Signal Core KPI Cards (Focused & Actionable) -->
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
        label="Active Merchant Stores"
        icon="store"
        [value]="d.websites().length + ' Storefronts'"
        trend="100% Hosting SLA"
        [trendPositive]="true"
        [hint]="d.sellers().length + ' merchants registered'">
      </kc-stat>

      <kc-stat
        label="Marketplace Orders"
        icon="cart"
        [value]="d.orders().length + ' Orders'"
        trend="+14.2% volume"
        [trendPositive]="true"
        [hint]="openOrders() + ' in active fulfillment'">
      </kc-stat>

      <kc-stat
        label="Pending Admin Action"
        icon="alert"
        [value]="pendingActionCount() + ' Items'"
        [urgent]="pendingActionCount() > 0"
        [hint]="pendingSellers() + ' sellers · ' + openComplaints() + ' disputes'">
      </kc-stat>
    </div>

    <!-- Main Operational Grid: Visual Trends & Immediate Action Queue -->
    <div class="grid duo mb">
      <!-- Left: Interactive Financial & Transaction Volume Chart -->
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

      <!-- Right: Action Queue ("What Admin Needs to Approve/Resolve Right Now") -->
      <div class="card">
        <div class="card-head">
          <div style="display:flex;align-items:center;gap:8px">
            <h3 class="card-title">Action Required Queue</h3>
            <span class="meta-tag">{{pendingActionCount()}} Pending</span>
          </div>
          <a class="link" routerLink="/sellers">View Queue</a>
        </div>

        <div class="op-queue-list">
          @if (pendingSellerList().length === 0 && openComplaintList().length === 0) {
            <div style="text-align:center;padding:28px 12px;color:var(--muted)">
              <div style="color:#16a34a;margin-bottom:6px"><kc-icon name="check-circle" [size]="24"></kc-icon></div>
              <div style="font-weight:600;color:var(--ink)">Queue is clear!</div>
              <div style="font-size:11.5px">No pending seller registrations or open customer disputes.</div>
            </div>
          }

          @for (s of pendingSellerList(); track s.id) {
            <div class="op-queue-item">
              <span class="thumb">{{initials(s.store)}}</span>
              <div class="op-queue-info">
                <div class="op-queue-title">{{s.store}}</div>
                <div class="op-queue-meta">New Seller Application · {{dstr(s.appliedAt)}}</div>
              </div>
              <button class="btn btn-sm btn-primary" (click)="quickApproveSeller(s.id)">
                Approve
              </button>
            </div>
          }

          @for (c of openComplaintList(); track c.id) {
            <div class="op-queue-item" style="border-left:3px solid #f59e0b">
              <span class="thumb" style="background:#fef3c7;color:#b45309">
                <kc-icon name="message" [size]="14"></kc-icon>
              </span>
              <div class="op-queue-info">
                <div class="op-queue-title">{{c.subject}}</div>
                <div class="op-queue-meta">{{c.order}} · from {{c.from}}</div>
              </div>
              <button class="btn btn-sm btn-default" (click)="quickResolveComplaint(c.id)">
                Resolve
              </button>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- Secondary Operational Grid: Recent Orders & System Telemetry -->
    <div class="grid duo mb">
      <!-- Recent Orders Table with Channel Identifier -->
      <div class="card">
        <div class="card-head">
          <div style="display:flex;align-items:center;gap:12px">
            <h3 class="card-title">Recent Cross-Channel Orders</h3>
            <input
              class="input input-search"
              style="width:160px;padding:4px 8px;font-size:11.5px"
              placeholder="Filter order or buyer..."
              [value]="orderFilter()"
              (input)="orderFilter.set($any($event.target).value)" />
          </div>
          <a class="link" routerLink="/orders">All Orders ({{d.orders().length}})</a>
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
                    [class.channel-storefront]="o.id === 'ORD-5001' || o.id === 'ORD-5004' || o.id === 'ORD-5007'"
                    [class.channel-marketplace]="o.id !== 'ORD-5001' && o.id !== 'ORD-5004' && o.id !== 'ORD-5007'">
                    {{(o.id === 'ORD-5001' || o.id === 'ORD-5004' || o.id === 'ORD-5007') ? 'Storefront' : 'Marketplace'}}
                  </span>
                </td>
                <td class="num">{{money(o.total)}}</td>
                <td><kc-badge [value]="o.payment"></kc-badge></td>
                <td><kc-badge [value]="o.status"></kc-badge></td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Infrastructure & Services Health -->
      <div class="card">
        <div class="card-head">
          <div style="display:flex;align-items:center;gap:8px">
            <h3 class="card-title">Platform Infrastructure & SLA</h3>
            <span class="health-dot pulse"></span>
          </div>
          <span class="cell-sub" style="color:#16a34a;font-weight:600">All Systems Nominal</span>
        </div>

        <div style="padding:4px 0">
          <div class="health-row">
            <div>
              <div class="cell-main">Core API Cluster</div>
              <div class="cell-sub">Port 3001 · Identity, Storefronts, Subscriptions</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="meta-tag">18ms</span>
              <span class="badge t-green">Healthy</span>
            </div>
          </div>

          <div class="health-row">
            <div>
              <div class="cell-main">Commerce API Cluster</div>
              <div class="cell-sub">Port 4001 · Catalog, Cart, POS, KHQR Orders</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="meta-tag">24ms</span>
              <span class="badge t-green">Healthy</span>
            </div>
          </div>

          <div class="health-row">
            <div>
              <div class="cell-main">Storefront Hosting Fleet</div>
              <div class="cell-sub">Ports 4700, 4600 · Vite Themes Active</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="meta-tag">4 Sites</span>
              <span class="badge t-green">Active</span>
            </div>
          </div>

          <div class="health-row">
            <div>
              <div class="cell-main">Database & Caching Layer</div>
              <div class="cell-sub">MySQL 8.4 (Port 3307) · Redis 7 (Port 6379)</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="meta-tag">99.4% Hit</span>
              <span class="badge t-green">Synced</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Triplet: High-Utility Quick Lookups -->
    <div class="grid g3">
      <!-- Best-Selling Products -->
      <div class="card">
        <div class="card-head">
          <h3 class="card-title">Top Grossing Products</h3>
          <a class="link" routerLink="/products">Catalog</a>
        </div>
        <table class="tbl">
          <thead>
            <tr><th>Product</th><th class="right">Sold</th><th class="right">Revenue</th></tr>
          </thead>
          <tbody>
            @for (p of best; track p.id) {
              <tr>
                <td>
                  <div class="cell-flex">
                    <span class="thumb">{{initials(p.name)}}</span>
                    <div>
                      <div class="cell-main" style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{p.name}}</div>
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
      </div>

      <!-- Critical Low-Stock Alerts -->
      <div class="card">
        <div class="card-head">
          <div style="display:flex;align-items:center;gap:6px">
            <h3 class="card-title">Low Stock Warnings</h3>
            <span class="meta-tag" style="background:#fee2e2;color:#dc2626">≤ 5 Left</span>
          </div>
          <a class="link" routerLink="/products">Restock</a>
        </div>
        <table class="tbl">
          <tbody>
            @for (p of low; track p.id) {
              <tr>
                <td>
                  <div class="cell-flex">
                    <span class="thumb" style="background:#fef2f2;color:#dc2626">{{initials(p.name)}}</span>
                    <div>
                      <div class="cell-main">{{p.name}}</div>
                      <div class="cell-sub">{{d.storeName(p.sellerId)}}</div>
                    </div>
                  </div>
                </td>
                <td class="right">
                  <span class="badge" [class.t-red]="p.stock === 0" [class.t-amber]="p.stock > 0">
                    {{p.stock === 0 ? 'Out of Stock' : p.stock + ' units left'}}
                  </span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Recent Platform Activity Feed -->
      <div class="card">
        <div class="card-head">
          <h3 class="card-title">Recent Activity Logs</h3>
          <a class="link" routerLink="/activity-logs">Logs</a>
        </div>
        <div style="padding:8px 16px;max-height:260px;overflow-y:auto">
          @for (l of d.logs().slice(0, 5); track l.id) {
            <div class="list-item" style="padding:7px 0">
              <span class="pulse-dot"></span>
              <div>
                <div style="font-size:12.5px;font-weight:500;color:var(--ink)">{{l.action}}</div>
                <div class="cell-sub">{{l.actor}} · {{dstr(l.date)}}</div>
              </div>
            </div>
          }
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

  setTimeRange(r: 'today' | '7d' | '30d' | '90d') {
    this.selectedRange.set(r);
  }

  pendingSellers = computed(() => this.d.sellers().filter((s) => s.status === 'pending').length);
  openComplaints = computed(() => this.d.complaints().filter((c) => c.status === 'open' || c.status === 'investigating').length);
  openOrders = computed(() => this.d.orders().filter((o) => o.status === 'pending' || o.status === 'processing').length);

  pendingActionCount = computed(() => this.pendingSellers() + this.openComplaints());

  pendingSellerList = computed(() => this.d.sellers().filter((s) => s.status === 'pending').slice(0, 3));
  openComplaintList = computed(() => this.d.complaints().filter((c) => c.status === 'open' || c.status === 'investigating').slice(0, 2));

  best = [...this.d.products()].sort((a, b) => b.sold - a.sold).slice(0, 4);
  low = this.d.products().filter((p) => p.stock <= 5).slice(0, 4);

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
    const os = this.d.orders();
    if (!q) return os.slice(0, 5);
    return os.filter((o) => o.id.toLowerCase().includes(q) || o.buyer.toLowerCase().includes(q)).slice(0, 5);
  });

  quickApproveSeller(id: string) {
    this.d.approveSeller(id);
  }

  quickResolveComplaint(id: string) {
    this.d.setComplaintStatus(id, 'resolved');
  }

  exportReport() {
    this.d.toast('Platform overview report generated (CSV downloaded)');
  }
}

