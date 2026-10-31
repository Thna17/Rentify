import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { IconComponent } from '../components/shared/ui/icon/icon.component';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { TranslateService } from '../core/i18n/translate.service';
import { SeoService } from '../core/seo/seo.service';
import { MarketplaceOrder, RentifyMarketplaceService } from '../core/rentify/rentify-marketplace.service';

interface PlacedOrderView {
  orderNumber: string;
  storeId: string;
  sellerName: string;
  total: string;
  subtotal?: string;
  deliveryFee?: string;
  itemCount: number;
  recipientName?: string;
  recipientPhone?: string;
  deliveryAddress?: string;
  paymentMethod?: string;
  items: Array<{ name: string; quantity: number; price: number }>;
}

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent, NavbarComponent, FooterComponent, TranslatePipe],
  template: `
    <app-navbar />

    <main class="page">
      <div class="success-card animate-scale" role="region" [attr.aria-label]="'orderSuccess.confirmation' | translate">
        <div class="check-circle" aria-hidden="true">
          <ui-icon name="check" [size]="28" [strokeWidth]="2.6" />
        </div>

        <h1>{{ 'orderSuccess.title' | translate }}</h1>
        <p class="subtitle">{{ 'orderSuccess.sub' | translate }}</p>

        <!-- Primary Order Reference Meta -->
        <div class="order-meta">
          <div>
            <small>{{ 'orderSuccess.orderRef' | translate }}</small>
            <strong class="order-ref">#{{ primaryOrderNumber() }}</strong>
          </div>
          <div>
            <small>{{ 'orderSuccess.date' | translate }}</small>
            <strong>{{ orderDate }}</strong>
          </div>
          <div>
            <small>{{ 'orderSuccess.paymentMethod' | translate }}</small>
            <span class="badge badge-cod">{{ 'orderSuccess.cod' | translate }}</span>
          </div>
          <div>
            <small>{{ 'orderSuccess.paymentStatus' | translate }}</small>
            <span class="badge badge-pending">{{ 'orderSuccess.pendingPayment' | translate }}</span>
          </div>
        </div>

        <!-- Distinct Store Orders / Shipments -->
        <div class="shipments-container">
          @for (ord of orders(); track ord.orderNumber) {
            <div class="shipment-card">
              <header class="shipment-header">
                <div class="seller-meta">
                  <ui-icon name="store" [size]="15" />
                  <strong>{{ ord.sellerName }}</strong>
                  <span class="order-sub-num">#{{ ord.orderNumber }}</span>
                </div>
                <div class="amount-due-box">
                  <small>{{ 'orderSuccess.amountDue' | translate }}</small>
                  <strong class="shipment-total">\${{ ord.total }}</strong>
                </div>
              </header>

              @if (ord.deliveryAddress) {
                <div class="delivery-address-row">
                  <ui-icon name="map-pin" [size]="13" />
                  <span>{{ ord.deliveryAddress }}</span>
                </div>
              }

              @if (ord.items && ord.items.length) {
                <div class="items-list">
                  @for (it of ord.items; track it.name) {
                    <div class="item-row">
                      <span class="item-qty">{{ it.quantity }}×</span>
                      <span class="item-name">{{ it.name }}</span>
                      <span class="item-price">\${{ (it.price * it.quantity).toFixed(2) }}</span>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>

        <!-- Next Steps Instruction Card -->
        <div class="next-steps-card">
          <h3>
            <ui-icon name="info" [size]="16" />
            {{ 'orderSuccess.nextStepsTitle' | translate }}
          </h3>
          <ol class="steps-list">
            <li>{{ 'orderSuccess.step1' | translate }}</li>
            <li>
              {{
                'orderSuccess.step2'
                  | translate:{ phone: primaryPhone() || 'your phone' }
              }}
            </li>
            <li>
              {{
                'orderSuccess.step3'
                  | translate:{ amount: primaryTotal() }
              }}
            </li>
          </ol>
        </div>

        <div class="actions">
          <a class="btn btn-primary" routerLink="/orders">
            {{ 'orderSuccess.viewOrders' | translate }}
          </a>
          <a class="btn btn-outline" routerLink="/products">
            {{ 'orderSuccess.continueShopping' | translate }}
          </a>
        </div>
      </div>

      <aside class="info-strip">
        <div class="info-card">
          <span class="info-icon"><ui-icon name="shield" [size]="18" /></span>
          <strong>{{ 'orderSuccess.codTitle' | translate }}</strong>
          <p>{{ 'orderSuccess.codBody' | translate }}</p>
        </div>
        <div class="info-card">
          <span class="info-icon"><ui-icon name="truck" [size]="18" /></span>
          <strong>{{ 'orderSuccess.fulfillmentTitle' | translate }}</strong>
          <p>{{ 'orderSuccess.fulfillmentBody' | translate }}</p>
        </div>
        <div class="info-card">
          <span class="info-icon"><ui-icon name="check-circle" [size]="18" /></span>
          <strong>{{ 'orderSuccess.supportTitle' | translate }}</strong>
          <p>{{ 'orderSuccess.supportBody' | translate }}</p>
        </div>
      </aside>
    </main>

    <app-footer />
  `,
  styles: [
    `
      .page {
        background: var(--color-bg-alt, #fafaf9);
        min-height: calc(100vh - 140px);
        padding: 44px 20px 64px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .success-card {
        background: #fff;
        border: 1px solid var(--color-border, #e5e7eb);
        border-radius: var(--radius-lg, 12px);
        box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.05));
        max-width: 620px;
        width: 100%;
        padding: 36px;
        text-align: center;
      }
      .check-circle {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: #dcfce7;
        color: #16a34a;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 20px;
      }
      .success-card h1 {
        font-size: 24px;
        margin-bottom: 8px;
        color: var(--color-text-primary, #111827);
      }
      .subtitle {
        color: var(--color-muted, #6b7280);
        font-size: 14px;
        margin-bottom: 24px;
        line-height: 1.5;
      }
      .order-meta {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        text-align: left;
        background: var(--color-bg-subtle, #f9fafb);
        border: 1px solid var(--color-border, #e5e7eb);
        border-radius: var(--radius-sm, 6px);
        padding: 14px 16px;
        margin-bottom: 24px;
      }
      .order-meta small {
        display: block;
        color: var(--color-muted, #6b7280);
        font-size: 10.5px;
        font-weight: 600;
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .order-meta strong {
        font-size: 13.5px;
        color: var(--color-text-primary, #111827);
      }
      .order-ref {
        font-family: monospace;
      }
      .badge {
        font-size: 11px;
        font-weight: 600;
        padding: 2px 7px;
        border-radius: 4px;
        display: inline-block;
      }
      .badge-cod {
        background: #e0f2fe;
        color: #0369a1;
      }
      .badge-pending {
        background: #fef3c7;
        color: #b45309;
      }
      .shipments-container {
        display: grid;
        gap: 12px;
        text-align: left;
        margin-bottom: 24px;
      }
      .shipment-card {
        background: #fff;
        border: 1px solid var(--color-border, #e5e7eb);
        border-radius: var(--radius-sm, 6px);
        padding: 16px;
      }
      .shipment-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 10px;
      }
      .seller-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--color-text-primary, #111827);
      }
      .seller-meta strong {
        font-size: 14.5px;
      }
      .order-sub-num {
        font-size: 12px;
        color: var(--color-muted, #6b7280);
        font-family: monospace;
      }
      .amount-due-box {
        text-align: right;
      }
      .amount-due-box small {
        display: block;
        font-size: 10.5px;
        color: var(--color-muted, #6b7280);
        text-transform: uppercase;
      }
      .shipment-total {
        font-size: 16px;
        color: #166534;
        font-weight: 700;
      }
      .delivery-address-row {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: var(--color-muted, #6b7280);
        padding: 6px 0;
        border-top: 1px dashed var(--color-border, #e5e7eb);
      }
      .items-list {
        border-top: 1px solid var(--color-border, #e5e7eb);
        margin-top: 8px;
        padding-top: 8px;
        display: grid;
        gap: 6px;
      }
      .item-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: var(--color-text-secondary, #4b5563);
      }
      .item-qty {
        font-weight: 600;
        color: var(--color-text-primary, #111827);
      }
      .item-name {
        flex: 1;
      }
      .item-price {
        font-weight: 600;
      }
      .next-steps-card {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: var(--radius-sm, 6px);
        padding: 16px 20px;
        text-align: left;
        margin-bottom: 24px;
      }
      .next-steps-card h3 {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: #166534;
        font-weight: 700;
        margin-bottom: 8px;
      }
      .steps-list {
        margin: 0;
        padding-left: 20px;
        color: #15803d;
        font-size: 13px;
        line-height: 1.6;
      }
      .actions {
        display: flex;
        gap: 12px;
        justify-content: center;
      }
      .actions .btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 10px 18px;
        font-size: 14px;
        font-weight: 600;
      }
      .info-strip {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        max-width: 900px;
        width: 100%;
        margin-top: 36px;
      }
      .info-card {
        background: #fff;
        border: 1px solid var(--color-border, #e5e7eb);
        border-radius: var(--radius-md, 8px);
        padding: 18px;
        text-align: left;
      }
      .info-icon {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--color-bg-subtle, #f3f4f6);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-accent, #2563eb);
        margin-bottom: 10px;
      }
      .info-card strong {
        display: block;
        font-size: 13.5px;
        margin-bottom: 4px;
        color: var(--color-text-primary, #111827);
      }
      .info-card p {
        font-size: 12px;
        color: var(--color-muted, #6b7280);
        margin: 0;
        line-height: 1.5;
      }

      @media (max-width: 700px) {
        .order-meta {
          grid-template-columns: repeat(2, 1fr);
        }
        .info-strip {
          grid-template-columns: 1fr;
        }
        .actions {
          flex-direction: column;
        }
      }
    `,
  ],
})
export class OrderSuccessComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly rentify = inject(RentifyMarketplaceService);
  protected readonly translate = inject(TranslateService);
  private readonly seo = inject(SeoService);

  readonly orderParam = this.route.snapshot.queryParamMap.get('order') || 'Confirmed';
  readonly ordersParam = this.route.snapshot.queryParamMap.get('orders');

  readonly orders = signal<PlacedOrderView[]>([]);
  readonly orderDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  ngOnInit(): void {
    this.seo.setPageTitle(this.translate.t('orderSuccess.title'));
    this.loadOrders();
  }

  private loadOrders(): void {
    // 1. Try reading from sessionStorage
    if (typeof sessionStorage !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('rentify_placed_orders');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.orders.set(parsed);
            return;
          }
        }
      } catch {}
    }

    // 2. Fallback: single order from query param
    const fallbackOrder: PlacedOrderView = {
      orderNumber: this.orderParam,
      storeId: '',
      sellerName: 'Local Merchant',
      total: '0.00',
      itemCount: 1,
      items: [],
    };
    this.orders.set([fallbackOrder]);

    // 3. Attempt to fetch live order details if user reloaded
    if (this.orderParam && this.orderParam !== 'Confirmed') {
      void firstValueFrom(this.rentify.orders()).then((res) => {
        const live = (res?.orders || []).find(
          (o) => o.orderNumber === this.orderParam || o.id === this.orderParam,
        );
        if (live) {
          const updated: PlacedOrderView = {
            orderNumber: live.orderNumber,
            storeId: live.storeId,
            sellerName: 'Local Merchant',
            total: live.totalAmount,
            subtotal: live.subtotal,
            deliveryFee: live.deliveryFee,
            itemCount: live.items.reduce((s, it) => s + it.quantity, 0),
            recipientName: live.customerInfo?.name,
            recipientPhone: live.customerInfo?.phone,
            deliveryAddress: live.shippingInfo?.address,
            paymentMethod: 'COD',
            items: live.items.map((it) => ({
              name: it.name,
              quantity: it.quantity,
              price: it.quantity ? Math.round((parseFloat(it.total) / it.quantity) * 100) / 100 : 0,
            })),
          };
          this.orders.set([updated]);
        }
      }).catch(() => {});
    }
  }

  primaryOrderNumber(): string {
    const list = this.orders();
    if (list.length === 1) return list[0].orderNumber;
    return `${list.length} orders (${list.map((o) => o.orderNumber).join(', ')})`;
  }

  primaryPhone(): string {
    return this.orders()[0]?.recipientPhone || '';
  }

  primaryTotal(): string {
    const list = this.orders();
    if (list.length === 1) return list[0].total;
    const sum = list.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
    return sum.toFixed(2);
  }
}
