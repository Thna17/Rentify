import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminService } from '../admin-data.service';
import { StatComponent } from '../ui/stat.component';
import { BadgeComponent } from '../ui/badge.component';
import { BarChartComponent, LineChartComponent } from '../ui/charts.component';
import { dstr, initials, money } from '../ui/format';

@Component({
  standalone: true,
  imports: [StatComponent, BadgeComponent, BarChartComponent, LineChartComponent, RouterLink],
  template: `
  @if (d.ready()) {
    <div class="page-head"><div><h1 class="page-title">Dashboard</h1><p class="page-sub">Marketplace health at a glance</p></div></div>

    <div class="grid stats mb">
      <kc-stat label="Total Buyers" icon="users" [value]="d.buyers().length" [hint]="'+' + newBuyers + ' this month'"></kc-stat>
      <kc-stat label="Total Sellers" icon="store" [value]="d.sellers().length" [hint]="pendingSellers + ' pending approval'"></kc-stat>
      <kc-stat label="Total Products" icon="box" [value]="d.products().length" [hint]="pendingProducts + ' awaiting review'"></kc-stat>
      <kc-stat label="Total Orders" icon="cart" [value]="d.orders().length" [hint]="openOrders + ' open'"></kc-stat>
    </div>
    <div class="grid stats mb">
      <kc-stat label="Total Revenue" icon="wallet" [value]="money(d.revenue())" hint="commission + boost fees"></kc-stat>
      <kc-stat label="Pending Seller Approvals" icon="alert" [value]="pendingSellers"></kc-stat>
      <kc-stat label="Pending Reports" icon="flag" [value]="openReports"></kc-stat>
      <kc-stat label="Pending Complaints" icon="message" [value]="openComplaints"></kc-stat>
    </div>

    <div class="grid half mb">
      <div class="card"><div class="card-head"><h3 class="card-title">Revenue overview</h3><span class="muted">last 6 months</span></div>
        <kc-line [values]="revVals()" [labels]="revLabels()"></kc-line></div>
      <div class="card"><div class="card-head"><h3 class="card-title">Orders overview</h3><span class="muted">last 6 months</span></div>
        <kc-bars [data]="d.ordersSeries()"></kc-bars></div>
    </div>

    <div class="grid duo mb">
      <div class="card">
        <div class="card-head"><h3 class="card-title">Recent orders</h3><a class="link" routerLink="/admin/orders">View all</a></div>
        <table class="tbl"><thead><tr><th>Order</th><th>Buyer</th><th class="right">Total</th><th>Payment</th><th>Status</th></tr></thead>
          <tbody>
            @for (o of d.orders().slice(0, 6); track o.id) {
              <tr><td class="cell-main">{{o.id}}</td><td>{{o.buyer}}</td><td class="num">{{money(o.total)}}</td>
                <td><kc-badge [value]="o.payment"></kc-badge></td><td><kc-badge [value]="o.status"></kc-badge></td></tr>
            }
          </tbody></table>
      </div>
      <div class="card card-pad">
        <h3 class="card-title" style="margin-bottom:8px">Recent platform activity</h3>
        @for (l of d.logs().slice(0, 8); track l.id) {
          <div class="list-item"><span class="pulse-dot"></span>
            <div><div>{{l.action}}</div><div class="cell-sub">{{l.actor}} · {{dstr(l.date)}}</div></div>
          </div>
        }
      </div>
    </div>

    <div class="grid g3">
      <div class="card">
        <div class="card-head"><h3 class="card-title">Best-selling products</h3></div>
        <table class="tbl"><thead><tr><th>Product</th><th class="right">Sold</th><th class="right">Revenue</th></tr></thead>
          <tbody>
            @for (p of best; track p.id) {
              <tr><td><div class="cell-flex"><span class="thumb">{{initials(p.name)}}</span>{{p.name}}</div></td>
                <td class="num">{{p.sold}}</td><td class="num">{{money(p.sold * p.price)}}</td></tr>
            }
          </tbody></table>
      </div>
      <div class="card">
        <div class="card-head"><h3 class="card-title">Low-stock products</h3><span class="muted">≤ 5 units</span></div>
        <table class="tbl"><tbody>
          @for (p of low; track p.id) {
            <tr><td><div class="cell-flex"><span class="thumb">{{initials(p.name)}}</span>
              <div><div class="cell-main">{{p.name}}</div><div class="cell-sub">{{d.storeName(p.sellerId)}}</div></div></div></td>
              <td class="right"><kc-badge [value]="p.stock === 0 ? 'hidden' : 'pending'"></kc-badge><span class="cell-sub"> {{p.stock}} left</span></td></tr>
          }
        </tbody></table>
      </div>
      <div class="card">
        <div class="card-head"><h3 class="card-title">Recent seller registrations</h3><a class="link" routerLink="/admin/sellers">Review</a></div>
        <div class="card-pad">
          @for (s of recentSellers; track s.id) {
            <div class="list-item"><span class="thumb">{{initials(s.store)}}</span>
              <div style="flex:1"><div class="cell-main">{{s.store}}</div><div class="cell-sub">{{s.name}} · {{dstr(s.appliedAt)}}</div></div>
              <kc-badge [value]="s.status"></kc-badge>
            </div>
          }
          <div class="sect">New buyers & sellers</div>
          <p class="muted" style="margin:0">{{newBuyers}} new buyers · {{newSellers}} new sellers this month</p>
        </div>
      </div>
    </div>
  } @else { <div class="skel" style="height:420px"></div> }`,
})
export class DashboardComponent {
  d = inject(AdminService);
  money = money; dstr = dstr; initials = initials;
  pendingSellers = this.d.sellers().filter(s => s.status === 'pending').length;
  pendingProducts = this.d.products().filter(p => p.status === 'pending').length;
  openOrders = this.d.orders().filter(o => o.status === 'pending' || o.status === 'processing').length;
  openReports = this.d.reports().filter(r => r.status === 'open').length;
  openComplaints = this.d.complaints().filter(c => c.status !== 'resolved').length;
  newBuyers = this.d.buyers().filter(b => this.monthDiff(b.registeredAt) === 0).length;
  newSellers = this.d.sellers().filter(s => this.monthDiff(s.appliedAt) === 0).length;
  best = [...this.d.products()].sort((a, b) => b.sold - a.sold).slice(0, 5);
  low = this.d.products().filter(p => p.status === 'active' && p.stock <= 5);
  recentSellers = [...this.d.sellers()].slice(-4).reverse();
  revVals = computed(() => this.d.revenueSeries().map(x => x.value));
  revLabels = computed(() => this.d.revenueSeries().map(x => x.label));
  private monthDiff(iso: string) { const n = new Date(), d = new Date(iso); return (n.getFullYear() - d.getFullYear()) * 12 + n.getMonth() - d.getMonth(); }
}