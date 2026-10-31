import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe, LowerCasePipe, CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiOrder } from '../../../../core/api/api.models';
import { cartErrorMessage } from '../../../../core/cart/cart.service';
import { CatalogService } from '../../../../core/catalog/catalog.service';
import { RentifyMarketplaceService } from '../../../../core/rentify/rentify-marketplace.service';
import { NavbarComponent } from '../../../../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../../../../components/shared/layout/footer/footer.component';
import { IconComponent } from '../../../../components/shared/ui/icon/icon.component';
import { OrderStatusBadgeComponent } from '../../../../components/shared/orders/order-status-badge/order-status-badge.component';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { TranslateService } from '../../../../core/i18n/translate.service';
import { SeoService } from '../../../../core/seo/seo.service';

type FilterTab = 'all' | 'pending' | 'delivered' | 'completed' | 'issues';

/** Buyer order history and filters. */
@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterLink,
    NavbarComponent,
    FooterComponent,
    IconComponent,
    OrderStatusBadgeComponent,
    TranslatePipe,
  ],
  template: `
    <app-navbar />

    <section class="container orders">
      <header class="page-header">
        <div>
          <h1>{{ 'orders.title' | translate }}</h1>
          <p class="subtitle">{{ 'orders.subtitle' | translate }}</p>
        </div>

        <div class="search-box">
          <ui-icon name="search" [size]="15" />
          <input
            type="search"
            [placeholder]="'orders.searchPlaceholder' | translate"
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
            [attr.aria-label]="'orders.filterOrders' | translate"
          />
        </div>
      </header>

      <!-- Filter Tabs -->
      <nav class="filter-tabs" role="tablist" [attr.aria-label]="'orders.statusFilters' | translate">
        <button
          type="button"
          class="tab"
          [class.active]="activeTab() === 'all'"
          (click)="setTab('all')"
          role="tab"
          [attr.aria-selected]="activeTab() === 'all'"
        >
          {{ 'orders.all' | translate }}
          <span class="count">{{ orders().length }}</span>
        </button>

        <button
          type="button"
          class="tab"
          [class.active]="activeTab() === 'pending'"
          (click)="setTab('pending')"
          role="tab"
          [attr.aria-selected]="activeTab() === 'pending'"
        >
          {{ 'orders.pending' | translate }}
          <span class="count">{{ pendingCount() }}</span>
        </button>

        <button
          type="button"
          class="tab"
          [class.active]="activeTab() === 'delivered'"
          (click)="setTab('delivered')"
          role="tab"
          [attr.aria-selected]="activeTab() === 'delivered'"
        >
          {{ 'orders.delivered' | translate }}
          <span class="count">{{ deliveredCount() }}</span>
        </button>

        <button
          type="button"
          class="tab"
          [class.active]="activeTab() === 'completed'"
          (click)="setTab('completed')"
          role="tab"
          [attr.aria-selected]="activeTab() === 'completed'"
        >
          {{ 'orders.completed' | translate }}
          <span class="count">{{ completedCount() }}</span>
        </button>

        <button
          type="button"
          class="tab"
          [class.active]="activeTab() === 'issues'"
          (click)="setTab('issues')"
          role="tab"
          [attr.aria-selected]="activeTab() === 'issues'"
        >
          {{ 'orders.issues' | translate }}
          @if (issuesCount() > 0) {
            <span class="count badge-warn">{{ issuesCount() }}</span>
          }
        </button>
      </nav>

      @if (loading()) {
        <div class="card state-card">
          <ui-icon name="loader" [size]="24" class="spin" />
          <p class="muted">{{ 'orders.loading' | translate }}</p>
        </div>
      } @else if (error(); as message) {
        <div class="card state-card error" role="alert">
          <ui-icon name="alert-circle" [size]="24" />
          <p>{{ message | translate }}</p>
          <button class="btn btn-outline btn-sm" (click)="load()">
            {{ 'cart.retry' | translate }}
          </button>
        </div>
      } @else if (filteredOrders().length === 0) {
        <div class="empty card" role="region" [attr.aria-label]="'orders.noOrders' | translate">
          <div class="empty-image img-placeholder">
            <ui-icon name="package" [size]="34" />
          </div>
          <h2>{{ 'orders.emptyTitle' | translate }}</h2>
          <p>{{ 'orders.emptyDesc' | translate }}</p>
          <button class="btn btn-primary" routerLink="/products">
            {{ 'orders.startShopping' | translate }}
          </button>
        </div>
      } @else {
        <div class="list" role="feed" [attr.aria-label]="'orders.list' | translate">
          @for (order of filteredOrders(); track order.id) {
            <article class="card order" [attr.aria-label]="'Order ' + order.orderNumber">
              <header>
                <div class="order-primary-meta">
                  <a [routerLink]="['/orders', order.id]" class="number">
                    #{{ order.orderNumber }}
                  </a>
                  <span class="placed">{{
                    order.createdAt | date: 'd MMM y, HH:mm'
                  }}</span>
                </div>
                <div class="badges">
                  <app-order-status [status]="order.orderStatus" />
                  <app-order-status [status]="order.paymentStatus" />
                </div>
              </header>

              <div class="items">
                @for (item of order.items; track item.productId) {
                  <div class="item">
                    <a class="thumb img-placeholder" [routerLink]="['/product', item.productId]">
                      @if (item.productImage) {
                        <img [src]="item.productImage" [alt]="item.productName" />
                      } @else {
                        {{ item.productName }}
                      }
                    </a>
                    <div class="item-main">
                      <a class="item-name" [routerLink]="['/product', item.productId]">{{
                        item.productName
                      }}</a>
                      <span class="seller">{{ item.sellerName }}</span>
                      <span class="qty"
                        >{{ item.quantity }} × \${{ item.price.toFixed(2) }}</span
                      >
                    </div>
                    <span class="line-total">\${{ item.subtotal.toFixed(2) }}</span>
                  </div>
                }
              </div>

              <footer>
                <div class="totals">
                  <span
                    >Delivery
                    {{
                      order.deliveryFee === 0
                        ? 'free'
                        : '$' + order.deliveryFee.toFixed(2)
                    }}</span
                  >
                  <strong>Total \${{ order.totalAmount.toFixed(2) }}</strong>
                </div>

                <div class="actions">
                  <a class="btn btn-outline btn-sm" [routerLink]="['/orders', order.id]">
                    <ui-icon name="eye" [size]="14" />
                    {{ 'orders.viewDetails' | translate }}
                  </a>

                  <!-- Only offered while PENDING: after seller dispatch, server refuses cancellation -->
                  @if (order.orderStatus === 'PENDING') {
                    <button
                      class="btn btn-ghost btn-sm"
                      (click)="cancel(order)"
                      [disabled]="busyId() === order.id"
                      type="button"
                    >
                      {{ busyId() === order.id ? ('orders.cancelling' | translate) : ('orders.cancelOrder' | translate) }}
                    </button>
                  }
                </div>
              </footer>
            </article>
          }
        </div>
      }
    </section>

    <app-footer />
  `,
  styles: [
    `
      .orders {
        padding: 26px 32px 64px;
        max-width: 1040px;
        margin: 0 auto;
      }
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 20px;
        flex-wrap: wrap;
      }
      h1 {
        font-size: 26px;
        margin: 0 0 4px;
      }
      .subtitle {
        color: var(--color-muted);
        font-size: 13.5px;
        margin: 0;
      }
      .search-box {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 12px;
        height: 38px;
        background: #fff;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        width: 280px;
      }
      .search-box input {
        border: 0;
        outline: 0;
        font-size: 13px;
        width: 100%;
        background: transparent;
      }
      .filter-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 20px;
        border-bottom: 1px solid var(--color-border);
        overflow-x: auto;
        padding-bottom: 2px;
      }
      .tab {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border: 0;
        background: transparent;
        color: var(--color-muted);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        white-space: nowrap;
        transition: all 0.15s ease;
      }
      .tab:hover {
        color: var(--color-text);
      }
      .tab.active {
        color: var(--color-accent);
        border-bottom-color: var(--color-accent);
      }
      .count {
        font-size: 11px;
        padding: 1px 6px;
        border-radius: 999px;
        background: #f3f4f6;
        color: #4b5563;
      }
      .count.badge-warn {
        background: #fef3c7;
        color: #b45309;
      }
      .state-card {
        padding: 48px 32px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }
      .state-card.error {
        color: var(--color-danger);
      }
      .muted {
        color: var(--color-muted);
        font-size: 14px;
      }
      .list {
        display: grid;
        gap: 16px;
      }
      .order {
        padding: 18px 20px;
        display: grid;
        gap: 14px;
      }
      .order header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 14px;
        flex-wrap: wrap;
      }
      .order-primary-meta {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .number {
        font-size: 15px;
        font-weight: 700;
        color: var(--color-text);
        text-decoration: none;
      }
      .number:hover {
        color: var(--color-accent);
        text-decoration: underline;
      }
      .placed {
        color: var(--color-muted);
        font-size: 12px;
      }
      .badges {
        display: flex;
        gap: 7px;
        flex-wrap: wrap;
      }
      .items {
        display: grid;
        gap: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--color-border);
      }
      .item {
        display: flex;
        align-items: center;
        gap: 13px;
      }
      .thumb {
        width: 54px;
        height: 54px;
        border-radius: var(--radius-sm);
        flex-shrink: 0;
        font-size: 9px;
        text-align: center;
        overflow: hidden;
      }
      .thumb img {
        height: 100%;
        object-fit: cover;
        width: 100%;
      }
      .item-main {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
      }
      .item-name {
        font-size: 13.5px;
        font-weight: 600;
        color: var(--color-text);
        text-decoration: none;
      }
      .item-name:hover {
        color: var(--color-accent);
      }
      .seller,
      .qty {
        color: var(--color-muted);
        font-size: 12px;
      }
      .line-total {
        font-weight: 700;
        font-size: 13.5px;
      }
      .order footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 14px;
        padding-top: 12px;
        border-top: 1px solid var(--color-border);
        flex-wrap: wrap;
      }
      .totals {
        display: flex;
        align-items: baseline;
        gap: 14px;
        font-size: 13px;
        color: var(--color-muted);
      }
      .totals strong {
        color: var(--color-text);
        font-size: 16px;
      }
      .actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 54px 32px 58px;
        gap: 12px;
      }
      .empty-image {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        color: var(--color-muted);
        display: grid;
        place-items: center;
        background: #f3f4f6;
      }
      .spin {
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @media (max-width: 700px) {
        .search-box {
          width: 100%;
        }
      }
    `,
  ],
})
export class Orders implements OnInit {
  private readonly rentify = inject(RentifyMarketplaceService);
  private readonly catalog = inject(CatalogService);
  protected readonly translate = inject(TranslateService);
  private readonly seo = inject(SeoService);

  readonly orders = signal<ApiOrder[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly busyId = signal('');
  readonly activeTab = signal<FilterTab>('all');
  readonly searchQuery = signal('');

  loadPromise?: Promise<void>;

  ngOnInit(): void {
    this.seo.setPageTitle(`${this.translate.t('orders.title')} | Rentify Marketplace`);
    this.loadPromise = this.load();
  }

  setTab(tab: FilterTab): void {
    this.activeTab.set(tab);
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value || '');
  }

  readonly pendingCount = computed(() =>
    this.orders().filter((o) => o.orderStatus === 'PENDING').length,
  );

  readonly deliveredCount = computed(() =>
    this.orders().filter((o) => o.orderStatus === 'DELIVERED').length,
  );

  readonly completedCount = computed(() =>
    this.orders().filter((o) => o.paymentStatus === 'PAID').length,
  );

  readonly issuesCount = computed(() =>
    this.orders().filter(
      (o) =>
        o.orderStatus === 'CANCELLED' ||
        o.paymentStatus === 'FAILED' ||
        o.paymentStatus === 'REFUNDED' ||
        (o as any).statusHistory?.some(
          (h: any) => h.status === 'return_requested' || h.status === 'complaint',
        ),
    ).length,
  );

  readonly filteredOrders = computed(() => {
    const list = this.orders();
    const tab = this.activeTab();
    const query = this.searchQuery().toLowerCase().trim();

    return list.filter((ord) => {
      // Tab filter
      if (tab === 'pending' && ord.orderStatus !== 'PENDING') return false;
      if (tab === 'delivered' && ord.orderStatus !== 'DELIVERED') return false;
      if (tab === 'completed' && ord.paymentStatus !== 'PAID') return false;
      if (tab === 'issues') {
        const isIssue =
          ord.orderStatus === 'CANCELLED' ||
          ord.paymentStatus === 'FAILED' ||
          ord.paymentStatus === 'REFUNDED';
        if (!isIssue) return false;
      }

      // Query filter
      if (query) {
        const matchesNumber = ord.orderNumber.toLowerCase().includes(query);
        const matchesProduct = ord.items.some((it) =>
          it.productName.toLowerCase().includes(query),
        );
        const matchesSeller = ord.items.some((it) =>
          it.sellerName?.toLowerCase().includes(query),
        );
        if (!matchesNumber && !matchesProduct && !matchesSeller) return false;
      }

      return true;
    });
  });

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await firstValueFrom(this.rentify.orders());
      const marketplaceOrders = response.orders || [];
      this.orders.set(
        marketplaceOrders.map((ord) => {
          const store = this.catalog.store(ord.storeId);
          return {
            id: ord.id,
            orderNumber: ord.orderNumber,
            buyerId: '',
            buyerName: ord.customerInfo?.name || '',
            buyerPhone: ord.customerInfo?.phone || '',
            hasPaymentTranId: false,
            statusHistory: [],
            orderStatus: (ord.deliveryStatus?.toUpperCase() === 'DELIVERED'
              ? 'DELIVERED'
              : ord.status?.toUpperCase() || 'PENDING') as any,
            paymentStatus: (ord.payment?.status?.toUpperCase() || 'PENDING') as any,
            deliveryInfo: {
              fullName: ord.customerInfo?.name || '',
              phone: ord.customerInfo?.phone || '',
              address: ord.shippingInfo?.address || '',
              city: '',
              province: '',
            },
            paymentMethod: 'COD' as any,
            items: (ord.items || []).map((it) => {
              const product = this.catalog.productById(it.productId);
              return {
                productId: it.productId,
                productName: it.name || product?.name || 'Item',
                quantity: it.quantity,
                price: it.quantity
                  ? Math.round((parseFloat(it.total) / it.quantity) * 100) / 100
                  : 0,
                subtotal: parseFloat(it.total) || 0,
                sellerName: product?.sellerName || store?.name || 'Seller',
                sellerId: ord.storeId || null,
                sellerUserId: null,
                storeName: store?.name || null,
                productImage: product?.images?.[0] || null,
              };
            }),
            itemCount: (ord.items || []).reduce((sum, it) => sum + it.quantity, 0),
            subtotal: parseFloat(ord.subtotal) || 0,
            deliveryFee: parseFloat(ord.deliveryFee) || 0,
            discount: 0,
            totalAmount: parseFloat(ord.totalAmount) || 0,
            timeline: [],
            createdAt: ord.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }),
      );
      this.error.set('');
    } catch (error: unknown) {
      this.error.set(cartErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async cancel(order: ApiOrder): Promise<void> {
    this.busyId.set(order.id);
    try {
      const key = `rpt-cnl-${order.id}-${Date.now()}`;
      await firstValueFrom(
        this.rentify.report(order.id, 'complaint', 'Customer requested cancellation', key),
      );
      await this.load();
    } catch (error: unknown) {
      this.error.set(cartErrorMessage(error));
    } finally {
      this.busyId.set('');
    }
  }
}
