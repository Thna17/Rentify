import { Component, computed, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CommerceApiService } from '../core/api/commerce-api.service';
import { PaymentMethod } from '../core/api/api.models';
import { AuthService } from '../core/auth/auth.service';
import { CartService, cartErrorMessage } from '../core/cart/cart.service';
import { CartLine } from '../core/catalog/catalog.models';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';

interface PaymentOption {
  value: PaymentMethod;
  label: string;
  hint: string;
  icon: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    value: 'COD',
    label: 'Cash on delivery',
    hint: 'Pay the courier when your order arrives.',
    icon: 'banknote',
  },
  {
    value: 'ABA_PAYWAY',
    label: 'ABA PayWay',
    hint: 'Card, KHQR, or ABA account — pay now on ABA’s secure page.',
    icon: 'credit-card',
  },
];

/**
 * Single-page checkout.
 *
 * Replaces the four-step mock flow: delivery, payment and review on one page,
 * because there is nothing to defer — the server prices the order, so there is
 * no intermediate state worth three extra navigations.
 *
 * The totals shown here come from the cart, which is itself server-priced when
 * signed in, so what is displayed is what will be charged.
 */
@Component({
  selector: 'app-checkout',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NavbarComponent,
    FooterComponent,
    IconComponent,
  ],
  template: `
    <app-navbar />

    <section class="container checkout">
      <nav class="crumbs">
        <a routerLink="/cart">Cart</a> <span>›</span> <span>Checkout</span>
      </nav>

      @if (cart.isEmpty()) {
        <div class="empty card">
          <ui-icon name="cart" [size]="32" />
          <h1>Your cart is empty</h1>
          <p>Add something before checking out.</p>
          <button class="btn btn-primary" routerLink="/products">
            Browse products
          </button>
        </div>
      } @else {
        <h1>Checkout</h1>

        <div class="layout">
          <form class="panel" [formGroup]="form" (ngSubmit)="placeOrder()">
            <section class="card block">
              <h2><span class="step">1</span> Delivery information</h2>

              <div class="grid">
                <label>
                  <span>Full name</span>
                  <input formControlName="fullName" autocomplete="name" />
                  @if (invalid('fullName')) {
                    <small>Enter the recipient's name.</small>
                  }
                </label>

                <label>
                  <span>Phone</span>
                  <input formControlName="phone" autocomplete="tel" placeholder="012 345 678" />
                  @if (invalid('phone')) {
                    <small>Enter a contact number for the courier.</small>
                  }
                </label>

                <label>
                  <span>Province</span>
                  <input formControlName="province" placeholder="Phnom Penh" />
                  @if (invalid('province')) {
                    <small>Required.</small>
                  }
                </label>

                <label>
                  <span>City / district</span>
                  <input formControlName="city" placeholder="Chamkarmon" />
                  @if (invalid('city')) {
                    <small>Required.</small>
                  }
                </label>

                <label class="wide">
                  <span>Address</span>
                  <input formControlName="address" placeholder="House 12, Street 240" />
                  @if (invalid('address')) {
                    <small>Enter a street address.</small>
                  }
                </label>

                <label class="wide">
                  <span>Delivery note <em>Optional</em></span>
                  <input formControlName="note" placeholder="Landmark, gate code, best time to call" />
                </label>
              </div>
            </section>

            <section class="card block">
              <h2><span class="step">2</span> Payment method</h2>

              <div class="payments">
                @for (option of paymentOptions; track option.value) {
                  <label class="payment" [class.selected]="method() === option.value">
                    <input
                      type="radio"
                      name="paymentMethod"
                      [value]="option.value"
                      [checked]="method() === option.value"
                      (change)="method.set(option.value)"
                    />
                    <ui-icon [name]="option.icon" [size]="18" />
                    <div>
                      <strong>{{ option.label }}</strong>
                      <small>{{ option.hint }}</small>
                    </div>
                  </label>
                }
              </div>

              @if (method() === 'ABA_PAYWAY') {
                <p class="sandbox-note">
                  <ui-icon name="info" [size]="13" />
                  You'll be sent to ABA's secure page to pay, then brought back here.
                </p>
              }
            </section>
          </form>

          <aside class="summary card">
            <h2>Order summary</h2>

            <div class="shipments">
              @for (group of shipmentGroups(); track group.storeId) {
                <section class="shipment">
                  <header><ui-icon name="store" [size]="13" /> {{ group.sellerName }} <span>Separate delivery</span></header>
                  <div class="lines">
                    @for (line of group.lines; track line.product.id) {
                      <div class="line">
                        <span class="qty">{{ line.quantity }}×</span>
                        <span class="name">{{ line.product.name }}</span>
                        <span class="amount">\${{ line.lineTotal.toFixed(2) }}</span>
                      </div>
                    }
                  </div>
                </section>
              }
            </div>

            <div class="row">
              <span>Subtotal</span><span>\${{ cart.subtotal().toFixed(2) }}</span>
            </div>
            <div class="row">
              <span>Delivery</span>
              @if (cart.shipping() === 0) {
                <span class="free">Free</span>
              } @else {
                <span>\${{ cart.shipping().toFixed(2) }}</span>
              }
            </div>
            <div class="row total">
              <span>Total</span><span>\${{ cart.total().toFixed(2) }}</span>
            </div>

            @if (error(); as message) {
              <p class="error" role="alert">
                <ui-icon name="alert-circle" [size]="14" /> {{ message }}
              </p>
            }

            <button
              class="btn btn-primary btn-block btn-lg"
              (click)="placeOrder()"
              [disabled]="submitting()"
            >
              {{ submitting() ? 'Placing order…' : 'Place order' }}
            </button>

            <p class="fine">
              Totals are calculated by KhmerCraft when the order is placed.
            </p>
          </aside>
        </div>
      }
    </section>

    <app-footer />
  `,
  styles: [
    `
      .checkout {
        padding: 26px 32px 60px;
      }
      .crumbs {
        display: flex;
        gap: 8px;
        font-size: 12.5px;
        color: var(--color-muted);
        margin-bottom: 16px;
      }
      .crumbs a:hover {
        color: var(--color-accent);
      }
      h1 {
        font-size: 26px;
        margin-bottom: 20px;
      }
      .layout {
        display: grid;
        grid-template-columns: 1fr 340px;
        gap: 24px;
        align-items: start;
      }
      .panel {
        display: grid;
        gap: 16px;
      }
      .block {
        padding: 20px 22px 22px;
      }
      .block h2 {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 16px;
        margin-bottom: 16px;
      }
      .step {
        width: 22px;
        height: 22px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: var(--color-accent);
        color: #fff;
        font-size: 12px;
      }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }
      .wide {
        grid-column: 1 / -1;
      }
      label {
        display: grid;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
      }
      label em {
        color: var(--color-muted);
        font-style: normal;
        font-weight: 400;
      }
      input[type='text'],
      input:not([type]) {
        width: 100%;
      }
      .grid input {
        height: 42px;
        padding: 0 12px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        font-size: 14px;
      }
      label small {
        color: var(--color-danger);
        font-size: 11.5px;
        font-weight: 600;
      }
      .payments {
        display: grid;
        gap: 10px;
      }
      .payment {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 13px 15px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-weight: 500;
      }
      .payment.selected {
        border-color: var(--color-accent);
        background: var(--color-accent-soft);
      }
      .payment div {
        display: flex;
        flex-direction: column;
      }
      .payment strong {
        font-size: 14px;
      }
      .payment small {
        color: var(--color-muted);
        font-size: 12px;
        font-weight: 400;
      }
      .sandbox-note {
        display: flex;
        align-items: center;
        gap: 7px;
        margin-top: 12px;
        color: var(--color-muted);
        font-size: 12px;
      }
      .summary {
        padding: 20px 22px;
        display: flex;
        flex-direction: column;
        gap: 11px;
        position: sticky;
        top: 100px;
      }
      .summary h2 {
        font-size: 16px;
      }
      .lines {
        display: grid;
        gap: 7px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--color-border);
      }
      .shipments { display: grid; gap: 11px; padding-bottom: 12px; border-bottom: 1px solid var(--color-border); }
      .shipment { display: grid; gap: 6px; }
      .shipment header { align-items: center; color: var(--color-text); display: flex; font-size: 11.5px; font-weight: 700; gap: 6px; }
      .shipment header span { color: var(--color-muted); font-size: 9.5px; font-weight: 500; margin-left: auto; }
      .shipment .lines { border: 0; padding: 0 0 0 19px; }
      .line {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 8px;
        font-size: 13px;
        color: var(--color-text-secondary);
      }
      .line .qty {
        color: var(--color-muted);
      }
      .line .name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .row {
        display: flex;
        justify-content: space-between;
        font-size: 13.5px;
        color: var(--color-text-secondary);
      }
      .free {
        color: var(--color-success);
        font-weight: 650;
      }
      .row.total {
        color: var(--color-text);
        font-weight: 700;
        font-size: 18px;
        border-top: 1px solid var(--color-border);
        padding-top: 12px;
      }
      .error {
        display: flex;
        align-items: center;
        gap: 7px;
        color: var(--color-danger);
        font-size: 12.5px;
        font-weight: 600;
      }
      .fine {
        color: var(--color-muted);
        font-size: 11.5px;
        text-align: center;
      }
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 60px 32px;
        text-align: center;
        color: var(--color-muted);
      }
      @media (max-width: 900px) {
        .layout {
          grid-template-columns: 1fr;
        }
        .summary {
          position: static;
        }
        .grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class CheckoutComponent {
  protected readonly cart = inject(CartService);
  private readonly api = inject(CommerceApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly paymentOptions = PAYMENT_OPTIONS;
  protected readonly method = signal<PaymentMethod>('COD');
  protected readonly submitting = signal(false);
  protected readonly error = signal('');
  protected readonly shipmentGroups = computed(() => {
    const groups = new Map<string, { storeId: string; sellerName: string; lines: CartLine[] }>();
    for (const line of this.cart.lines()) {
      const key = line.product.storeId;
      const existing = groups.get(key);
      if (existing) {
        existing.lines.push(line);
      } else {
        groups.set(key, { storeId: key, sellerName: line.product.sellerName, lines: [line] });
      }
    }
    return [...groups.values()];
  });

  protected readonly form = new FormGroup({
    // Prefilled from the signed-in profile; the guard guarantees there is one.
    fullName: new FormControl(this.auth.user()?.name ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    phone: new FormControl(this.auth.user()?.phone ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
    province: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    city: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    address: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(4)],
    }),
    note: new FormControl('', { nonNullable: true }),
  });

  protected invalid(field: string): boolean {
    const control = this.form.get(field);
    return Boolean(control && control.touched && control.invalid);
  }

  protected async placeOrder(): Promise<void> {
    this.error.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Please complete the delivery details.');
      return;
    }

    this.submitting.set(true);
    const { note, ...rest } = this.form.getRawValue();

    try {
      const created = await firstValueFrom(
        this.api.createOrder(
          { ...rest, ...(note.trim() ? { note: note.trim() } : {}) },
          this.method(),
        ),
      );

      // The server empties the cart as part of checkout; mirror that locally
      // so the badge does not keep showing items that are already ordered.
      this.cart.markEmptied();

      if (this.method() === 'ABA_PAYWAY') {
        // The order already exists (unpaid); this hands the buyer off to
        // ABA's own page to actually pay. There's nothing to navigate to
        // afterward here — redirectToPayway() leaves this page entirely.
        await this.redirectToPayway(created.orderId);
        return;
      }

      await this.router.navigate(['/order-success'], {
        queryParams: { order: created.orderNumber },
      });
    } catch (error: unknown) {
      // Surfaces the real reason — an item selling out between cart and
      // checkout is the common one.
      this.error.set(cartErrorMessage(error));
      await this.cart.refresh();
    } finally {
      this.submitting.set(false);
    }
  }

  /**
   * PayWay's checkout has to be a real full-page form POST, not a fetch/XHR
   * redirect — it's a hosted page the buyer enters card/KHQR details on, and
   * that only works as a top-level navigation the browser itself performs.
   * This builds a hidden form matching the fields the server signed, and
   * submits it, leaving this Angular app entirely for ABA's page.
   */
  private async redirectToPayway(orderId: string): Promise<void> {
    const session = await firstValueFrom(this.api.createPaywayCheckout(orderId));

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = session.checkoutUrl;
    // PayWay's docs require this explicitly — the browser's default encoding
    // (application/x-www-form-urlencoded) is not what their endpoint expects.
    form.enctype = 'multipart/form-data';
    form.style.display = 'none';

    for (const [name, value] of Object.entries(session.fields)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
  }
}
