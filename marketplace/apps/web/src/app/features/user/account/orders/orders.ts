import { Component, inject, signal } from '@angular/core';
import { DatePipe, LowerCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CommerceApiService } from '../../../../core/api/commerce-api.service';
import { ApiOrder } from '../../../../core/api/api.models';
import { cartErrorMessage } from '../../../../core/cart/cart.service';
import { NavbarComponent } from '../../../../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../../../../components/shared/layout/footer/footer.component';
import { IconComponent } from '../../../../components/shared/ui/icon/icon.component';
import { OrderStatusBadgeComponent } from '../../../../components/shared/orders/order-status-badge/order-status-badge.component';

/** Buyer order history, read from the API. */
@Component({
  selector: 'app-orders',
  imports: [
    DatePipe,
    LowerCasePipe,
    RouterLink,
    NavbarComponent,
    FooterComponent,
    IconComponent,
    OrderStatusBadgeComponent,
  ],
  template: `
    <app-navbar />

    <section class="container orders">
      <h1>My orders</h1>

      @if (loading()) {
        <p class="muted">Loading your orders…</p>
      } @else if (error(); as message) {
        <p class="error" role="alert">
          <ui-icon name="alert-circle" [size]="14" /> {{ message }}
        </p>
      } @else if (orders().length === 0) {
        <div class="empty card">
          <div class="empty-image img-placeholder">
            <ui-icon name="package" [size]="34" />
          </div>
          <h2>No orders yet</h2>
          <p>Once you place an order it will appear here with its status.</p>
          <button class="btn btn-primary" routerLink="/products">
            Start shopping
          </button>
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
                  <!-- Only offered while PENDING: after the seller accepts,
                       the server refuses a buyer cancellation. -->
                  @if (order.orderStatus === 'PENDING') {
                    <button
                      class="btn btn-ghost btn-sm"
                      (click)="cancel(order)"
                      [disabled]="busyId() === order.id"
                    >
                      {{ busyId() === order.id ? 'Cancelling…' : 'Cancel order' }}
                    </button>
                  }
                </div>
              </footer>

              @if (order.statusHistory.length > 1) {
                <div class="history">
                  @for (event of order.statusHistory; track $index) {
                    <span class="event">
                      {{ event.status | lowercase }}
                      <small>{{ event.at | date: 'd MMM HH:mm' }}</small>
                    </span>
                  }
                </div>
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
      .orders {
        padding: 30px 32px 64px;
      }
      h1 {
        font-size: 27px;
        margin-bottom: 22px;
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
        width: 60px;
        height: 60px;
        border-radius: var(--radius-sm);
        flex-shrink: 0;
        font-size: 9px;
        text-align: center;
      }
      .thumb { overflow: hidden; }
      .thumb img { height: 100%; object-fit: cover; width: 100%; }
      .item-main {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
      }
      .item-name {
        font-size: 14px;
        font-weight: 600;
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
      .history {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        color: var(--color-muted);
        font-size: 11.5px;
      }
      .event {
        display: inline-flex;
        gap: 5px;
        text-transform: capitalize;
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
    `,
  ],
})
export class Orders {
  private readonly api = inject(CommerceApiService);

  protected readonly orders = signal<ApiOrder[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly busyId = signal('');

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await firstValueFrom(this.api.myOrders(1, 25));
      this.orders.set(response.orders);
      this.error.set('');
    } catch (error: unknown) {
      this.error.set(cartErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected async cancel(order: ApiOrder): Promise<void> {
    this.busyId.set(order.id);
    try {
      const updated = await firstValueFrom(
        this.api.setOrderStatus(order.id, 'CANCELLED'),
      );
      this.orders.update((orders) =>
        orders.map((candidate) =>
          candidate.id === updated.id ? updated : candidate,
        ),
      );
    } catch (error: unknown) {
      this.error.set(cartErrorMessage(error));
    } finally {
      this.busyId.set('');
    }
  }
}
