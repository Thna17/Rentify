import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdminService, Buyer } from '../admin-data.service';
import { BadgeComponent } from '../ui/badge.component';
import { ConfirmComponent } from '../ui/confirm.component';
import { IconComponent } from '../ui/icon.component';
import { MenuComponent, MenuItem } from '../ui/menu.component';
import { dstr, initials, money } from '../ui/format';

@Component({
  standalone: true, imports: [BadgeComponent, ConfirmComponent, IconComponent, MenuComponent],
  template: `
  @if (d.ready()) {
    <div class="page-head"><div><h1 class="page-title">Buyers</h1><p class="page-sub">View, search, suspend or deactivate buyer accounts</p></div>
      <span class="muted">{{rows().length}} buyers</span></div>
    <div class="toolbar">
      <input class="input input-search" placeholder="Search name or email" [value]="q()" (input)="q.set($any($event.target).value)"/>
      <select class="input" [value]="status()" (change)="status.set($any($event.target).value)">
        <option value="all">All statuses</option><option value="active">Active</option>
        <option value="suspended">Suspended</option><option value="deactivated">Deactivated</option>
      </select>
    </div>

    <div class="card"><table class="tbl">
      <thead><tr><th>Name</th><th>Email</th><th>Registered</th><th class="right">Orders</th><th class="right">Spending</th><th>Status</th><th class="right">Actions</th></tr></thead>
      <tbody>
        @for (b of rows(); track b.id) {
          <tr>
            <td><div class="cell-flex"><span class="thumb">{{initials(b.name)}}</span><span class="cell-main">{{b.name}}</span></div></td>
            <td class="cell-sub">{{b.email}}</td><td>{{dstr(b.registeredAt)}}</td>
            <td class="num">{{d.buyerStats(b.name).orders}}</td><td class="num">{{money(d.buyerStats(b.name).spent)}}</td>
            <td><kc-badge [value]="b.status"></kc-badge></td>
            <td class="right"><div class="cell-actions">
              <button class="icon-btn" aria-label="View details" data-tip="View details" (click)="sel.set(b)"><kc-icon name="eye" [size]="14"></kc-icon></button>
              <kc-menu [items]="menuFor(b)" (pick)="ask(b, $event)"></kc-menu>
            </div></td>
          </tr>
        } @empty { <tr><td colspan="7"><div class="empty">No buyers match your filters.</div></td></tr> }
      </tbody>
    </table></div>

    @if (sel(); as b) {
      <div class="drawer-back" (click)="sel.set(null)"></div>
      <div class="drawer">
        <div class="drawer-head"><div><b>{{b.name}}</b> <kc-badge [value]="b.status"></kc-badge></div>
          <button class="icon-btn" aria-label="Close" (click)="sel.set(null)"><kc-icon name="x" [size]="14"></kc-icon></button></div>
        <div class="drawer-body">
          <div class="kv"><span class="k">Email</span>{{b.email}}</div>
          <div class="kv"><span class="k">Registered</span>{{dstr(b.registeredAt)}}</div>
          <div class="kv"><span class="k">Orders</span>{{d.buyerStats(b.name).orders}}</div>
          <div class="kv"><span class="k">Total spending</span>{{money(d.buyerStats(b.name).spent)}}</div>
          <div class="sect">Order history</div>
          @for (o of ordersOf(b); track o.id) {
            <div class="list-item"><div style="flex:1"><div class="cell-main">{{o.id}} · {{money(o.total)}}</div>
              <div class="cell-sub">{{o.items}} — {{o.seller}}</div></div><kc-badge [value]="o.status"></kc-badge></div>
          } @empty { <p class="muted">No orders yet.</p> }
          <div class="sect">Account actions</div>
          <div class="cell-actions" style="justify-content:flex-start">
            @if (b.status === 'active') {
              <button class="btn btn-danger" (click)="ask(b, 'suspended')">Suspend</button>
              <button class="btn" (click)="ask(b, 'deactivated')">Deactivate</button>
            } @else { <button class="btn btn-primary" (click)="ask(b, 'active')">Activate account</button> }
          </div>
        </div>
      </div>
    }

    @if (confirm(); as c) {
      <kc-confirm [title]="(c.to === 'active' ? 'Activate ' : c.to === 'suspended' ? 'Suspend ' : 'Deactivate ') + c.b.name + '?'"
        [message]="c.to === 'active' ? 'The account will regain full access to the marketplace.' : 'The account will no longer be able to sign in or place orders.'"
        [confirmLabel]="c.to === 'active' ? 'Activate' : c.to === 'suspended' ? 'Suspend' : 'Deactivate'"
        (confirm)="apply()" (cancel)="confirm.set(null)"></kc-confirm>
    }
  } @else { <div class="skel" style="height:360px"></div> }`,
})
export class BuyersComponent {
  d = inject(AdminService);
  q = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('q') ?? '');
  status = signal('all');
  sel = signal<Buyer | null>(null);
  confirm = signal<{ b: Buyer; to: Buyer['status'] } | null>(null);
  dstr = dstr; money = money; initials = initials;
  rows = computed(() => this.d.buyers().filter(b =>
    (this.status() === 'all' || b.status === this.status()) &&
    (!this.q() || b.name.toLowerCase().includes(this.q().toLowerCase()) || b.email.toLowerCase().includes(this.q().toLowerCase()))));
  ordersOf = (b: Buyer) => this.d.orders().filter(o => o.buyer === b.name);
  menuFor(b: Buyer): MenuItem[] {
    return b.status === 'active'
      ? [{ label: 'Suspend', icon: 'ban', danger: true, action: 'suspended' },
         { label: 'Deactivate', icon: 'x', danger: true, action: 'deactivated' }]
      : [{ label: 'Activate account', icon: 'check', action: 'active' }];
  }
  ask(b: Buyer, to: string) { this.confirm.set({ b, to: to as Buyer['status'] }); }
  apply() { const c = this.confirm()!; this.d.setBuyerStatus(c.b.id, c.to); this.confirm.set(null); this.sel.set(null); }
}