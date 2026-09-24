import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CheckoutStepsComponent } from '../components/user/checkout/checkout-steps/checkout-steps.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';

interface ShippingOption {
  id: string;
  name: string;
  desc: string;
  eta: string;
  price: number;
  icon: string;
  selected: boolean;
}

@Component({
  selector: 'app-checkout-shipping',
  standalone: true,
  imports: [CommonModule, RouterLink, CheckoutStepsComponent, IconComponent],
  template: `
  <app-checkout-steps [current]="2"></app-checkout-steps>

  <div class="page">
    <div class="container layout">
      <div class="left animate-in">
        <div class="card-block">
          <h3><ui-icon name="truck" [size]="17" color="var(--color-accent)"></ui-icon> Choose a shipping method</h3>
          <div class="shipping-options">
            <label class="shipping-option" *ngFor="let o of options" [class.selected]="o.selected" (click)="select(o)">
              <span class="radio"><span class="radio-dot" *ngIf="o.selected"></span></span>
              <span class="opt-icon"><ui-icon [name]="o.icon" [size]="20"></ui-icon></span>
              <span class="opt-body">
                <strong>{{ o.name }}</strong>
                <small>{{ o.desc }} &middot; {{ o.eta }}</small>
              </span>
              <span class="opt-price">{{ o.price === 0 ? 'FREE' : '$' + o.price.toFixed(2) }}</span>
            </label>
          </div>
        </div>

        <div class="card-block">
          <h3><ui-icon name="map-pin" [size]="17" color="var(--color-accent)"></ui-icon> Delivering to</h3>
          <div class="delivery-preview">
            <div>
              <strong>Sovannmy Rathana</strong>
              <p>No. 123, St. 456, Boeung Keng Kang I, Phnom Penh, Cambodia</p>
              <p>+855 12 345 678</p>
            </div>
            <a routerLink="/checkout" class="edit-link">Edit</a>
          </div>
        </div>
      </div>

      <aside class="summary animate-in delay-1">
        <h3>Summary</h3>
        <div class="row"><span>Subtotal</span><span>\${{ subtotal.toFixed(2) }}</span></div>
        <div class="row"><span>Shipping</span><span>{{ selectedOption?.price === 0 ? 'FREE' : '$' + selectedOption?.price?.toFixed(2) }}</span></div>
        <div class="row total"><span>Total so far</span><span class="total-amount">\${{ total.toFixed(2) }}</span></div>
        <button class="btn btn-primary btn-block btn-lg" (click)="continue()">Continue to Payment <ui-icon name="arrow-right" [size]="16" color="#fff"></ui-icon></button>
        <button class="btn btn-ghost btn-block" (click)="back()">Back to Delivery</button>
      </aside>
    </div>
  </div>
  `,
  styles: [`
    .page { background: var(--color-bg-alt); min-height: 100vh; padding-bottom: 60px; }
    .layout { display: grid; grid-template-columns: 1fr 340px; gap: 28px; padding: 28px 32px; align-items: start; }
    .card-block { background: #fff; border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 20px; }
    .card-block h3 { margin-bottom: 20px; font-size: 16px; display: flex; align-items: center; gap: 9px; }

    .shipping-options { display: flex; flex-direction: column; gap: 12px; }
    .shipping-option {
      display: flex; align-items: center; gap: 16px; border: 1px solid var(--color-border-strong); border-radius: var(--radius-md);
      padding: 16px; cursor: pointer; transition: all var(--dur-base) var(--ease-standard);
    }
    .shipping-option:hover { border-color: var(--color-accent); }
    .shipping-option.selected { border-color: var(--color-accent); background: var(--color-accent-soft); }
    .radio { width: 19px; height: 19px; border-radius: 50%; border: 1.5px solid var(--color-border-strong); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .shipping-option.selected .radio { border-color: var(--color-accent); }
    .radio-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--color-accent); }
    .opt-icon { width: 38px; height: 38px; border-radius: 50%; background: var(--color-bg-alt); display: flex; align-items: center; justify-content: center; color: var(--color-accent); flex-shrink: 0; }
    .opt-body { flex: 1; display: flex; flex-direction: column; gap: 3px; }
    .opt-body small { color: var(--color-muted); font-size: 12px; }
    .opt-price { font-weight: 700; font-size: 14px; }

    .delivery-preview { display: flex; justify-content: space-between; align-items: flex-start; }
    .delivery-preview p { font-size: 12.5px; color: var(--color-muted); margin: 4px 0; }
    .edit-link { color: var(--color-accent); font-size: 13px; font-weight: 600; }

    .summary { background: #fff; border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 22px; position: sticky; top: 168px; display: flex; flex-direction: column; gap: 10px; }
    .summary h3 { margin-bottom: 6px; }
    .row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px; color: var(--color-muted); }
    .row.total { border-top: 1px solid var(--color-border); padding-top: 14px; font-weight: 700; color: var(--color-text); }
    .total-amount { font-size: 18px; color: var(--color-accent); }

    @media (max-width: 980px) {
      .layout { grid-template-columns: 1fr; }
      .summary { position: static; }
    }
  `]
})
export class CheckoutShippingComponent {
  subtotal = 165.00;

  options: ShippingOption[] = [
    { id: 'standard', name: 'Standard Delivery', desc: 'Delivered by local courier partners', eta: '3-5 business days', price: 3.50, icon: 'truck', selected: true },
    { id: 'express', name: 'Express Delivery', desc: 'Priority handling and dispatch', eta: '1-2 business days', price: 8.00, icon: 'sparkles', selected: false },
    { id: 'pickup', name: 'Store Pickup', desc: 'Collect from the artisan\u2019s local hub', eta: 'Ready in 24 hours', price: 0, icon: 'store', selected: false }
  ];

  get selectedOption() {
    return this.options.find(o => o.selected);
  }

  get total() {
    return this.subtotal + (this.selectedOption?.price || 0);
  }

  constructor(private router: Router) {}

  select(o: ShippingOption) {
    this.options.forEach(opt => opt.selected = false);
    o.selected = true;
  }

  continue() {
    this.router.navigate(['/checkout/payment']);
  }

  back() {
    this.router.navigate(['/checkout']);
  }
}
