import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CheckoutStepsComponent } from '../components/user/checkout/checkout-steps/checkout-steps.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';

@Component({
  selector: 'app-checkout-delivery',
  standalone: true,
  imports: [CommonModule, CheckoutStepsComponent, IconComponent],
  template: `
  <app-checkout-steps [current]="1"></app-checkout-steps>

  <div class="page">
    <div class="container layout">
      <div class="left animate-in">
        <div class="card-block">
          <h3><ui-icon name="map-pin" [size]="17" color="var(--color-accent)"></ui-icon> Delivery information</h3>
          <div class="form-grid">
            <div class="field">
              <label>Full Name</label>
              <input type="text" placeholder="Enter recipient name">
            </div>
            <div class="field">
              <label>Phone Number</label>
              <input type="text" placeholder="+855 00 000 000">
            </div>
            <div class="field">
              <label>Province / City</label>
              <select><option>Phnom Penh</option><option>Siem Reap</option><option>Battambang</option></select>
            </div>
            <div class="field">
              <label>Specific Address</label>
              <input type="text" placeholder="Street, building, apartment no.">
            </div>
            <div class="field span-2">
              <label>Delivery Notes <span class="optional">(optional)</span></label>
              <input type="text" placeholder="E.g. Leave with the front desk">
            </div>
          </div>
          <label class="save-address">
            <input type="checkbox" checked>
            Save this address for future orders
          </label>
        </div>

        <div class="card-block">
          <h3><ui-icon name="package" [size]="17" color="var(--color-accent)"></ui-icon> Order review</h3>
          <div class="order-item" *ngFor="let item of items">
            <div class="thumb img-placeholder"></div>
            <div class="info">
              <span class="store-tag"><ui-icon name="store" [size]="11"></ui-icon> {{ item.store }}</span>
              <strong>{{ item.name }}</strong>
              <small>Qty: {{ item.qty }} &middot; {{ item.variant }}</small>
            </div>
            <span class="price">\${{ item.lineTotal.toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <aside class="summary animate-in delay-1">
        <h3>Summary</h3>
        <div class="row"><span>Subtotal</span><span>\${{ subtotal.toFixed(2) }}</span></div>
        <div class="row"><span>Delivery Fee</span><span>Calculated next</span></div>
        <div class="row total"><span>Total so far</span><span class="total-amount">\${{ subtotal.toFixed(2) }}</span></div>
        <button class="btn btn-primary btn-block btn-lg" (click)="continue()">Continue to Shipping <ui-icon name="arrow-right" [size]="16" color="#fff"></ui-icon></button>
        <div class="guarantee">
          <strong><ui-icon name="shield" [size]="15"></ui-icon> Artisan Guarantee</strong>
          <small>Your funds are held in escrow until delivery is confirmed. 100% genuine Cambodian craft guaranteed.</small>
        </div>
      </aside>
    </div>
  </div>
  `,
  styles: [`
    .page { background: var(--color-bg-alt); min-height: 100vh; padding-bottom: 60px; }
    .layout { display: grid; grid-template-columns: 1fr 340px; gap: 28px; padding: 28px 32px; align-items: start; }
    .card-block { background: #fff; border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 20px; }
    .card-block h3 { margin-bottom: 20px; font-size: 16px; display: flex; align-items: center; gap: 9px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .span-2 { grid-column: span 2; }
    .optional { font-weight: 400; color: var(--color-muted); }
    .save-address { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-text-secondary); margin-top: 18px; }

    .order-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--color-border); }
    .order-item:last-child { border-bottom: none; }
    .thumb { width: 46px; height: 46px; border-radius: var(--radius-sm); flex-shrink: 0; }
    .info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
    .store-tag { font-size: 11px; color: var(--color-muted); display: flex; align-items: center; gap: 4px; }
    .info small { color: var(--color-muted); font-size: 11px; }
    .price { font-weight: 700; }

    .summary { background: #fff; border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 22px; position: sticky; top: 168px; }
    .summary h3 { margin-bottom: 16px; }
    .row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 11px; color: var(--color-muted); }
    .row.total { border-top: 1px solid var(--color-border); padding-top: 14px; font-weight: 700; color: var(--color-text); }
    .total-amount { font-size: 18px; color: var(--color-accent); }
    .guarantee { margin-top: 18px; background: var(--color-bg-alt); border-radius: var(--radius-sm); padding: 14px; }
    .guarantee strong { display: flex; align-items: center; gap: 6px; font-size: 13px; }
    .guarantee small { display: block; color: var(--color-muted); font-size: 11.5px; margin-top: 6px; line-height: 1.5; }

    @media (max-width: 980px) {
      .layout { grid-template-columns: 1fr; }
      .form-grid { grid-template-columns: 1fr; }
      .span-2 { grid-column: span 1; }
      .summary { position: static; }
    }
  `]
})
export class CheckoutDeliveryComponent {
  items = [
    { name: 'Hand-Etched Terracotta Bowl', store: 'Siem Reap Pottery Collective', variant: 'Large', qty: 1, lineTotal: 45.00 },
    { name: 'Premium Raw Silk Scarf', store: 'Prey Veng Silk Weavers', variant: 'Emerald Green', qty: 2, lineTotal: 120.00 }
  ];

  get subtotal() {
    return this.items.reduce((sum, i) => sum + i.lineTotal, 0);
  }

  constructor(private router: Router) {}

  continue() {
    this.router.navigate(['/checkout/shipping']);
  }
}
