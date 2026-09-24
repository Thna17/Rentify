import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdminService, Order } from '../admin-data.service';
import { BadgeComponent } from '../ui/badge.component';
import { ConfirmComponent } from '../ui/confirm.component';
import { IconComponent } from '../ui/icon.component';
import { MenuComponent } from '../ui/menu.component';
import { dstr, money } from '../ui/format';

@Component({
  standalone: true, imports: [BadgeComponent, ConfirmComponent, IconComponent, MenuComponent],
  template: `
  @if (d.ready()) {
    <div class="page-head"><div><h1 class="page-title">Orders</h1><p class="page-sub">Monitor orders, inspect details and cancel when necessary</p></div></div>
    <div class="toolbar">
      <div class="tabs">
        @for (t of ['all', 'pending', 'processing', 'completed', 'cancelled']; track t) {
          <button class="tab" [class.active]="tab() === t" (click)="tab.set(t)">{{t === 'all' ? 'All' : t[0].toUpperCase() + t.slice(1)}}</button>
        }
      </div>
      <input class="input input-search" placeholder="Search order / buyer / seller" [value]="q()" (input)="q.set($any($event.target).value)"/>
    </div>

    <div class="card"><table class="tbl">
      <thead><tr><th>Order</th><th>Buyer</th><th>Seller</th><th>Placed</th><th class="right">Total</th><th>Payment</th><th>Status</th><th class="right">Actions</th></tr></thead>
      <tbody>
        @for (o of rows(); track o.id) {
          <tr>
            <td class="cell-main">{{o.id}}</td><td>{{o.buyer}}</td><td>{{o.seller}}</td>
            <td class="cell-sub">{{dstr(o.placedAt)}}</td><td class="num">{{money(o.total)}}</td>
            <td><kc-badge [value]="o.payment"></kc-badge></td><td><kc-badge [value]="o.status"></kc-badge></td>
            <td class="right"><div class="cell-actions">
              <button class="icon-btn" aria-label="View order" data-tip="View order" (click)="sel.set(o)"><kc-icon name="eye" [size]="14"></kc-icon></button>
              @if (o.status !== 'cancelled' && o.status !== 'completed') {
                <kc-menu [items]="[{label: 'Cancel order', icon: 'ban', danger: true, action: 'cancel'}]" (pick)="cancel.set(o)"></kc-menu>
              }
            </div></td>
          </tr>
        } @empty { <tr><td colspan="8"><div class="empty">No orders in this view.</div></td></tr> }
      </tbody>
    </table></div>

    @if (sel(); as o) {
      <div class="drawer-back" (click)="sel.set(null)"></div>
      <div class="drawer">
        <div class="drawer-head"><div><b>{{o.id}}</b> <kc-badge [value]="o.status"></kc-badge></div>
          <button class="icon-btn" aria-label="Close" (click)="sel.set(null)"><kc-icon name="x" [size]="14"></kc-icon></button></div>
        <div class="drawer-body">
          <div class="kv"><span class="k">Buyer</span>{{o.buyer}}</div>
          <div class="kv"><span class="k">Seller</span>{{o.seller}}</div>
          <div class="kv"><span class="k">Placed</span>{{dstr(o.placedAt)}}</div>
          <div class="kv"><span class="k">Items</span>{{o.items}}</div>
          <div class="kv"><span class="k">Payment status</span><kc-badge [value]="o.payment"></kc-badge></div>
          <div class="kv"><span class="k">Total</span><b>{{money(o.total)}}</b></div>
          @if (o.status !== 'cancelled' && o.status !== 'completed') {
            <div class="sect">Actions</div>
            <button class="btn btn-danger" (click)="cancel.set(o)">Cancel order</button>
          }
        </div>
      </div>
    }

    @if (cancel(); as o) {
      <kc-confirm title="Cancel order?" [message]="o.id + ' will be cancelled. The buyer and seller will see the updated status.'"
        confirmLabel="Cancel order" (confirm)="d.setOrderStatus(o.id, 'cancelled'); cancel.set(null); sel.set(null)" (cancel)="cancel.set(null)"></kc-confirm>
    }
  } @else { <div class="skel" style="height:360px"></div> }`,
})
export class OrdersComponent {
  d = inject(AdminService);
  q = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('q') ?? '');
  tab = signal('all');
  sel = signal<Order | null>(null);
  cancel = signal<Order | null>(null);
  dstr = dstr; money = money;
  rows = computed(() => this.d.orders().filter(o =>
    (this.tab() === 'all' || o.status === this.tab()) &&
    (!this.q() || [o.id, o.buyer, o.seller].some(x => x.toLowerCase().includes(this.q().toLowerCase())))));
}