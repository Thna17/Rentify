import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdminService, Seller } from '../admin-data.service';
import { BadgeComponent } from '../ui/badge.component';
import { ConfirmComponent } from '../ui/confirm.component';
import { IconComponent } from '../ui/icon.component';
import { MenuComponent, MenuItem } from '../ui/menu.component';
import { dstr, initials, money } from '../ui/format';

@Component({
  standalone: true, imports: [BadgeComponent, ConfirmComponent, IconComponent, MenuComponent],
  template: `
  @if (d.ready()) {
    <div class="page-head"><div><h1 class="page-title">Sellers</h1><p class="page-sub">Review applications, verify, suspend and manage seller accounts</p></div></div>
    <div class="toolbar">
      <div class="tabs">
        @for (t of ['all', 'pending', 'active', 'suspended']; track t) {
          <button class="tab" [class.active]="tab() === t" (click)="tab.set(t)">{{t === 'all' ? 'All' : t[0].toUpperCase() + t.slice(1)}}</button>
        }
      </div>
      <input class="input input-search" placeholder="Search store or seller" [value]="q()" (input)="q.set($any($event.target).value)"/>
    </div>

    <div class="card"><table class="tbl">
      <thead><tr><th>Store</th><th>Seller</th><th class="right">Products</th><th class="right">Orders</th><th class="right">Revenue</th><th>Verification</th><th>Status</th><th class="right">Actions</th></tr></thead>
      <tbody>
        @for (s of rows(); track s.id) {
          <tr>
            <td><div class="cell-flex"><span class="thumb">{{initials(s.store)}}</span><span class="cell-main">{{s.store}}</span></div></td>
            <td><div class="cell-main">{{s.name}}</div><div class="cell-sub">{{s.email}}</div></td>
            <td class="num">{{d.sellerStats(s.store).products}}</td><td class="num">{{d.sellerStats(s.store).orders}}</td>
            <td class="num">{{money(d.sellerStats(s.store).revenue)}}</td>
            <td><kc-badge [value]="s.verification"></kc-badge></td><td><kc-badge [value]="s.status"></kc-badge></td>
            <td class="right"><div class="cell-actions">
              @if (s.status === 'pending') {
                <button class="btn btn-sm btn-primary" (click)="d.approveSeller(s.id)">Approve</button>
                <kc-menu [items]="[{label: 'Reject application', icon: 'x', danger: true, action: 'reject'}]" (pick)="act($event, s)"></kc-menu>
              } @else {
                <button class="icon-btn" aria-label="View profile" data-tip="View profile" (click)="sel.set(s)"><kc-icon name="eye" [size]="14"></kc-icon></button>
                <kc-menu [items]="menuFor(s)" (pick)="act($event, s)"></kc-menu>
              }
            </div></td>
          </tr>
        } @empty { <tr><td colspan="8"><div class="empty">No sellers in this view.</div></td></tr> }
      </tbody>
    </table></div>

    @if (sel(); as s) {
      <div class="drawer-back" (click)="sel.set(null)"></div>
      <div class="drawer">
        <div class="drawer-head"><div><b>{{s.store}}</b> <kc-badge [value]="s.status"></kc-badge> <kc-badge [value]="s.verification"></kc-badge></div>
          <button class="icon-btn" aria-label="Close" (click)="sel.set(null)"><kc-icon name="x" [size]="14"></kc-icon></button></div>
        <div class="drawer-body">
          <div class="kv"><span class="k">Owner</span>{{s.name}}</div>
          <div class="kv"><span class="k">Email</span>{{s.email}}</div>
          <div class="kv"><span class="k">Applied</span>{{dstr(s.appliedAt)}}</div>
          <div class="kv"><span class="k">Revenue (completed)</span>{{money(d.sellerStats(s.store).revenue)}}</div>
          <div class="sect">Products</div>
          @for (p of productsOf(s); track p.id) {
            <div class="list-item"><div style="flex:1"><div class="cell-main">{{p.name}}</div>
              <div class="cell-sub">{{money(p.price)}} · {{p.stock}} in stock · {{p.sold}} sold</div></div><kc-badge [value]="p.status"></kc-badge></div>
          } @empty { <p class="muted">No listings yet.</p> }
          <div class="sect">Orders</div>
          @for (o of ordersOf(s); track o.id) {
            <div class="list-item"><div style="flex:1"><div class="cell-main">{{o.id}} · {{money(o.total)}}</div>
              <div class="cell-sub">{{o.buyer}}</div></div><kc-badge [value]="o.status"></kc-badge></div>
          } @empty { <p class="muted">No orders yet.</p> }
        </div>
      </div>
    }

    @if (confirm(); as c) {
      <kc-confirm title="Are you sure?" [message]="c.msg" (confirm)="c.fn(); confirm.set(null)" (cancel)="confirm.set(null)"></kc-confirm>
    }
  } @else { <div class="skel" style="height:360px"></div> }`,
})
export class SellersComponent {
  d = inject(AdminService);
  q = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('q') ?? '');
  tab = signal('all');
  sel = signal<Seller | null>(null);
  confirm = signal<{ fn: () => void; msg: string } | null>(null);
  dstr = dstr; money = money; initials = initials;
  rows = computed(() => this.d.sellers().filter(s =>
    (this.tab() === 'all' || s.status === this.tab()) &&
    (!this.q() || s.store.toLowerCase().includes(this.q().toLowerCase()) || s.name.toLowerCase().includes(this.q().toLowerCase()))));
  productsOf = (s: Seller) => this.d.products().filter(p => p.sellerId === s.id);
  ordersOf = (s: Seller) => this.d.orders().filter(o => o.seller === s.store);
  menuFor(s: Seller): MenuItem[] {
    const m: MenuItem[] = [];
    if (s.verification !== 'verified') m.push({ label: 'Verify seller', icon: 'shield', action: 'verify' });
    if (s.status === 'active') m.push({ label: 'Suspend', icon: 'ban', danger: true, action: 'suspend' });
    else m.push({ label: 'Reactivate', icon: 'refresh', action: 'reactivate' });
    return m;
  }
  act(action: string, s: Seller) {
    if (action === 'verify') this.d.verifySeller(s.id);
    if (action === 'reactivate') this.d.setSellerStatus(s.id, 'active');
    if (action === 'suspend') this.confirm.set({ fn: () => this.d.setSellerStatus(s.id, 'suspended'), msg: `Suspend ${s.store}? Their listings will be hidden from buyers.` });
    if (action === 'reject') this.confirm.set({ fn: () => this.d.rejectSeller(s.id), msg: `Reject ${s.store}? Their application will be closed.` });
  }
}