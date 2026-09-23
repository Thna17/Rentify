import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CheckoutStepsComponent } from '../components/user/checkout/checkout-steps/checkout-steps.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';

@Component({
  selector: 'app-checkout-review',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CheckoutStepsComponent, IconComponent],
  template: `
  <app-checkout-steps [current]="4"></app-checkout-steps>

  <div class="page">
    <div class="container head">
      <h1>Review your order</h1>
      <p class="subtitle">Please confirm your selection and details before finalizing your purchase.</p>
    </div>

    <div class="container layout">
      <div class="left animate-in">
        <div class="two-col">
          <div class="card-block">
            <h4><ui-icon name="truck" [size]="15" color="var(--color-accent)"></ui-icon> Delivery Details</h4>
            <strong>{{ delivery.name }}</strong>
            <p>{{ delivery.address }}</p>
            <p>{{ delivery.phone }}</p>
            <a routerLink="/checkout" class="edit-link">Edit Address</a>
          </div>
          <div class="card-block">
            <h4><ui-icon name="package" [size]="15" color="var(--color-accent)"></ui-icon> Shipping Method</h4>
            <strong>{{ shipping.name }}</strong>
            <p>{{ shipping.eta }}</p>
            <a routerLink="/checkout/shipping" class="edit-link">Change Method</a>
          </div>
          <div class="card-block">
            <h4><ui-icon name="credit-card" [size]="15" color="var(--color-accent)"></ui-icon> Payment Method</h4>
            <div class="payment-chip">
              <span class="icon"><ui-icon name="smartphone" [size]="16" color="var(--color-accent)"></ui-icon></span>
              <div>
                <strong>{{ payment.name }}</strong>
                <small>{{ payment.detail }}</small>
              </div>
            </div>
            <a routerLink="/checkout/payment" class="edit-link">Change Method</a>
          </div>
        </div>

        <div class="card-block selection-block">
          <h4>Your Selection</h4>
          <div class="order-item" *ngFor="let item of items">
            <div class="thumb img-placeholder"></div>
            <div class="info">
              <span class="store-tag"><ui-icon name="store" [size]="11"></ui-icon> {{ item.store }}</span>
              <strong>{{ item.name }}</strong>
              <small>Quantity: {{ item.qty }}</small>
            </div>
            <span class="price">\${{ item.price.toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <aside class="summary animate-in delay-1">
        <h3>Final Total</h3>
        <div class="row"><span>Subtotal</span><span>\${{ subtotal.toFixed(2) }}</span></div>
        <div class="row"><span>Shipping ({{ shipping.name }})</span><span>{{ shipping.price === 0 ? 'FREE' : '$' + shipping.price.toFixed(2) }}</span></div>
        <div class="row"><span>Estimated Taxes</span><span>\$0.00</span></div>
        <div class="row total"><span>Grand Total</span><span class="total-amount">\${{ grandTotal.toFixed(2) }}</span></div>

        <label class="confirm-check">
          <input type="checkbox" [(ngModel)]="confirmed" name="confirm">
          I confirm my order info is correct and agree to KhmerCraft's Terms &amp; Conditions.
        </label>

        <button class="btn btn-primary btn-block btn-lg" [disabled]="!confirmed" (click)="placeOrder()">
          <ui-icon name="lock" [size]="15" color="#fff"></ui-icon> Place Order
        </button>
        <button class="btn btn-ghost btn-block" (click)="back()">Back to Payment</button>

        <div class="trust-list">
          <div><ui-icon name="lock" [size]="13"></ui-icon> Secure 256-bit SSL encrypted checkout</div>
          <div><ui-icon name="leaf" [size]="13"></ui-icon> 100% Artisan-direct payment guarantee</div>
        </div>
      </aside>
    </div>
  </div>
  `,
  styles: [`
    .page { background: var(--color-bg-alt); min-height: 100vh; padding-bottom: 60px; }
    .head { padding: 28px 32px 6px; }
    .head h1 { font-size: 24px; margin-bottom: 6px; }
    .subtitle { color: var(--color-muted); font-size: 13px; }
    .layout { display: grid; grid-template-columns: 1fr 320px; gap: 24px; align-items: start; padding: 22px 32px 0; }
    .two-col { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-bottom: 20px; }
    .card-block { background: #fff; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 20px; }
    .card-block h4 { margin-bottom: 12px; font-size: 13.5px; display: flex; align-items: center; gap: 7px; }
    .card-block p { font-size: 12px; color: var(--color-muted); margin-bottom: 4px; }
    .edit-link { display: inline-block; margin-top: 10px; color: var(--color-accent); font-size: 12px; font-weight: 600; }
    .payment-chip { display: flex; align-items: center; gap: 10px; }
    .payment-chip .icon { width: 32px; height: 32px; border-radius: 50%; background: var(--color-accent-soft); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .payment-chip small { color: var(--color-muted); font-size: 11px; display: block; }

    .selection-block .order-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--color-border); }
    .selection-block .order-item:last-child { border-bottom: none; }
    .thumb { width: 46px; height: 46px; border-radius: var(--radius-sm); flex-shrink: 0; }
    .info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
    .store-tag { font-size: 11px; color: var(--color-muted); display: flex; align-items: center; gap: 4px; }
    .info small { color: var(--color-muted); font-size: 11px; }
    .price { font-weight: 700; }

    .summary { background: #fff; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 22px; position: sticky; top: 168px; }
    .summary h3 { margin-bottom: 16px; }
    .row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 11px; color: var(--color-muted); }
    .row.total { border-top: 1px solid var(--color-border); padding-top: 14px; font-weight: 700; color: var(--color-text); }
    .total-amount { color: var(--color-success); font-size: 19px; }
    .confirm-check { display: flex; gap: 9px; align-items: flex-start; font-size: 12px; color: var(--color-muted); margin: 18px 0; line-height: 1.5; }
    .confirm-check input { margin-top: 2px; }
    .trust-list { margin-top: 18px; display: flex; flex-direction: column; gap: 9px; font-size: 11.5px; color: var(--color-muted); }
    .trust-list div { display: flex; align-items: center; gap: 6px; }

    @media (max-width: 980px) {
      .layout, .two-col { grid-template-columns: 1fr; }
      .summary { position: static; }
    }
  `]
})
export class CheckoutReviewComponent {
  confirmed = false;

  delivery = {
    name: 'Sovannmy Rathana',
    address: 'No. 123, St. 456, Boeung Keng Kang I, Phnom Penh, Cambodia',
    phone: '+855 12 345 678'
  };

  shipping = { name: 'Standard Delivery', eta: '3-5 business days', price: 3.50 };

  payment = { name: 'ABA Bank Mobile', detail: 'Linked Account: **** 8829' };

  items = [
    { name: 'Indigo Hand-loomed Scarf', store: 'Preah Vihear Weavers Collective', qty: 1, price: 18.50 },
    { name: 'Miniature Celadon Bowl', store: 'Siem Reap Ceramics Studio', qty: 1, price: 7.00 }
  ];

  get subtotal() {
    return this.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  }

  get grandTotal() {
    return this.subtotal + this.shipping.price;
  }

  constructor(private router: Router) {}

  placeOrder() {
    if (this.confirmed) {
      this.router.navigate(['/order-success']);
    }
  }

  back() {
    this.router.navigate(['/checkout/payment']);
  }
}
