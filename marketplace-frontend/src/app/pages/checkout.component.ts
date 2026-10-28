import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { CommerceApiService } from '../core/api/commerce-api.service';
import { PaymentMethod } from '../core/api/api.models';
import { AuthService } from '../core/auth/auth.service';
import { CartService, cartErrorMessage } from '../core/cart/cart.service';
import { RentifyMarketplaceService } from '../core/rentify/rentify-marketplace.service';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { TranslateService } from '../core/i18n/translate.service';
import { SeoService } from '../core/seo/seo.service';

interface PaymentOption {
  value: PaymentMethod;
  labelKey: string;
  hintKey: string;
  icon: string;
  badgeKey: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    value: 'COD',
    labelKey: 'checkout.codLabel',
    hintKey: 'checkout.codHint',
    icon: 'banknote',
    badgeKey: 'checkout.available',
  },
];

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NavbarComponent,
    FooterComponent,
    IconComponent,
    TranslatePipe,
  ],
  template: `
    <app-navbar />

    <section class="container checkout">
      <nav class="crumbs" [attr.aria-label]="'checkout.breadcrumb' | translate">
        <a routerLink="/cart">{{ 'cart.title' | translate }}</a> <span>›</span> <span>{{ 'checkout.title' | translate }}</span>
      </nav>

      @if (cart.isEmpty()) {
        <div class="empty card" role="region" [attr.aria-label]="'checkout.emptyTitle' | translate">
          <ui-icon name="cart" [size]="32" />
          <h1>{{ 'checkout.emptyTitle' | translate }}</h1>
          <p>{{ 'checkout.emptyDescription' | translate }}</p>
          <button class="btn btn-primary" routerLink="/products">
            {{ 'state.browseProducts' | translate }}
          </button>
        </div>
      } @else {
        <h1>{{ 'checkout.title' | translate }}</h1>

        <div class="layout">
          <form class="panel" [formGroup]="form" (ngSubmit)="placeOrder()" novalidate>
            <!-- Step 1: Delivery Information -->
            <section class="card block" aria-labelledby="step-1-heading">
              <h2 id="step-1-heading"><span class="step">1</span> {{ 'checkout.deliveryInfo' | translate }}</h2>

              <div class="grid">
                <label>
                  <span>{{ 'checkout.fullName' | translate }} *</span>
                  <input
                    formControlName="fullName"
                    autocomplete="name"
                    [attr.aria-invalid]="invalid('fullName')"
                    aria-describedby="fullName-error"
                  />
                  @if (invalid('fullName')) {
                    <small id="fullName-error" class="error-msg" role="alert">
                      {{ 'checkout.fullNameError' | translate }}
                    </small>
                  }
                </label>

                <label>
                  <span>{{ 'checkout.phone' | translate }} *</span>
                  <input
                    formControlName="phone"
                    autocomplete="tel"
                    placeholder="012 345 678"
                    [attr.aria-invalid]="invalid('phone')"
                    aria-describedby="phone-error"
                  />
                  @if (invalid('phone')) {
                    <small id="phone-error" class="error-msg" role="alert">
                      {{ 'checkout.phoneError' | translate }}
                    </small>
                  }
                </label>

                <label>
                  <span>{{ 'checkout.province' | translate }} *</span>
                  <input
                    formControlName="province"
                    [placeholder]="'checkout.provincePlaceholder' | translate"
                    [attr.aria-invalid]="invalid('province')"
                  />
                  @if (invalid('province')) {
                    <small class="error-msg" role="alert">{{ 'checkout.required' | translate }}</small>
                  }
                </label>

                <label>
                  <span>{{ 'checkout.city' | translate }} *</span>
                  <input
                    formControlName="city"
                    [placeholder]="'checkout.cityPlaceholder' | translate"
                    [attr.aria-invalid]="invalid('city')"
                  />
                  @if (invalid('city')) {
                    <small class="error-msg" role="alert">{{ 'checkout.required' | translate }}</small>
                  }
                </label>

                <label class="wide">
                  <span>{{ 'checkout.address' | translate }} *</span>
                  <input
                    formControlName="address"
                    [placeholder]="'checkout.addressPlaceholder' | translate"
                    [attr.aria-invalid]="invalid('address')"
                    aria-describedby="address-error"
                  />
                  @if (invalid('address')) {
                    <small id="address-error" class="error-msg" role="alert">
                      {{ 'checkout.addressError' | translate }}
                    </small>
                  }
                </label>

                <label class="wide">
                  <span>{{ 'checkout.note' | translate }} <em>({{ 'checkout.optional' | translate }})</em></span>
                  <input formControlName="note" [placeholder]="'checkout.notePlaceholder' | translate" />
                </label>
              </div>
            </section>

            <!-- Step 2: Payment Method -->
            <section class="card block" aria-labelledby="step-2-heading">
              <h2 id="step-2-heading"><span class="step">2</span> {{ 'checkout.paymentMethod' | translate }}</h2>

              <div class="payments" role="radiogroup" [attr.aria-label]="'checkout.paymentAria' | translate">
                @for (option of paymentOptions; track option.value) {
                  <label
                    class="payment"
                    [class.selected]="method() === option.value"
                    (click)="selectMethod(option)"
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      [value]="option.value"
                      [checked]="method() === option.value"
                      (change)="selectMethod(option)"
                    />
                    <ui-icon [name]="option.icon" [size]="20" />
                    <div class="payment-info">
                      <div class="payment-title-row">
                        <strong>{{ option.labelKey | translate }}</strong>
                        <span class="pay-badge pay-badge-active">{{ option.badgeKey | translate }}</span>
                      </div>
                      <small>{{ option.hintKey | translate }}</small>
                    </div>
                  </label>
                }
              </div>

            </section>

            <!-- Step 3: Policy Acknowledgement -->
            <section class="card block" aria-labelledby="step-3-heading">
              <h2 id="step-3-heading"><span class="step">3</span> {{ 'checkout.policyTitle' | translate }}</h2>

              <div class="policy-card">
                <div class="policy-header">
                  <ui-icon name="shield" [size]="18" />
                  <strong>{{ 'checkout.policyHeader' | translate }}</strong>
                </div>
                <p class="policy-desc">
                  {{ 'checkout.policyDescription' | translate }}
                </p>
                <label class="checkbox-container" [class.has-error]="invalid('policyAcknowledged')">
                  <input
                    type="checkbox"
                    formControlName="policyAcknowledged"
                    id="policyAcknowledged"
                    aria-describedby="policy-error"
                  />
                  <span class="checkbox-text">
                    {{ 'checkout.policyAck' | translate }}
                  </span>
                </label>
                @if (invalid('policyAcknowledged')) {
                  <small id="policy-error" class="error-msg" role="alert">
                    {{ 'checkout.policyAckError' | translate }}
                  </small>
                }
              </div>
            </section>

            <!-- Step 4: Final Order Review -->
            <section class="card block review-block" aria-labelledby="step-4-heading">
              <h2 id="step-4-heading"><span class="step">4</span> {{ 'checkout.finalReview' | translate }}</h2>

              <div class="review-details">
                <div class="review-row">
                  <span class="review-label">{{ 'checkout.fullName' | translate }}:</span>
                  <strong class="review-value">{{ form.getRawValue().fullName || '—' }}</strong>
                </div>
                <div class="review-row">
                  <span class="review-label">{{ 'checkout.phone' | translate }}:</span>
                  <strong class="review-value">{{ form.getRawValue().phone || '—' }}</strong>
                </div>
                <div class="review-row">
                  <span class="review-label">{{ 'checkout.address' | translate }}:</span>
                  <span class="review-value">{{ fullDeliveryAddress() || '—' }}</span>
                </div>
                <div class="review-row">
                  <span class="review-label">{{ 'checkout.paymentMethod' | translate }}:</span>
                  <span class="review-value badge-cod-pill">
                    <ui-icon name="banknote" [size]="13" />
                    {{ 'checkout.codLabel' | translate }}
                  </span>
                </div>
                <div class="cod-caution-banner">
                  <ui-icon name="info" [size]="14" />
                  <span>{{ 'checkout.codHint' | translate }}</span>
                </div>
              </div>
            </section>
          </form>

          <!-- Order Summary Sidebar -->
          <aside class="summary card" role="region" [attr.aria-label]="'cart.orderSummary' | translate">
            <h2>{{ 'cart.orderSummary' | translate }}</h2>

            @if (activeStoreId()) {
              <div class="single-store-banner">
                <ui-icon name="store" [size]="14" />
                <div class="single-store-banner-text">
                  <strong>{{ 'checkout.sellerCheckout' | translate }}</strong>
                  <p>{{ 'checkout.otherCartsSaved' | translate }}</p>
                </div>
                <a routerLink="/cart" class="back-cart-link">{{ 'checkout.allStores' | translate }}</a>
              </div>
            }

            <div class="shipments">
              @for (group of shipmentGroups(); track group.storeId) {
                <section class="shipment">
                  <header>
                    <ui-icon name="store" [size]="13" />
                    {{ group.sellerName }}
                    <span>{{ 'checkout.separateDelivery' | translate }}</span>
                  </header>
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
              <span>{{ 'cart.subtotal' | translate }}</span><span>\${{ checkoutSubtotal().toFixed(2) }}</span>
            </div>
            <div class="row">
              <span>{{ 'checkout.delivery' | translate }}</span>
              @if (checkoutShipping() === 0) {
                <span class="free">{{ 'cart.freeDelivery' | translate }}</span>
              } @else {
                <span>\${{ checkoutShipping().toFixed(2) }}</span>
              }
            </div>
            <div class="row total">
              <span>{{ 'checkout.amountDue' | translate }}</span><span>\${{ checkoutTotal().toFixed(2) }}</span>
            </div>

            @if (uncertainSubmission()) {
              <div class="uncertain-banner" role="alert">
                <div class="uncertain-header">
                  <ui-icon name="alert-circle" [size]="16" />
                  <strong>{{ 'checkout.uncertainTitle' | translate }}</strong>
                </div>
                <p>{{ 'checkout.uncertainDesc' | translate }}</p>
                <button
                  type="button"
                  class="btn btn-outline btn-sm btn-block"
                  (click)="verifyOrderStatus()"
                  [disabled]="checkingRecovery()"
                >
                  <ui-icon name="refresh-cw" [size]="14" [class.spin]="checkingRecovery()" />
                  {{ checkingRecovery() ? ('checkout.checkingStatus' | translate) : ('checkout.verifyStatus' | translate) }}
                </button>
              </div>
            }

            @if (recoveryMessage(); as recMsg) {
              <div class="recovery-msg" role="status">
                <ui-icon name="check-circle" [size]="14" />
                <span>{{ recMsg }}</span>
              </div>
            }

            @if (error(); as message) {
              <p class="error" role="alert">
                <ui-icon name="alert-circle" [size]="14" /> {{ message }}
              </p>
            }

            <button
              class="btn btn-primary btn-block btn-lg"
              (click)="placeOrder()"
              [disabled]="submitting() || checkingRecovery()"
              type="button"
            >
              {{ submitting() ? ('checkout.placingOrder' | translate) : ('checkout.placeOrder' | translate) }}
            </button>

            <p class="fine">
              {{ 'checkout.authoritativeTotals' | translate }}
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
        grid-template-columns: 1fr 360px;
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
      .error-msg {
        color: var(--color-danger, #dc2626);
        font-size: 11.5px;
        font-weight: 600;
      }
      .payments {
        display: grid;
        gap: 10px;
      }
      .payment {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 13px 15px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-weight: 500;
        transition: all 140ms ease;
      }
      .payment.selected {
        border-color: var(--color-accent);
        background: var(--color-accent-soft);
      }
      .payment.coming-soon {
        border-style: dashed;
        background: rgba(245, 240, 230, 0.45);
      }
      .payment.coming-soon:hover {
        border-color: #d9bd8b;
        background: rgba(245, 240, 230, 0.75);
      }
      .payment input[type='radio'] {
        margin-top: 3px;
      }
      .payment ui-icon {
        margin-top: 1px;
      }
      .payment-info {
        display: flex;
        flex-direction: column;
        flex: 1;
      }
      .payment-title-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .payment strong {
        font-size: 14px;
      }
      .pay-badge {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 999px;
        text-transform: uppercase;
        letter-spacing: .04em;
      }
      .pay-badge-active {
        background: #e6f4ea;
        color: #137333;
      }
      .pay-badge-soon {
        background: #fef7e0;
        color: #b06000;
        border: 1px solid rgba(176, 96, 0, 0.2);
      }
      .payment small {
        color: var(--color-muted);
        font-size: 12px;
        font-weight: 400;
        margin-top: 2px;
      }
      .payment-notice {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 14px;
        padding: 10px 14px;
        border-radius: var(--radius-sm);
        background: #fff8e6;
        border: 1px solid #f0dc9e;
        color: #8c5b00;
        font-size: 12.5px;
        line-height: 1.4;
      }
      .policy-card {
        padding: 14px;
        border-radius: var(--radius-sm, 6px);
        background: #fafaf9;
        border: 1px solid var(--color-border);
      }
      .policy-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
        color: var(--color-text);
        font-size: 13.5px;
      }
      .policy-desc {
        font-size: 12px;
        color: var(--color-muted);
        line-height: 1.5;
        margin: 0 0 12px;
      }
      .checkbox-container {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        cursor: pointer;
        padding: 10px;
        background: #fff;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        transition: border-color 0.15s;
      }
      .checkbox-container.has-error {
        border-color: var(--color-danger, #dc2626);
        background: #fef2f2;
      }
      .checkbox-container input[type='checkbox'] {
        margin-top: 3px;
        cursor: pointer;
        width: 16px;
        height: 16px;
        accent-color: var(--color-accent);
      }
      .checkbox-text {
        font-size: 12.5px;
        font-weight: 500;
        line-height: 1.45;
        color: var(--color-text);
      }
      .review-details {
        display: grid;
        gap: 10px;
        padding: 14px;
        background: #fafaf9;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-border);
      }
      .review-row {
        display: grid;
        grid-template-columns: 140px 1fr;
        gap: 8px;
        font-size: 13px;
        align-items: center;
      }
      .review-label {
        color: var(--color-muted);
      }
      .review-value {
        color: var(--color-text);
        font-weight: 500;
      }
      .badge-cod-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #f0fdf4;
        color: #166534;
        border: 1px solid #bbf7d0;
        padding: 3px 9px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
      }
      .cod-caution-banner {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: #fffbeb;
        border: 1px solid #fde68a;
        border-radius: var(--radius-sm);
        color: #92400e;
        font-size: 11.5px;
        margin-top: 4px;
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
      .shipments {
        display: grid;
        gap: 11px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--color-border);
      }
      .single-store-banner {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: var(--radius-sm, 6px);
        margin-bottom: 14px;
        font-size: 12px;
        color: #166534;
      }
      .single-store-banner-text strong {
        display: block;
        font-weight: 650;
      }
      .single-store-banner-text p {
        margin: 2px 0 0;
        color: #15803d;
        font-size: 11px;
      }
      .back-cart-link {
        margin-left: auto;
        font-weight: 600;
        color: #166534;
        text-decoration: underline;
        white-space: nowrap;
      }
      .shipment {
        display: grid;
        gap: 6px;
      }
      .shipment header {
        align-items: center;
        color: var(--color-text);
        display: flex;
        font-size: 11.5px;
        font-weight: 700;
        gap: 6px;
      }
      .shipment header span {
        color: var(--color-muted);
        font-size: 9.5px;
        font-weight: 500;
        margin-left: auto;
      }
      .shipment .lines {
        border: 0;
        padding: 0 0 0 19px;
      }
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
      .uncertain-banner {
        padding: 12px;
        border-radius: var(--radius-sm);
        background: #fff7ed;
        border: 1px solid #fdba74;
        color: #9a3412;
        font-size: 12px;
        display: grid;
        gap: 8px;
      }
      .uncertain-header {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12.5px;
      }
      .uncertain-banner p {
        margin: 0;
        line-height: 1.4;
      }
      .recovery-msg {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #15803d;
        font-size: 12px;
        background: #f0fdf4;
        padding: 8px 10px;
        border-radius: var(--radius-sm);
        border: 1px solid #bbf7d0;
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
      .spin {
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
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
        .review-row {
          grid-template-columns: 1fr;
          gap: 2px;
        }
      }
    `,
  ],
})
export class CheckoutComponent implements OnInit {
  protected readonly cart = inject(CartService);
  private readonly api = inject(CommerceApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly rentify = inject(RentifyMarketplaceService);
  private readonly route = inject(ActivatedRoute);
  protected readonly translate = inject(TranslateService);
  private readonly seo = inject(SeoService);

  protected readonly paymentOptions = PAYMENT_OPTIONS;
  protected readonly method = signal<PaymentMethod>('COD');
  protected readonly submitting = signal(false);
  protected readonly uncertainSubmission = signal(false);
  protected readonly checkingRecovery = signal(false);
  protected readonly recoveryMessage = signal('');
  protected readonly error = signal('');

  private readonly checkoutKeys = new Map<string, string>();

  ngOnInit(): void {
    this.seo.setPageTitle(`${this.translate.t('checkout.title')} | Rentify Marketplace`);
  }

  protected selectMethod(option: PaymentOption): void {
    this.method.set(option.value);
  }

  protected readonly requestedStoreId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('storeId'))),
    { initialValue: this.route.snapshot.queryParamMap.get('storeId') },
  );

  protected readonly activeStoreId = computed(() =>
    this.requestedStoreId() || this.cart.activeCheckoutStoreId(),
  );

  protected readonly shipmentGroups = computed(() => {
    const filterStoreId = this.activeStoreId();
    const allGroups = this.cart.groups();
    const targeted = filterStoreId
      ? allGroups.filter((g) => g.storeId === filterStoreId)
      : allGroups;

    return targeted.map((g) => ({
      storeId: g.storeId,
      sellerName: g.sellerName,
      lines: g.lines.map((l) => ({
        product: l.product,
        quantity: l.quantity,
        lineTotal: l.lineTotal,
      })),
    }));
  });

  protected readonly checkoutSubtotal = computed(() => {
    const filterStoreId = this.activeStoreId();
    if (filterStoreId) {
      const g = this.cart.storeCart(filterStoreId);
      return g ? parseFloat(g.subtotal) || 0 : this.cart.subtotal();
    }
    return this.cart.subtotal();
  });

  protected readonly checkoutShipping = computed(() => {
    const filterStoreId = this.activeStoreId();
    if (filterStoreId) {
      const g = this.cart.storeCart(filterStoreId);
      return g ? parseFloat(g.deliveryFee || '0') || 0 : this.cart.shipping();
    }
    return this.cart.shipping();
  });

  protected readonly checkoutTotal = computed(() => {
    const filterStoreId = this.activeStoreId();
    if (filterStoreId) {
      const g = this.cart.storeCart(filterStoreId);
      return g ? parseFloat(g.totalAmount || g.subtotal) || 0 : this.cart.total();
    }
    return this.cart.total();
  });

  protected readonly form = new FormGroup({
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
    policyAcknowledged: new FormControl(false, {
      nonNullable: true,
      validators: [Validators.requiredTrue],
    }),
  });

  protected readonly fullDeliveryAddress = computed(() => {
    const { address, city, province, note } = this.form.getRawValue();
    return [address, city, province, note?.trim()].filter(Boolean).join(', ');
  });

  protected invalid(field: string): boolean {
    const control = this.form.get(field);
    return Boolean(control && control.touched && control.invalid);
  }

  getOrInitCheckoutKey(storeId: string): string {
    const storageKey = `rentify_pending_checkout_key_${storeId}`;
    if (typeof sessionStorage !== 'undefined') {
      const existing = sessionStorage.getItem(storageKey);
      if (existing) return existing;
    }
    const memKey = this.checkoutKeys.get(storeId);
    if (memKey) return memKey;

    const newKey = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `chk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(storageKey, newKey);
      } catch {}
    }
    this.checkoutKeys.set(storeId, newKey);
    return newKey;
  }

  clearCheckoutKey(storeId: string): void {
    const storageKey = `rentify_pending_checkout_key_${storeId}`;
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.removeItem(storageKey);
      } catch {}
    }
    this.checkoutKeys.delete(storeId);
  }

  protected async placeOrder(): Promise<void> {
    if (this.submitting() || this.checkingRecovery()) return;

    this.error.set('');
    this.recoveryMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set(this.translate.t('checkout.formError'));
      return;
    }

    this.submitting.set(true);
    const { note, address, city, province, fullName, phone } = this.form.getRawValue();
    const fullAddress = [address, city, province, note.trim()].filter(Boolean).join(', ');

    try {
      const placedOrders: Array<{
        orderNumber: string;
        storeId: string;
        sellerName: string;
        total: string;
        subtotal?: string;
        deliveryFee?: string | null;
        recipientName: string;
        recipientPhone: string;
        deliveryAddress: string;
        paymentMethod: string;
        itemCount: number;
        items: Array<{ name: string; quantity: number; price: number }>;
      }> = [];

      const targetStoreId = this.activeStoreId();
      let storeCarts = this.cart.getStoreCarts().filter((c) => c.items.length > 0);
      if (targetStoreId) {
        storeCarts = storeCarts.filter((c) => c.storeId === targetStoreId);
      }

      if (storeCarts.length > 0) {
        for (const cart of storeCarts) {
          const idempotencyKey = this.getOrInitCheckoutKey(cart.storeId);
          const expectedTotal = cart.totalAmount || cart.subtotal || '0';
          const res = await firstValueFrom(
            this.rentify.checkout(
              cart.storeId,
              expectedTotal,
              fullName,
              phone,
              fullAddress,
              idempotencyKey,
            ),
          );

          // Success on this store! Clear its idempotency key
          this.clearCheckoutKey(cart.storeId);

          const storeName =
            this.shipmentGroups().find((g) => g.storeId === cart.storeId)?.sellerName ||
            this.translate.t('checkout.localMerchant');
          const items = (res.order?.items || []).map((it: any) => ({
            name: it.name || this.translate.t('checkout.item'),
            quantity: it.quantity,
            price: it.quantity
              ? Math.round((parseFloat(it.total) / it.quantity) * 100) / 100
              : 0,
          }));

          placedOrders.push({
            orderNumber: res.order?.orderNumber || 'confirmed',
            storeId: cart.storeId,
            sellerName: storeName,
            total: res.order?.totalAmount || expectedTotal,
            subtotal: res.order?.subtotal || cart.subtotal,
            deliveryFee: res.order?.deliveryFee || cart.deliveryFee,
            recipientName: fullName,
            recipientPhone: phone,
            deliveryAddress: fullAddress,
            paymentMethod: 'COD',
            itemCount:
              items.reduce((sum: number, it: any) => sum + it.quantity, 0) || cart.items.length,
            items,
          });
        }
      } else {
        const groups = this.shipmentGroups();
        for (const g of groups) {
          const idempotencyKey = this.getOrInitCheckoutKey(g.storeId);
          const groupTotal = g.lines.reduce((s, l) => s + l.lineTotal, 0).toFixed(2);
          const res = await firstValueFrom(
            this.rentify.checkout(
              g.storeId,
              groupTotal,
              fullName,
              phone,
              fullAddress,
              idempotencyKey,
            ),
          );

          this.clearCheckoutKey(g.storeId);

          const items = g.lines.map((l) => ({
            name: l.product.name,
            quantity: l.quantity,
            price: l.product.price,
          }));

          placedOrders.push({
            orderNumber: res.order?.orderNumber || 'confirmed',
            storeId: g.storeId,
            sellerName: g.sellerName,
            total: res.order?.totalAmount || groupTotal,
            recipientName: fullName,
            recipientPhone: phone,
            deliveryAddress: fullAddress,
            paymentMethod: 'COD',
            itemCount: items.reduce((sum, it) => sum + it.quantity, 0),
            items,
          });
        }
      }

      if (typeof sessionStorage !== 'undefined') {
        try {
          sessionStorage.setItem('rentify_placed_orders', JSON.stringify(placedOrders));
        } catch {}
      }

      if (targetStoreId) {
        this.cart.markEmptied(targetStoreId);
      } else {
        this.cart.markEmptied();
      }

      this.uncertainSubmission.set(false);
      const orderNums = placedOrders.map((o) => o.orderNumber).join(',');
      await this.router.navigate(['/order-success'], {
        queryParams: {
          orders: orderNums,
          order: placedOrders[0]?.orderNumber || 'confirmed',
        },
      });
    } catch (err: any) {
      const status = err?.status;
      const serverMessage = err?.error?.message || err?.message || '';

      if (status === 409) {
        if (serverMessage.includes('Cart price or delivery fee changed')) {
          this.error.set(this.translate.t('checkout.priceChangedError'));
        } else if (serverMessage.includes('Insufficient stock')) {
          this.error.set(this.translate.t('checkout.stockError'));
        } else if (
          serverMessage.includes('different request') ||
          serverMessage.includes('another buyer')
        ) {
          const targetStoreId = this.activeStoreId();
          if (targetStoreId) this.clearCheckoutKey(targetStoreId);
          this.error.set(cartErrorMessage(err));
        } else {
          this.error.set(cartErrorMessage(err));
        }
        await this.cart.refresh();
      } else if (
        status === 0 ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        err?.name === 'TimeoutError'
      ) {
        // Safe timeout / uncertain recovery: retain idempotency key, allow user to verify status
        this.uncertainSubmission.set(true);
        this.error.set(this.translate.t('checkout.uncertainDesc'));
      } else if (status === 401 || status === 403) {
        this.error.set(this.translate.t('checkout.unverifiedError'));
      } else {
        this.error.set(cartErrorMessage(err));
        await this.cart.refresh();
      }
    } finally {
      this.submitting.set(false);
    }
  }

  protected async verifyOrderStatus(): Promise<void> {
    this.checkingRecovery.set(true);
    this.recoveryMessage.set('');
    try {
      const res = await firstValueFrom(this.rentify.orders());
      const orders = res?.orders || [];
      const targetStoreId = this.activeStoreId();

      const recentOrder = orders.find((o) => {
        if (targetStoreId && o.storeId !== targetStoreId) return false;
        const createdAt = new Date(o.createdAt || Date.now()).getTime();
        const now = Date.now();
        return now - createdAt < 15 * 60 * 1000;
      });

      if (recentOrder) {
        if (targetStoreId) {
          this.clearCheckoutKey(targetStoreId);
          this.cart.markEmptied(targetStoreId);
        } else {
          this.cart.markEmptied();
        }

        const placedOrders = [
          {
            orderNumber: recentOrder.orderNumber,
            storeId: recentOrder.storeId,
            sellerName: this.translate.t('checkout.localMerchant'),
            total: recentOrder.totalAmount,
            subtotal: recentOrder.subtotal,
            deliveryFee: recentOrder.deliveryFee,
            recipientName: recentOrder.customerInfo?.name || '',
            recipientPhone: recentOrder.customerInfo?.phone || '',
            deliveryAddress: recentOrder.shippingInfo?.address || '',
            paymentMethod: 'COD',
            itemCount: recentOrder.items?.reduce((s, it) => s + it.quantity, 0) || 1,
            items: (recentOrder.items || []).map((it) => ({
              name: it.name,
              quantity: it.quantity,
              price: it.quantity
                ? Math.round((parseFloat(it.total) / it.quantity) * 100) / 100
                : 0,
            })),
          },
        ];

        if (typeof sessionStorage !== 'undefined') {
          try {
            sessionStorage.setItem('rentify_placed_orders', JSON.stringify(placedOrders));
          } catch {}
        }

        await this.router.navigate(['/order-success'], {
          queryParams: {
            orders: recentOrder.orderNumber,
            order: recentOrder.orderNumber,
          },
        });
        return;
      }

      this.uncertainSubmission.set(false);
      this.error.set('');
      this.recoveryMessage.set(this.translate.t('checkout.noOrderFound'));
    } catch {
      this.error.set(this.translate.t('checkout.verifyError'));
    } finally {
      this.checkingRecovery.set(false);
    }
  }
}
