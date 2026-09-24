import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CheckoutStepsComponent } from '../components/user/checkout/checkout-steps/checkout-steps.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';

interface PaymentMethod {
  id: string;
  name: string;
  desc: string;
  icon: string;
  selected: boolean;
}

@Component({
  selector: 'app-checkout-payment',
  standalone: true,
  imports: [CommonModule, CheckoutStepsComponent, IconComponent],
  template: `
  <app-checkout-steps [current]="3"></app-checkout-steps>

  <div class="page">
    <div class="container layout">
      <div class="left animate-in">
        <div class="card-block">
          <h3><ui-icon name="credit-card" [size]="17" color="var(--color-accent)"></ui-icon> Payment method</h3>
          <div class="payment-options">
            <label class="payment-option" *ngFor="let m of methods" [class.selected]="m.selected" (click)="select(m)">
              <span class="radio"><span class="radio-dot" *ngIf="m.selected"></span></span>
              <span class="opt-icon"><ui-icon [name]="m.icon" [size]="20"></ui-icon></span>
              <span class="opt-body">
                <strong>{{ m.name }}</strong>
                <small>{{ m.desc }}</small>
              </span>
            </label>
          </div>

          <div class="card-form" *ngIf="selected?.id === 'card'">
            <div class="form-grid">
              <div class="field span-2">
                <label>Card Number</label>
                <div class="input-icon-wrap">
                  <ui-icon name="credit-card" [size]="16"></ui-icon>
                  <input type="text" placeholder="1234 5678 9012 3456">
                </div>
              </div>
              <div class="field span-2">
                <label>Cardholder Name</label>
                <input type="text" placeholder="As shown on card">
              </div>
              <div class="field">
                <label>Expiry Date</label>
                <input type="text" placeholder="MM / YY">
              </div>
              <div class="field">
                <label>CVV</label>
                <div class="input-icon-wrap">
                  <ui-icon name="lock" [size]="15"></ui-icon>
                  <input type="text" placeholder="123">
                </div>
              </div>
            </div>
            <label class="save-card"><input type="checkbox"> Save this card for future purchases</label>
          </div>

          <div class="aba-form" *ngIf="selected?.id === 'aba'">
            <p>You'll be redirected to ABA PAY to complete payment securely after placing your order.</p>
          </div>

          <div class="cod-form" *ngIf="selected?.id === 'cod'">
            <p>Pay in cash when your order arrives. Please have the exact amount ready for the courier.</p>
          </div>
        </div>

        <div class="trust-strip">
          <span><ui-icon name="lock" [size]="14"></ui-icon> 256-bit SSL encryption</span>
          <span><ui-icon name="shield" [size]="14"></ui-icon> PCI-DSS compliant</span>
          <span><ui-icon name="check-circle" [size]="14"></ui-icon> Buyer protection</span>
        </div>
      </div>

      <aside class="summary animate-in delay-1">
        <h3>Summary</h3>
        <div class="row"><span>Subtotal</span><span>\${{ subtotal.toFixed(2) }}</span></div>
        <div class="row"><span>Shipping</span><span>\${{ shipping.toFixed(2) }}</span></div>
        <div class="row total"><span>Total so far</span><span class="total-amount">\${{ total.toFixed(2) }}</span></div>
        <button class="btn btn-primary btn-block btn-lg" (click)="continue()">Continue to Review <ui-icon name="arrow-right" [size]="16" color="#fff"></ui-icon></button>
        <button class="btn btn-ghost btn-block" (click)="back()">Back to Shipping</button>
      </aside>
    </div>
  </div>
  `,
  styles: [`
    .page { background: var(--color-bg-alt); min-height: 100vh; padding-bottom: 60px; }
    .layout { display: grid; grid-template-columns: 1fr 340px; gap: 28px; padding: 28px 32px; align-items: start; }
    .card-block { background: #fff; border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 20px; }
    .card-block h3 { margin-bottom: 20px; font-size: 16px; display: flex; align-items: center; gap: 9px; }

    .payment-options { display: flex; flex-direction: column; gap: 12px; margin-bottom: 8px; }
    .payment-option {
      display: flex; align-items: center; gap: 16px; border: 1px solid var(--color-border-strong); border-radius: var(--radius-md);
      padding: 16px; cursor: pointer; transition: all var(--dur-base) var(--ease-standard);
    }
    .payment-option:hover { border-color: var(--color-accent); }
    .payment-option.selected { border-color: var(--color-accent); background: var(--color-accent-soft); }
    .radio { width: 19px; height: 19px; border-radius: 50%; border: 1.5px solid var(--color-border-strong); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .payment-option.selected .radio { border-color: var(--color-accent); }
    .radio-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--color-accent); }
    .opt-icon { width: 38px; height: 38px; border-radius: 50%; background: var(--color-bg-alt); display: flex; align-items: center; justify-content: center; color: var(--color-accent); flex-shrink: 0; }
    .opt-body { flex: 1; display: flex; flex-direction: column; gap: 3px; }
    .opt-body small { color: var(--color-muted); font-size: 12px; }

    .card-form { margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--color-border); animation: fadeIn var(--dur-slow) var(--ease-out) both; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .span-2 { grid-column: span 2; }
    .save-card { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-text-secondary); margin-top: 16px; }
    .aba-form, .cod-form { margin-top: 18px; padding: 16px; background: var(--color-bg-alt); border-radius: var(--radius-sm); animation: fadeIn var(--dur-slow) var(--ease-out) both; }
    .aba-form p, .cod-form p { font-size: 13px; color: var(--color-muted); line-height: 1.5; }

    .trust-strip { display: flex; gap: 22px; font-size: 12px; color: var(--color-muted); font-weight: 600; flex-wrap: wrap; padding: 0 4px; }
    .trust-strip span { display: flex; align-items: center; gap: 6px; }

    .summary { background: #fff; border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 22px; position: sticky; top: 168px; display: flex; flex-direction: column; gap: 10px; }
    .summary h3 { margin-bottom: 6px; }
    .row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px; color: var(--color-muted); }
    .row.total { border-top: 1px solid var(--color-border); padding-top: 14px; font-weight: 700; color: var(--color-text); }
    .total-amount { font-size: 18px; color: var(--color-accent); }

    @media (max-width: 980px) {
      .layout { grid-template-columns: 1fr; }
      .form-grid { grid-template-columns: 1fr; }
      .span-2 { grid-column: span 1; }
      .summary { position: static; }
    }
  `]
})
export class CheckoutPaymentComponent {
  subtotal = 165.00;
  shipping = 3.50;

  methods: PaymentMethod[] = [
    { id: 'card', name: 'Credit / Debit Card', desc: 'Visa, Mastercard, Amex', icon: 'credit-card', selected: true },
    { id: 'aba', name: 'ABA Pay', desc: 'Secure mobile banking link', icon: 'smartphone', selected: false },
    { id: 'cod', name: 'Cash on Delivery', desc: 'Pay when you receive your items', icon: 'banknote', selected: false }
  ];

  get selected() {
    return this.methods.find(m => m.selected);
  }

  get total() {
    return this.subtotal + this.shipping;
  }

  constructor(private router: Router) {}

  select(m: PaymentMethod) {
    this.methods.forEach(x => x.selected = false);
    m.selected = true;
  }

  continue() {
    this.router.navigate(['/checkout/review']);
  }

  back() {
    this.router.navigate(['/checkout/shipping']);
  }
}
