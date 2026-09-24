import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IconComponent } from '../components/shared/ui/icon/icon.component';

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
  <div class="page">
    <div class="success-card animate-scale">
      <div class="check-circle"><ui-icon name="check" [size]="26" [strokeWidth]="2.6"></ui-icon></div>
      <h1>Order placed successfully</h1>
      <p>Thank you for supporting Cambodian local sellers.<br>Your contribution helps preserve ancient traditions.</p>

      <div class="order-meta">
        <div><small>ORDER ID</small><strong>{{ order.id }}</strong></div>
        <div><small>DATE</small><strong>{{ order.date }}</strong></div>
        <div><small>PAYMENT</small><strong>{{ order.payment }}</strong></div>
        <div><small>STATUS</small><span class="badge badge-gold">{{ order.status }}</span></div>
      </div>

      @if (placedOrders.length > 1) {
        <div class="multi-orders">
          <div class="multi-head">
            <h3>{{ placedOrders.length }} Separate Store Shipments</h3>
            <p>Each merchant fulfills and delivers their own packages directly. You will pay each courier upon cash delivery (COD).</p>
          </div>
          <div class="shipment-list">
            @for (ord of placedOrders; track ord.orderNumber) {
              <div class="shipment-card">
                <div class="shipment-top">
                  <div class="seller-info">
                    <strong><ui-icon name="store" [size]="14"></ui-icon> {{ ord.sellerName }}</strong>
                    <span class="sub-id">#{{ ord.orderNumber }}</span>
                  </div>
                  <span class="shipment-total">\${{ ord.total }}</span>
                </div>
                @if (ord.items && ord.items.length) {
                  <div class="shipment-items">
                    @for (it of ord.items; track it.name) {
                      <div class="mini-item">
                        <span>{{ it.quantity }}× {{ it.name }}</span>
                        <span>\${{ (it.price * it.quantity).toFixed(2) }}</span>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>
      } @else if (order.items.length > 0) {
        <div class="order-summary">
          <h4>Order Summary</h4>
          <div class="order-item" *ngFor="let item of order.items">
            <div class="thumb img-placeholder"></div>
            <div class="info">
              <strong>{{ item.name }}</strong>
              <small>Qty: {{ item.qty }} &middot; {{ item.variant }}</small>
            </div>
            <span class="price">\${{ item.price.toFixed(2) }}</span>
          </div>
          <div class="total-row"><span>Total</span><span>\${{ total.toFixed(2) }}</span></div>
        </div>
      }

      <div class="actions">
        <a class="btn btn-primary" routerLink="/orders">View My Orders</a>
        <a class="btn btn-outline" routerLink="/products">Continue Shopping</a>
      </div>
    </div>

    <div class="info-strip animate-in delay-1">
      <div class="info-card">
        <span class="info-icon"><ui-icon name="leaf" [size]="18" color="var(--color-accent)"></ui-icon></span>
        <strong>Sustainable Impact</strong>
        <p>Your purchase provides sustainable income for local merchants and artisan families.</p>
      </div>
      <div class="info-card">
        <span class="info-icon"><ui-icon name="truck" [size]="18" color="var(--color-accent)"></ui-icon></span>
        <strong>Tracking Updates</strong>
        <p>You can track delivery updates directly in your orders tab as merchants prepare your delivery.</p>
      </div>
      <div class="info-card">
        <span class="info-icon"><ui-icon name="check-circle" [size]="18" color="var(--color-accent)"></ui-icon></span>
        <strong>Direct COD Settlement</strong>
        <p>Pay safely with cash when your items arrive at your doorstep.</p>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .page { background: var(--color-bg-alt); min-height: 100vh; padding: 56px 20px; display: flex; flex-direction: column; align-items: center; }
    .success-card { background: #fff; border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-md); max-width: 520px; width: 100%; padding: 36px; text-align: center; }
    .check-circle {
      width: 60px; height: 60px; border-radius: 50%; background: var(--color-success-soft); color: var(--color-success);
      display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;
    }
    .success-card h1 { font-size: 23px; margin-bottom: 12px; }
    .success-card > p { color: var(--color-muted); font-size: 13.5px; margin-bottom: 24px; line-height: 1.6; }
    .order-meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: left; margin-bottom: 22px; }
    .order-meta small { display: block; color: var(--color-muted); font-size: 10px; margin-bottom: 3px; letter-spacing: .03em; }
    .order-meta strong { font-size: 13px; }
    .multi-orders { text-align: left; border-top: 1px solid var(--color-border); padding-top: 18px; margin-bottom: 20px; }
    .multi-head h3 { font-size: 14px; font-weight: 700; color: var(--color-text); margin-bottom: 4px; }
    .multi-head p { font-size: 12px; color: var(--color-muted); margin-bottom: 14px; line-height: 1.45; }
    .shipment-list { display: grid; gap: 10px; }
    .shipment-card { background: var(--color-bg-alt, #fafaf9); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 12px 14px; }
    .shipment-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .seller-info { display: flex; flex-direction: column; gap: 2px; }
    .seller-info strong { font-size: 13px; color: var(--color-text); display: flex; align-items: center; gap: 5px; }
    .sub-id { font-size: 11px; color: var(--color-muted); }
    .shipment-total { font-weight: 700; font-size: 13.5px; color: var(--color-accent); }
    .shipment-items { border-top: 1px dashed var(--color-border); padding-top: 6px; margin-top: 6px; font-size: 11.5px; color: var(--color-text-secondary); display: grid; gap: 4px; }
    .mini-item { display: flex; justify-content: space-between; }
    .order-summary { text-align: left; border-top: 1px solid var(--color-border); padding-top: 18px; }
    .order-summary h4 { font-size: 13px; margin-bottom: 12px; color: var(--color-muted); }
    .order-item { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
    .thumb { width: 42px; height: 42px; border-radius: var(--radius-xs); flex-shrink: 0; font-size: 9px; }
    .info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .info small { color: var(--color-muted); font-size: 11px; }
    .price { font-weight: 600; font-size: 13px; }
    .total-row { display: flex; justify-content: space-between; font-weight: 700; border-top: 1px solid var(--color-border); padding-top: 14px; margin-top: 6px; color: var(--color-accent); font-size: 16px; }
    .actions { display: flex; gap: 10px; margin-top: 24px; }
    .actions .btn { flex: 1; }

    .info-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 900px; width: 100%; margin-top: 32px; }
    .info-card { background: #fff; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 20px; text-align: left; }
    .info-icon { width: 36px; height: 36px; border-radius: 50%; background: var(--color-accent-soft); display: flex; align-items: center; justify-content: center; }
    .info-card strong { display: block; margin: 10px 0 5px; font-size: 13.5px; }
    .info-card p { font-size: 12px; color: var(--color-muted); line-height: 1.5; }

    @media (max-width: 700px) {
      .order-meta, .info-strip { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class OrderSuccessComponent {
  private readonly route = inject(ActivatedRoute);

  readonly ordersParam = this.route.snapshot.queryParamMap.get('orders');
  readonly orderNumber = this.route.snapshot.queryParamMap.get('order') || 'Confirmed';

  placedOrders: Array<{
    orderNumber: string;
    storeId: string;
    sellerName: string;
    total: string;
    itemCount: number;
    items: Array<{ name: string; quantity: number; price: number }>;
  }> = [];

  order = {
    id: this.orderNumber,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    payment: 'COD',
    status: 'Pending',
    items: [] as { name: string; variant: string; qty: number; price: number }[],
  };

  constructor() {
    if (typeof sessionStorage !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('rentify_placed_orders');
        if (stored) {
          this.placedOrders = JSON.parse(stored);
        }
      } catch {}
    }

    if (this.placedOrders.length > 1) {
      this.order.id = `${this.placedOrders.length} orders (#${this.placedOrders.map(o => o.orderNumber).join(', #')})`;
    }
  }

  get total() {
    return this.order.items.reduce((sum, i) => sum + i.price, 0);
  }
}
