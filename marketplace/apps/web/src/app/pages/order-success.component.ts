import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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

      <div class="actions">
        <button class="btn btn-primary">View My Orders</button>
        <button class="btn btn-outline" routerLink="/products">Continue Shopping</button>
      </div>
    </div>

    <div class="info-strip animate-in delay-1">
      <div class="info-card">
        <span class="info-icon"><ui-icon name="leaf" [size]="18" color="var(--color-accent)"></ui-icon></span>
        <strong>Sustainable Impact</strong>
        <p>Your purchase provides sustainable income for 3 artisan families in the Siem Reap province.</p>
      </div>
      <div class="info-card">
        <span class="info-icon"><ui-icon name="truck" [size]="18" color="var(--color-accent)"></ui-icon></span>
        <strong>Tracking Updates</strong>
        <p>We'll send you an SMS with tracking details as soon as the artisan ships your package.</p>
      </div>
      <div class="info-card">
        <span class="info-icon"><ui-icon name="check-circle" [size]="18" color="var(--color-accent)"></ui-icon></span>
        <strong>Artisan Authenticity</strong>
        <p>Every item in this order comes with a signed certificate of authenticity from the creator.</p>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .page { background: var(--color-bg-alt); min-height: 100vh; padding: 56px 20px; display: flex; flex-direction: column; align-items: center; }
    .success-card { background: #fff; border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-md); max-width: 460px; width: 100%; padding: 40px; text-align: center; }
    .check-circle {
      width: 60px; height: 60px; border-radius: 50%; background: var(--color-success-soft); color: var(--color-success);
      display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;
    }
    .success-card h1 { font-size: 23px; margin-bottom: 12px; }
    .success-card > p { color: var(--color-muted); font-size: 13.5px; margin-bottom: 26px; line-height: 1.6; }
    .order-meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: left; margin-bottom: 26px; }
    .order-meta small { display: block; color: var(--color-muted); font-size: 10px; margin-bottom: 3px; letter-spacing: .03em; }
    .order-meta strong { font-size: 13px; }
    .order-summary { text-align: left; border-top: 1px solid var(--color-border); padding-top: 18px; }
    .order-summary h4 { font-size: 13px; margin-bottom: 12px; color: var(--color-muted); }
    .order-item { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
    .thumb { width: 42px; height: 42px; border-radius: var(--radius-xs); flex-shrink: 0; font-size: 9px; }
    .info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .info small { color: var(--color-muted); font-size: 11px; }
    .price { font-weight: 600; font-size: 13px; }
    .total-row { display: flex; justify-content: space-between; font-weight: 700; border-top: 1px solid var(--color-border); padding-top: 14px; margin-top: 6px; color: var(--color-accent); font-size: 16px; }
    .actions { display: flex; gap: 10px; margin-top: 26px; }
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
  order = {
    id: 'KC-000001',
    date: 'Jul 28, 2026',
    payment: 'COD',
    status: 'Pending',
    items: [
      { name: 'Hand-woven Silk Scarf', variant: 'Indigo Gold', qty: 1, price: 45.00 },
      { name: 'Ceramic Tea Bowl', variant: 'Celadon Glaze', qty: 2, price: 36.00 }
    ]
  };

  get total() {
    return this.order.items.reduce((sum, i) => sum + i.price, 0);
  }
}
