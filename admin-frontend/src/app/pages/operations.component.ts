import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { apiErrorMessage } from '../core/auth/auth.service';
import { Page, PlatformOperationsService, Section } from '../services/platform-operations.service';

type Column = { title: string; key: string; kind?: 'date' | 'money' | 'status' };
const definitions: Record<Section, { title: string; subtitle: string; columns: Column[] }> = {
  stores: { title: 'Stores & seller review', subtitle: 'Core Store records; a website is optional and approval gates marketplace selling.',
    columns: [{ title: 'Store', key: 'name' }, { title: 'Owner', key: 'owner' },
      { title: 'Category', key: 'primaryCategory' }, { title: 'Website', key: 'website' },
      { title: 'Marketplace', key: 'marketplaceApprovalStatus', kind: 'status' },
      { title: 'Store status', key: 'status', kind: 'status' }] },
  users: { title: 'Platform users', subtitle: 'Shared buyer and merchant accounts from Core identity.',
    columns: [{ title: 'Name', key: 'name' }, { title: 'Email', key: 'email' },
      { title: 'Phone', key: 'phoneNumber' }, { title: 'Role', key: 'role' },
      { title: 'Verified', key: 'isVerified' }, { title: 'Joined', key: 'createdAt', kind: 'date' }] },
  websites: { title: 'Storefront websites', subtitle: 'Optional Website channel linked to a canonical Store.',
    columns: [{ title: 'Website', key: 'name' }, { title: 'Domain', key: 'domain' },
      { title: 'Store ID', key: 'storeId' }, { title: 'Status', key: 'status', kind: 'status' },
      { title: 'Last deployment', key: 'lastDeployment', kind: 'date' }] },
  templates: { title: 'Storefront templates', subtitle: 'Core template catalog.',
    columns: [{ title: 'Name', key: 'name' }, { title: 'Category', key: 'category' },
      { title: 'Framework', key: 'framework' }, { title: 'Created', key: 'createdAt', kind: 'date' }] },
  subscriptions: { title: 'Subscriptions', subtitle: 'Core subscription access and billing cycle state.',
    columns: [{ title: 'Subscription ID', key: 'id' }, { title: 'Website ID', key: 'websiteId' },
      { title: 'Plan', key: 'Package.name' }, { title: 'Status', key: 'status', kind: 'status' },
      { title: 'Start', key: 'startDate', kind: 'date' }, { title: 'End', key: 'endDate', kind: 'date' }] },
  packages: { title: 'Plans', subtitle: 'Current package definitions from Core.',
    columns: [{ title: 'Name', key: 'name' }, { title: 'Price', key: 'price', kind: 'money' },
      { title: 'Duration', key: 'duration' }] },
  'plan-payments': { title: 'Plan payments', subtitle: 'Subscription payments recorded by Core; separate from customer orders.',
    columns: [{ title: 'Payment ID', key: 'id' }, { title: 'User ID', key: 'userId' },
      { title: 'Amount', key: 'amount', kind: 'money' }, { title: 'Method', key: 'paymentMethod' },
      { title: 'Status', key: 'status', kind: 'status' }, { title: 'Date', key: 'createdAt', kind: 'date' }] },
  products: { title: 'Shared catalog', subtitle: 'Canonical Commerce products and marketplace visibility override.',
    columns: [{ title: 'Product', key: 'name' }, { title: 'Store ID', key: 'storeId' },
      { title: 'Marketplace category', key: 'marketplaceCategory' },
      { title: 'Price', key: 'price', kind: 'money' }, { title: 'Stock', key: 'stockQuantity' },
      { title: 'Listing override', key: 'marketplaceVisibility' },
      { title: 'Status', key: 'status', kind: 'status' }] },
  orders: { title: 'Orders across channels', subtitle: 'Marketplace, storefront and POS order facts; merchant owns fulfillment.',
    columns: [{ title: 'Order', key: 'orderNumber' }, { title: 'Store ID', key: 'storeId' },
      { title: 'Channel', key: 'salesChannel' }, { title: 'Total', key: 'totalAmount', kind: 'money' },
      { title: 'Payment', key: 'Payment.status', kind: 'status' },
      { title: 'Delivery', key: 'deliveryStatus', kind: 'status' },
      { title: 'Placed', key: 'createdAt', kind: 'date' }] },
  payments: { title: 'Customer payment records', subtitle: 'Commerce payment evidence; COD cash stays with merchants.',
    columns: [{ title: 'Payment ID', key: 'id' }, { title: 'Order ID', key: 'orderId' },
      { title: 'Method', key: 'paymentMethod' }, { title: 'Amount', key: 'amount', kind: 'money' },
      { title: 'Status', key: 'status', kind: 'status' }, { title: 'Date', key: 'createdAt', kind: 'date' }] },
  reviews: { title: 'Product reviews', subtitle: 'Buyer feedback and current moderation status.',
    columns: [{ title: 'Buyer', key: 'buyerName' }, { title: 'Product ID', key: 'productId' },
      { title: 'Rating', key: 'rating' }, { title: 'Comment', key: 'comment' },
      { title: 'Status', key: 'status', kind: 'status' }, { title: 'Date', key: 'createdAt', kind: 'date' }] },
  reports: { title: 'Buyer reports', subtitle: 'Order complaints and return requests recorded by Commerce.',
    columns: [{ title: 'Type', key: 'type' }, { title: 'Order ID', key: 'orderId' },
      { title: 'Store ID', key: 'storeId' }, { title: 'Reason', key: 'details.reason' },
      { title: 'Date', key: 'createdAt', kind: 'date' }] },
  billing: { title: 'Usage statements', subtitle: 'Commerce usage billing, distinct from customer payments.',
    columns: [{ title: 'Statement ID', key: 'id' }, { title: 'Store ID', key: 'storeId' },
      { title: 'Month', key: 'month' }, { title: 'Amount', key: 'totalAmount', kind: 'money' },
      { title: 'Status', key: 'status', kind: 'status' }] },
};
const checklist = [
  ['accountVerified', 'Merchant contact verified'],
  ['identityReviewed', 'Seller identity reviewed'],
  ['storeDetailsReviewed', 'Store and pickup details reviewed'],
  ['sampleProductReviewed', 'Sample product reviewed'],
  ['fulfillmentReviewed', 'Delivery, COD, returns and refunds reviewed'],
  ['restrictedProductsReviewed', 'Restricted products checked'],
] as const;

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (section === 'dashboard') {
      <div class="page-head"><div><p class="ops-eyebrow">OPERATIONS / LIVE</p><h1 class="page-title">Platform overview</h1><p class="page-sub">Operational counts from Core and Commerce. No inferred revenue or commission.</p></div></div>
      @if (coreError()) { <div class="ops-alert">Core unavailable: {{coreError()}}</div> }
      @if (commerceError()) { <div class="ops-alert">Commerce unavailable: {{commerceError()}}</div> }
      <div class="ops-stats">
        <a routerLink="/stores"><small>Stores</small><strong>{{coreOverview()?.['storeCount'] ?? '—'}}</strong><span>{{coreOverview()?.['activeStores'] ?? '—'}} active</span></a>
        <a routerLink="/stores"><small>Pending seller applications</small><strong>{{coreOverview()?.['pendingSellers'] ?? '—'}}</strong><span>Approval gates marketplace selling</span></a>
        <a routerLink="/websites"><small>Storefront websites</small><strong>{{coreOverview()?.['websiteCount'] ?? '—'}}</strong><span>Optional sales channel</span></a>
        <a routerLink="/users"><small>Users</small><strong>{{coreOverview()?.['userCount'] ?? '—'}}</strong><span>Shared identity</span></a>
        <a routerLink="/products"><small>Catalog products</small><strong>{{commerceOverview()?.['productCount'] ?? '—'}}</strong><span>Canonical merchant products</span></a>
        <a routerLink="/orders"><small>Marketplace orders</small><strong>{{commerceOverview()?.['marketplaceOrders'] ?? '—'}}</strong><span>{{commerceOverview()?.['openMarketplaceOrders'] ?? '—'}} open</span></a>
        <a routerLink="/reports"><small>Buyer reports</small><strong>{{commerceOverview()?.['buyerReports'] ?? '—'}}</strong><span>Complaints and returns</span></a>
        <a routerLink="/subscriptions"><small>Active subscriptions</small><strong>{{coreOverview()?.['activeSubscriptions'] ?? '—'}}</strong><span>{{coreOverview()?.['pendingPlanPayments'] ?? '—'}} plan payments pending</span></a>
      </div>
      <div class="ops-panels">
        <section class="card"><div class="ops-panel-head"><div><h2>Seller review queue</h2><p>Submitted applications awaiting Core review</p></div><a routerLink="/stores">All stores →</a></div>
          @for (store of pendingStores(); track store.id) { <button class="ops-queue-row" (click)="openStore(store)"><span class="thumb">{{store.name[0]}}</span><span><b>{{store.name}}</b><small>{{store.primaryCategory || 'Category missing'}} · {{store.owner?.email || 'No email'}}</small></span><em>Review →</em></button> }
          @empty { <p class="ops-empty">{{queueError() || 'No pending seller applications.'}}</p> }
        </section>
        <section class="card"><div class="ops-panel-head"><div><h2>Payment boundary</h2><p>Current marketplace launch model</p></div></div><div class="ops-copy"><p>Marketplace orders use cash on delivery. Merchants deliver, collect cash, and handle returns and refunds. Rentify records order state and charges subscriptions separately.</p><p>Online marketplace settlement, seller payouts, and commission are future capabilities and are not shown as current platform income.</p></div></section>
      </div>
    } @else {
      <div class="page-head"><div><p class="ops-eyebrow">{{coreSource ? 'CORE' : 'COMMERCE'}} / LIVE</p><h1 class="page-title">{{definition.title}}</h1><p class="page-sub">{{definition.subtitle}}</p></div></div>
      @if (storeFilter) { <div class="ops-filter">Filtered to Store {{storeFilter}} <a [routerLink]="'/' + section">Clear</a></div> }
      <div class="ops-toolbar"><form (submit)="search($event)"><input class="input" aria-label="Search records" placeholder="Search records" [value]="query()" (input)="query.set($any($event.target).value)"><button class="btn btn-primary" type="submit">Search</button></form>
        @if (section === 'stores') { <select class="input" aria-label="Approval status" [value]="status()" (change)="changeStatus($any($event.target).value)"><option value="">All approval states</option><option value="pending">Pending application</option><option value="approved">Approved</option><option value="needs_changes">Needs changes</option><option value="rejected">Rejected</option><option value="suspended">Suspended</option></select> }
        @if (section === 'orders') { <select class="input" aria-label="Sales channel" [value]="channel()" (change)="changeChannel($any($event.target).value)"><option value="">All channels</option><option value="marketplace">Marketplace</option><option value="storefront">Storefront</option><option value="pos">POS</option></select> }
      </div>
      @if (error()) { <div class="ops-alert">{{error()}} <button class="btn btn-default btn-sm" (click)="load()">Retry</button></div> }
      @if (loading()) { <div class="card ops-empty">Loading live records…</div> }
      @if (!loading() && !error()) {
        <div class="card ops-table-scroll"><table class="tbl"><thead><tr>@for (column of definition.columns; track column.title) { <th>{{column.title}}</th> } @if (section === 'stores' || section === 'orders') { <th></th> }</tr></thead><tbody>
          @for (row of rows(); track row.id) { <tr>@for (column of definition.columns; track column.title) { <td><span [class.ops-pill]="column.kind === 'status'" [class]="statusClass(row, column)">{{cell(row, column)}}</span></td> }
            @if (section === 'stores' || section === 'orders') { <td><button class="btn btn-default btn-sm" (click)="section === 'stores' ? openStore(row) : selected.set(row)">Inspect</button></td> }
          </tr> } @empty { <tr><td colspan="9"><p class="ops-empty">No matching live records.</p></td></tr> }
        </tbody></table></div>
        <div class="ops-pagination"><span>{{total()}} records · page {{page()}} of {{pages()}}</span><div><button class="btn btn-default btn-sm" [disabled]="page() <= 1" (click)="goPage(page()-1)">Previous</button><button class="btn btn-default btn-sm" [disabled]="page() >= pages()" (click)="goPage(page()+1)">Next</button></div></div>
      }
    }
    @if (selected(); as item) {
      <div class="drawer-back" (click)="selected.set(null)"></div><aside class="drawer ops-drawer"><div class="drawer-head"><b>{{item.name || item.orderNumber || item.id}}</b><button class="icon-btn" aria-label="Close" (click)="selected.set(null)">✕</button></div><div class="drawer-body">
        @if (section === 'stores' || section === 'dashboard') {
          <div class="ops-facts"><span>Store ID</span><b>{{item.id}}</b><span>Owner</span><b>{{item.owner?.name || '—'}}</b><span>Contact</span><b>{{item.owner?.email || item.owner?.phoneNumber || '—'}}</b><span>Contact verified</span><b>{{item.owner?.isVerified ? 'Yes' : 'No'}}</b><span>Category</span><b>{{item.primaryCategory || 'Missing'}}</b><span>Website</span><b>{{item.website?.name || 'Marketplace only'}}</b><span>Marketplace enabled</span><b>{{item.marketplaceEnabled ? 'Yes' : 'Opted out'}}</b><span>Approval</span><b>{{label(item.marketplaceApprovalStatus)}}</b></div>
          <div class="ops-links"><a [routerLink]="['/products']" [queryParams]="{storeId:item.id}" (click)="selected.set(null)">Products →</a><a [routerLink]="['/orders']" [queryParams]="{storeId:item.id}" (click)="selected.set(null)">Orders →</a></div>
          <h3>Seller application</h3>
          @if (item.sellerApplication; as app) {
            <div class="ops-facts"><span>Responsible person</span><b>{{app.responsibleName}}</b><span>Pickup</span><b>{{app.pickupLocation}}</b><span>Buyer contact</span><b>{{app.buyerContact}}</b><span>Sample product</span><b>{{app.sampleProductDescription}}</b></div>
            <h3>Approval checklist</h3><p class="cell-sub">All checks are required for approval; Core records every decision.</p>
            @for (check of checklist; track check[0]) { <label class="ops-check"><input type="checkbox" [checked]="checks()[check[0]]" (change)="setCheck(check[0], $any($event.target).checked)">{{check[1]}}</label> }
            <label class="ops-field">Reason / requested changes<textarea class="input" rows="3" [value]="reason()" (input)="reason.set($any($event.target).value)"></textarea></label>
            @if (decisionError()) { <div class="ops-alert">{{decisionError()}}</div> }
            <div class="ops-actions"><button class="btn btn-primary" [disabled]="saving() || !canApprove(item)" (click)="decide(item,'approved')">Approve</button><button class="btn btn-default" [disabled]="saving()" (click)="decide(item,'needs_changes')">Needs changes</button><button class="btn btn-danger" [disabled]="saving()" (click)="decide(item,item.marketplaceApprovalStatus === 'approved' ? 'suspended' : 'rejected')">{{item.marketplaceApprovalStatus === 'approved' ? 'Suspend' : 'Reject'}}</button></div>
          } @else { <p class="ops-empty">No submitted application; review actions are unavailable.</p> }
          <h3>Review history</h3>@for (review of history(); track review.id) { <div class="ops-history"><b>{{label(review.decision)}}</b><span>{{date(review.createdAt)}}</span><p>{{review.reason || 'Checklist approved'}}</p></div> } @empty { <p class="cell-sub">No manual reviews recorded.</p> }
        } @else {
          <div class="ops-facts"><span>Order ID</span><b>{{item.id}}</b><span>Buyer ID</span><b>{{item.buyerId || '—'}}</b><span>Store ID</span><b>{{item.storeId}}</b><span>Channel</span><b>{{label(item.salesChannel)}}</b><span>Status</span><b>{{label(item.status)}}</b><span>Delivery</span><b>{{label(item.deliveryStatus)}}</b><span>Payment</span><b>{{item.Payment?.paymentMethod || '—'}} · {{item.Payment?.status || '—'}}</b><span>Delivery fee</span><b>{{money(item.shippingFee,item.currency)}}</b><span>Total</span><b>{{money(item.totalAmount,item.currency)}}</b></div><h3>Items</h3>@for (part of item.OrderItems || []; track part.id) { <div class="ops-history"><b>{{part.name}}</b><span>× {{part.quantity}} · {{money(part.total,item.currency)}}</span></div> }
        }
      </div></aside>
    }
  `,
})
export class OperationsComponent implements OnInit {
  private readonly api = inject(PlatformOperationsService);
  private readonly route = inject(ActivatedRoute);
  readonly section = this.route.snapshot.data['section'] as Section | 'dashboard';
  readonly coreSource = new Set(['stores', 'users', 'websites', 'templates', 'subscriptions',
    'packages', 'plan-payments']).has(this.section);
  readonly definition = definitions[this.section as Section];
  readonly checklist = checklist;
  readonly storeFilter = this.route.snapshot.queryParamMap.get('storeId') || '';
  readonly query = signal(this.route.snapshot.queryParamMap.get('q') || '');
  readonly status = signal('');
  readonly channel = signal('');
  readonly rows = signal<any[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly selected = signal<any | null>(null);
  readonly history = signal<any[]>([]);
  readonly checks = signal<Record<string, boolean>>(Object.fromEntries(checklist.map(([key]) => [key, false])));
  readonly reason = signal('');
  readonly saving = signal(false);
  readonly decisionError = signal('');
  readonly coreOverview = signal<Record<string, number> | null>(null);
  readonly commerceOverview = signal<Record<string, number> | null>(null);
  readonly coreError = signal('');
  readonly commerceError = signal('');
  readonly pendingStores = signal<any[]>([]);
  readonly queueError = signal('');

  ngOnInit() { this.load(); }
  pages() { return Math.max(1, Math.ceil(this.total() / 20)); }
  date(value: string | null) { return value ? new Date(value).toLocaleDateString() : '—'; }
  money(value: string | number, currency = 'USD') { return `${currency} ${Number(value || 0).toFixed(2)}`; }
  label(value: string) { return String(value || '—').replaceAll('_', ' ').replace(/\b\w/g, (x) => x.toUpperCase()); }
  cell(row: any, column: Column): string {
    if (column.key === 'owner') return row.owner?.email || row.owner?.phoneNumber || '—';
    if (column.key === 'website') return row.website?.name || 'Marketplace only';
    const value = column.key.split('.').reduce((part, key) => part?.[key], row);
    if (column.key === 'isVerified') return value ? 'Yes' : 'No';
    if (column.key === 'marketplaceVisibility') return value === null ? 'Store default' : value ? 'On' : 'Off';
    if (column.kind === 'date') return this.date(value);
    if (column.kind === 'money') return this.money(value, row.currency || 'USD');
    if (column.kind === 'status') return this.label(value);
    return value === null || value === undefined || value === '' ? '—' : String(value);
  }
  statusClass(row: any, column: Column): string {
    if (column.kind !== 'status') return '';
    return String(column.key.split('.').reduce((part, key) => part?.[key], row) || '');
  }
  search(event: Event) { event.preventDefault(); this.page.set(1); this.load(); }
  changeStatus(value: string) { this.status.set(value); this.page.set(1); this.load(); }
  changeChannel(value: string) { this.channel.set(value); this.page.set(1); this.load(); }
  goPage(value: number) { this.page.set(value); this.load(); }
  load() {
    if (this.section === 'dashboard') { this.loadOverview(); return; }
    this.loading.set(true); this.error.set('');
    const params = { page: this.page(), limit: 20, q: this.query().trim(),
      storeId: this.storeFilter || undefined, status: this.status() || undefined,
      applicationStatus: this.section === 'stores' && this.status() === 'pending' ? 'pending' : undefined,
      channel: this.channel() || undefined };
    const request = this.coreSource
      ? this.api.core<Page<any>>(this.section, params)
      : this.api.commerce<Page<any>>(this.section, params);
    request.subscribe({ next: (result) => { this.rows.set(result.data); this.total.set(result.total); this.loading.set(false); },
      error: (e) => { this.rows.set([]); this.total.set(0);
        this.error.set(apiErrorMessage(e, 'Unable to load live records.')); this.loading.set(false); } });
  }
  private loadOverview() {
    this.api.core<{data:Record<string,number>}>('overview').subscribe({
      next: (r) => this.coreOverview.set(r.data),
      error: (e) => this.coreError.set(apiErrorMessage(e, 'Core request failed')) });
    this.api.commerce<{data:Record<string,number>}>('overview').subscribe({
      next: (r) => this.commerceOverview.set(r.data),
      error: (e) => this.commerceError.set(apiErrorMessage(e, 'Commerce request failed')) });
    this.api.core<Page<any>>('stores', { applicationStatus: 'pending', limit: 5 }).subscribe({
      next: (r) => this.pendingStores.set(r.data),
      error: (e) => this.queueError.set(apiErrorMessage(e, 'Seller queue unavailable')) });
  }
  openStore(store: any) {
    this.selected.set(store); this.history.set([]); this.reason.set(''); this.decisionError.set('');
    this.checks.set(Object.fromEntries(checklist.map(([key]) => [key, false])));
    if (store.sellerApplication) this.api.reviewHistory(store.id).subscribe({
      next: (r) => this.history.set(r.data.reviews),
      error: (e) => this.decisionError.set(apiErrorMessage(e, 'Could not load review history')) });
  }
  setCheck(key: string, value: boolean) { this.checks.update((old) => ({ ...old, [key]: value })); }
  canApprove(store: any) {
    return Boolean(store.sellerApplication && store.owner?.isVerified && store.primaryCategory &&
      !store.needsCategoryReview && checklist.every(([key]) => this.checks()[key]));
  }
  decide(store: any, decision: string) {
    if (decision === 'approved' && !this.canApprove(store)) return;
    if (decision !== 'approved' && !this.reason().trim()) {
      this.decisionError.set('A reason is required for this decision.'); return;
    }
    this.saving.set(true); this.decisionError.set('');
    this.api.reviewSeller(store.id, decision, this.checks(), this.reason().trim()).subscribe({
      next: () => { this.saving.set(false); this.selected.set(null); this.load(); },
      error: (e) => { this.saving.set(false);
        this.decisionError.set(apiErrorMessage(e, 'Could not save seller decision.')); },
    });
  }
}
