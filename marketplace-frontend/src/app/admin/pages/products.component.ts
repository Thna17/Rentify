import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdminService, Product } from '../admin-data.service';
import { BadgeComponent } from '../ui/badge.component';
import { ConfirmComponent } from '../ui/confirm.component';
import { IconComponent } from '../ui/icon.component';
import { MenuComponent, MenuItem } from '../ui/menu.component';
import { initials, money } from '../ui/format';

@Component({
  standalone: true, imports: [BadgeComponent, ConfirmComponent, IconComponent, MenuComponent],
  template: `
  @if (d.ready()) {
    <div class="page-head"><div><h1 class="page-title">Products</h1><p class="page-sub">Approve, edit, hide or remove marketplace listings</p></div></div>
    <div class="toolbar">
      <input class="input input-search" placeholder="Search products" [value]="q()" (input)="q.set($any($event.target).value)"/>
      <select class="input" [value]="cat()" (change)="cat.set($any($event.target).value)">
        <option value="all">All categories</option>
        @for (c of d.categories(); track c.id) { <option [value]="c.name">{{c.name}}</option> }
      </select>
      <select class="input" [value]="st()" (change)="st.set($any($event.target).value)">
        <option value="all">All statuses</option><option value="pending">Pending</option>
        <option value="active">Active</option><option value="hidden">Hidden</option><option value="rejected">Rejected</option>
      </select>
      <select class="input" [value]="selStore()" (change)="selStore.set($any($event.target).value)">
        <option value="all">All sellers</option>
        @for (s of d.sellers(); track s.id) { <option [value]="s.id">{{s.store}}</option> }
      </select>
    </div>

    <div class="card"><table class="tbl">
      <thead><tr><th>Product</th><th>Seller</th><th>Category</th><th class="right">Price</th><th class="right">Stock</th><th class="right">Sold</th><th>Status</th><th class="right">Actions</th></tr></thead>
      <tbody>
        @for (p of rows(); track p.id) {
          <tr>
            <td><div class="cell-flex"><span class="thumb">{{initials(p.name)}}</span>
              <div><div class="cell-main">{{p.name}}</div>@if (p.reported) { <span class="cell-sub" style="color:var(--red)">⚑ reported</span> }</div></div></td>
            <td>{{d.storeName(p.sellerId)}}</td><td class="cell-sub">{{p.category}}</td>
            <td class="num">{{money(p.price)}}</td><td class="num">{{p.stock}}</td><td class="num">{{p.sold}}</td>
            <td><kc-badge [value]="p.status"></kc-badge></td>
            <td class="right"><div class="cell-actions">
              @if (p.status === 'pending') {
                <button class="btn btn-sm btn-primary" (click)="d.setProductStatus(p.id, 'active')">Approve</button>
                <kc-menu [items]="[{label: 'Reject listing', icon: 'x', danger: true, action: 'reject'}]" (pick)="act($event, p)"></kc-menu>
              } @else {
                <button class="icon-btn" aria-label="Edit" data-tip="Edit" (click)="openEdit(p)"><kc-icon name="edit" [size]="14"></kc-icon></button>
                <kc-menu [items]="menuFor(p)" (pick)="act($event, p)"></kc-menu>
              }
            </div></td>
          </tr>
        } @empty { <tr><td colspan="8"><div class="empty">No products match your filters.</div></td></tr> }
      </tbody>
    </table></div>

    @if (edit(); as p) {
      <div class="modal-back"><div class="modal">
        <h3>Edit product</h3><p>{{p.name}} — {{d.storeName(p.sellerId)}}</p>
        <div class="form-row"><label>Price (USD)</label><input class="input" type="number" min="0" [value]="ePrice()" (input)="ePrice.set(+$any($event.target).value)"/></div>
        <div class="form-row"><label>Stock</label><input class="input" type="number" min="0" [value]="eStock()" (input)="eStock.set(+$any($event.target).value)"/></div>
        <div class="form-row"><label>Status</label><select class="input" [value]="eStatus()" (change)="eStatus.set($any($event.target).value)">
          <option value="active">Active</option><option value="pending">Pending</option>
          <option value="hidden">Hidden</option><option value="rejected">Rejected</option></select></div>
        <div class="modal-actions">
          <button class="btn" (click)="edit.set(null)">Cancel</button>
          <button class="btn btn-primary" (click)="save(p.id)">Save changes</button>
        </div>
      </div></div>
    }

    @if (del(); as p) {
      <kc-confirm title="Delete product?" [message]="'“' + p.name + '” will be permanently removed from the marketplace.'"
        confirmLabel="Delete" (confirm)="d.deleteProduct(p.id); del.set(null)" (cancel)="del.set(null)"></kc-confirm>
    }
  } @else { <div class="skel" style="height:360px"></div> }`,
})
export class ProductsComponent {
  d = inject(AdminService);
  q = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('q') ?? '');
  cat = signal('all'); st = signal('all'); selStore = signal('all');
  edit = signal<Product | null>(null); del = signal<Product | null>(null);
  ePrice = signal(0); eStock = signal(0); eStatus = signal<Product['status']>('active');
  money = money; initials = initials;
  rows = computed(() => this.d.products().filter(p =>
    (this.cat() === 'all' || p.category === this.cat()) &&
    (this.st() === 'all' || p.status === this.st()) &&
    (this.selStore() === 'all' || p.sellerId === this.selStore()) &&
    (!this.q() || p.name.toLowerCase().includes(this.q().toLowerCase()))));
  menuFor(p: Product): MenuItem[] {
    const m: MenuItem[] = [];
    if (p.status === 'active') m.push({ label: 'Hide from marketplace', icon: 'eye-off', action: 'hide' });
    if (p.status === 'hidden') m.push({ label: 'Unhide', icon: 'eye', action: 'unhide' });
    m.push({ label: 'Delete', icon: 'trash', danger: true, action: 'delete' });
    return m;
  }
  act(a: string, p: Product) {
    if (a === 'hide') this.d.setProductStatus(p.id, 'hidden');
    if (a === 'unhide') this.d.setProductStatus(p.id, 'active');
    if (a === 'reject') this.d.setProductStatus(p.id, 'rejected');
    if (a === 'delete') this.del.set(p);
  }
  openEdit(p: Product) { this.ePrice.set(p.price); this.eStock.set(p.stock); this.eStatus.set(p.status); this.edit.set(p); }
  save(id: string) { this.d.updateProduct(id, { price: this.ePrice(), stock: this.eStock(), status: this.eStatus() }); this.edit.set(null); }
}