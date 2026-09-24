import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { CommerceApiService } from '../../../core/api/commerce-api.service';
import { ApiSellerOrder, OrderStatus } from '../../../core/api/api.models';
import { cartErrorMessage } from '../../../core/cart/cart.service';
import { NavbarComponent } from '../../../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../../../components/shared/layout/footer/footer.component';
import { IconComponent } from '../../../components/shared/ui/icon/icon.component';
import { OrderStatusBadgeComponent } from '../../../components/shared/orders/order-status-badge/order-status-badge.component';

const FILTERS: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Needs action' },
  { value: 'CONFIRMED', label: 'Accepted' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

/** How each available action should be presented. */
const ACTION_LABELS: Record<string, { label: string; style: string }> = {
  CONFIRMED: { label: 'Accept order', style: 'btn-primary' },
  SHIPPED: { label: 'Mark shipped', style: 'btn-outline' },
  DELIVERED: { label: 'Mark delivered', style: 'btn-outline' },
  CANCELLED: { label: 'Reject', style: 'btn-ghost danger' },
};

/**
 * The seller order desk.
 *
 * Buttons come from `availableActions`, which the server computes from the
 * order's current status — so the UI cannot offer a move the API would refuse,
 * and new lifecycle rules show up here without a frontend change.
 */
@Component({
  selector: 'app-seller-orders',
  imports: [
    DatePipe,
    NavbarComponent,
    FooterComponent,
    IconComponent,
    OrderStatusBadgeComponent,
  ],
  template: `
    <app-navbar />

    <section class="container desk">
      <div class="head">
        <div>
          <h1>Incoming orders</h1>
          <p class="sub">
            Orders containing your products. Accept one to confirm you can
            fulfil it.
          </p>
        </div>
        @if (pendingCount(); as pending) {
          <span class="badge badge-low-stock"
            >{{ pending }} awaiting your response</span
          >
        }
      </div>

      <div class="filters">
        @for (filter of filters; track filter.value) {
          <button
            class="chip"
            [class.active]="active() === filter.value"
            (click)="setFilter(filter.value)"
          >
            {{ filter.label }}
          </button>
        }
      </div>

      @if (loading()) {
        <p class="muted">Loading orders…</p>
      } @else if (error(); as message) {
        <p class="error" role="alert">
          <ui-icon name="alert-circle" [size]="14" /> {{ message }}
        </p>
      } @else if (orders().length === 0) {
        <div class="empty card">
          <div class="empty-image img-placeholder">
            <ui-icon name="package" [size]="34" />
          </div>
          <h2>Nothing here yet</h2>
          <p>
            When a buyer orders one of your products it will appear here for you
            to accept.
          </p>
        </div>
      } @else {
        <div class="list">
          @for (order of orders(); track order.id) {
            <article class="card order">
              <header>
                <div>
                  <strong class="number">{{ order.orderNumber }}</strong>
                  <span class="placed">{{
                    order.createdAt | date: 'd MMM y, HH:mm'
                  }}</span>
                </div>
                <div class="badges">
                  <app-order-status [status]="order.orderStatus" />
                  <app-order-status [status]="order.paymentStatus" />
                </div>
              </header>

              <div class="body">
                <div class="col">
                  <h3>Your items</h3>
                  @for (item of order.myItems; track item.productId) {
                    <div class="line">
                      <span>{{ item.quantity }}× {{ item.productName }}</span>
                      <span>\${{ item.subtotal.toFixed(2) }}</span>
                    </div>
                  }
                  <div class="line strong">
                    <span>Your total</span>
                    <span>\${{ order.myTotal.toFixed(2) }}</span>
                  </div>
                  @if (order.items.length > order.myItems.length) {
                    <p class="note">
                      <ui-icon name="info" [size]="12" />
                      This order also contains items from other sellers.
                    </p>
                  }
                </div>

                <div class="col">
                  <h3>Deliver to</h3>
                  <p class="addr">
                    <strong>{{ order.deliveryInfo.fullName }}</strong><br />
                    {{ order.deliveryInfo.phone }}<br />
                    {{ order.deliveryInfo.address }}<br />
                    {{ order.deliveryInfo.city }},
                    {{ order.deliveryInfo.province }}
                  </p>
                  @if (order.deliveryInfo.note) {
                    <p class="note">“{{ order.deliveryInfo.note }}”</p>
                  }
                  <p class="pay">
                    Payment: {{ paymentLabel(order.paymentMethod) }}
                  </p>
                </div>
              </div>

              @if (order.availableActions.length) {
                <footer>
                  @for (action of order.availableActions; track action) {
                    <button
                      class="btn btn-sm"
                      [class]="'btn btn-sm ' + labelFor(action).style"
                      (click)="act(order, action)"
                      [disabled]="busyId() === order.id"
                    >
                      {{
                        busyId() === order.id
                          ? 'Working…'
                          : labelFor(action).label
                      }}
                    </button>
                  }
                </footer>
              }
            </article>
          }
        </div>
      }
    </section>

    <app-footer />
  `,
  styles: [
    `
      .desk {
        padding: 30px 32px 64px;
      }
      .head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        flex-wrap: wrap;
      }
      h1 {
        font-size: 27px;
      }
      .sub {
        margin-top: 5px;
        color: var(--color-muted);
        font-size: 13.5px;
      }
      .filters {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 20px 0 18px;
      }
      .chip {
        padding: 7px 14px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-full);
        background: #fff;
        font-size: 12.5px;
        font-weight: 550;
        color: var(--color-text-secondary);
      }
      .chip.active {
        background: var(--color-accent);
        border-color: var(--color-accent);
        color: #fff;
      }
      .muted {
        color: var(--color-muted);
        font-size: 14px;
      }
      .error {
        display: flex;
        align-items: center;
        gap: 7px;
        color: var(--color-danger);
        font-size: 13px;
        font-weight: 600;
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
      .number {
        display: block;
        font-size: 15px;
      }
      .placed {
        color: var(--color-muted);
        font-size: 12.5px;
      }
      .badges {
        display: flex;
        gap: 7px;
      }
      .body {
        display: grid;
        grid-template-columns: 1.2fr 1fr;
        gap: 24px;
        padding-top: 12px;
        border-top: 1px solid var(--color-border);
      }
      .col h3 {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--color-muted);
        margin-bottom: 9px;
      }
      .line {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 13.5px;
        padding: 3px 0;
      }
      .line.strong {
        font-weight: 700;
        border-top: 1px solid var(--color-border);
        margin-top: 6px;
        padding-top: 8px;
      }
      .addr {
        font-size: 13.5px;
        line-height: 1.6;
      }
      .note {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 8px;
        color: var(--color-muted);
        font-size: 12px;
      }
      .pay {
        margin-top: 8px;
        font-size: 12.5px;
        color: var(--color-text-secondary);
      }
      .order footer {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        padding-top: 12px;
        border-top: 1px solid var(--color-border);
      }
      .danger {
        color: var(--color-danger);
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
        width: 130px;
        height: 130px;
        border-radius: 50%;
        color: var(--color-muted-2);
      }
      @media (max-width: 800px) {
        .body {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class SellerOrders {
  private readonly api = inject(CommerceApiService);

  protected readonly filters = FILTERS;
  protected readonly orders = signal<ApiSellerOrder[]>([]);
  protected readonly active = signal<OrderStatus | ''>('');
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly busyId = signal('');

  protected readonly pendingCount = computed(
    () => this.orders().filter((order) => order.orderStatus === 'PENDING').length,
  );

  constructor() {
    void this.load();
  }

  protected setFilter(status: OrderStatus | ''): void {
    this.active.set(status);
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const status = this.active();
      const response = await firstValueFrom(
        this.api.sellerOrders(1, 50, status || undefined),
      );
      this.orders.set(response.orders);
      this.error.set('');
    } catch (error: unknown) {
      this.error.set(cartErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected labelFor(action: OrderStatus): { label: string; style: string } {
    return ACTION_LABELS[action] ?? { label: action, style: 'btn-outline' };
  }

  protected paymentLabel(method: string): string {
    switch (method) {
      case 'COD':
        return 'Cash on delivery';
      case 'ABA_DEMO':
        return 'ABA Pay (demo)';
      case 'STRIPE_SANDBOX':
        return 'Card (sandbox)';
      default:
        return method;
    }
  }

  protected async act(
    order: ApiSellerOrder,
    action: OrderStatus,
  ): Promise<void> {
    this.busyId.set(order.id);
    try {
      await firstValueFrom(this.api.setOrderStatus(order.id, action));
      // Reload rather than patching in place: the status change alters which
      // actions are legal next, and the server is the authority on that.
      await this.load();
    } catch (error: unknown) {
      this.error.set(cartErrorMessage(error));
    } finally {
      this.busyId.set('');
    }
  }
}
