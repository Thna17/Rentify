import { Component, computed, ElementRef, inject, OnInit, signal } from '@angular/core';
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

import { CAMBODIA_LOCATIONS } from '../core/data/cambodia-locations';

export interface SavedAddress {
  id: string;
  fullName: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  note?: string;
  isDefault?: boolean;
}

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
              <div class="block-header-row">
                <h2 id="step-1-heading"><span class="step">1</span> {{ 'checkout.deliveryInfo' | translate }}</h2>
                <button
                  type="button"
                  class="btn-add-address"
                  (click)="toggleCustomAddress()"
                  [title]="showAddressForm() ? 'Choose from saved addresses' : 'Add new address'"
                >
                  <ui-icon [name]="showAddressForm() ? 'x' : 'plus'" [size]="14" />
                  <span>{{ showAddressForm() ? 'Saved Addresses' : 'Add New' }}</span>
                </button>
              </div>

              <!-- Saved Addresses List -->
              @if (savedAddresses().length > 0 && !showAddressForm()) {
                <div class="saved-addresses-list" role="radiogroup" aria-label="Select saved delivery address">
                  @for (addr of savedAddresses(); track addr.id) {
                    <div
                      class="saved-addr-card"
                      [class.selected]="selectedAddressId() === addr.id"
                      (click)="selectSavedAddress(addr)"
                      role="radio"
                      [attr.aria-checked]="selectedAddressId() === addr.id"
                      tabindex="0"
                    >
                      <div class="addr-radio-indicator">
                        <span class="addr-dot"></span>
                      </div>
                      <div class="addr-content">
                        <div class="addr-top-line">
                          <strong class="addr-name">{{ addr.fullName }}</strong>
                          <span class="addr-phone">{{ addr.phone }}</span>
                          @if (addr.isDefault) {
                            <span class="addr-default-pill">Default</span>
                          }
                        </div>
                        <div class="addr-detail">
                          {{ addr.address }}, {{ addr.city }}, {{ addr.province }}
                        </div>
                      </div>
                      <button
                        type="button"
                        class="addr-edit-btn"
                        (click)="editSelectedAddress(addr, $event)"
                        title="Edit address"
                      >
                        <ui-icon name="edit" [size]="13" />
                      </button>
                    </div>
                  }
                </div>
              }

              <!-- Address Input Grid -->
              @if (showAddressForm() || savedAddresses().length === 0) {
                <div class="grid tight-grid">
                  <label>
                    <span>{{ 'checkout.fullName' | translate }} *</span>
                    <input
                      formControlName="fullName"
                      autocomplete="name"
                      [attr.aria-invalid]="invalid('fullName')"
                      aria-describedby="fullName-error"
                    />
                    <small id="fullName-error" class="error-msg" [class.error-hidden]="!invalid('fullName')">
                      {{ 'checkout.fullNameError' | translate }}
                    </small>
                  </label>

                  <label>
                    <span>{{ 'checkout.phone' | translate }} *</span>
                    <input
                      type="tel"
                      formControlName="phone"
                      autocomplete="tel"
                      placeholder="012 345 678"
                      [attr.aria-invalid]="invalid('phone')"
                      aria-describedby="phone-error"
                    />
                    <small id="phone-error" class="error-msg" [class.error-hidden]="!invalid('phone')">
                      {{ 'checkout.phoneError' | translate }}
                    </small>
                  </label>

                  <label>
                    <span>{{ 'checkout.province' | translate }} *</span>
                    <select
                      formControlName="province"
                      autocomplete="address-level1"
                      aria-describedby="province-error"
                      [attr.aria-invalid]="invalid('province')"
                      (change)="provinceChanged()"
                    >
                      <option value="" disabled>{{ translate.currentLang() === 'km' ? 'ជ្រើសរើសខេត្ត / រាជធានី' : 'Select province / city' }}</option>
                      @for (province of provinces; track province.id) {
                        <option [value]="province.en">{{ translate.currentLang() === 'km' ? province.km : province.en }}</option>
                      }
                    </select>
                    <small id="province-error" class="error-msg" [class.error-hidden]="!invalid('province')">Required.</small>
                  </label>

                  <label>
                    <span>{{ 'checkout.city' | translate }} *</span>
                    <select
                      formControlName="city"
                      autocomplete="address-level2"
                      aria-describedby="city-error"
                      [attr.aria-invalid]="invalid('city')"
                    >
                      <option value="" disabled>{{ districts().length ? (translate.currentLang() === 'km' ? 'ជ្រើសរើសក្រុង / ស្រុក / ខណ្ឌ' : 'Select city / district') : (translate.currentLang() === 'km' ? 'សូមជ្រើសរើសខេត្តជាមុន' : 'Select a province first') }}</option>
                      @for (district of districts(); track district.id) {
                        <option [value]="district.en">{{ translate.currentLang() === 'km' ? district.km : district.en }}</option>
                      }
                    </select>
                    <small id="city-error" class="error-msg" [class.error-hidden]="!invalid('city')">Required.</small>
                  </label>

                  <label class="wide">
                    <span>{{ 'checkout.address' | translate }} *</span>
                    <input
                      formControlName="address"
                      autocomplete="street-address"
                      placeholder="House 12, Street 240"
                      [attr.aria-invalid]="invalid('address')"
                      aria-describedby="address-error"
                    />
                    <small id="address-error" class="error-msg" [class.error-hidden]="!invalid('address')">
                      {{ 'checkout.addressError' | translate }}
                    </small>
                  </label>

                  <label class="wide">
                    <span>{{ 'checkout.note' | translate }} <em>({{ 'checkout.optional' | translate }})</em></span>
                    <input formControlName="note" [placeholder]="'checkout.notePlaceholder' | translate" />
                  </label>
                </div>
              }
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
                    <ui-icon [name]="option.icon" [size]="18" />
                    <div class="payment-title-row">
                      <strong>{{ option.labelKey | translate }}</strong>
                      <span class="pay-badge pay-badge-active">{{ option.badgeKey | translate }}</span>
                    </div>
                  </label>
                }
              </div>
            </section>

            <!-- Step 3: Policy Acknowledgement -->
            <section class="card block" aria-labelledby="step-3-heading">
              <h2 id="step-3-heading"><span class="step">3</span> {{ 'checkout.policyTitle' | translate }}</h2>

              <div class="policy-card compact-policy">
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
                <small id="policy-error" class="error-msg" [class.error-hidden]="!invalid('policyAcknowledged')">
                  {{ 'checkout.policyAckError' | translate }}
                </small>
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
                    @for (line of group.lines; track line.product.id + (line.variantId || "")) {
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

            <p class="error validation-summary" role="status" [class.error-hidden]="!showValidationSummary()">
              Please complete the delivery details and acknowledge store policy.
            </p>

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
        gap: 8px 12px;
      }
      .wide {
        grid-column: 1 / -1;
      }
      .block-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }
      .block-header-row h2 {
        margin-bottom: 0;
      }
      .btn-add-address {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 10px;
        font-size: 12px;
        font-weight: 600;
        color: var(--color-accent);
        background: var(--color-accent-soft, rgba(0, 102, 204, 0.08));
        border: 1px solid var(--color-accent);
        border-radius: var(--radius-sm, 6px);
        cursor: pointer;
        transition: all 150ms ease;
      }
      .btn-add-address:hover {
        background: var(--color-accent);
        color: #fff;
      }
      .saved-addresses-list {
        display: grid;
        gap: 8px;
        margin-bottom: 8px;
      }
      .saved-addr-card {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        border: 1.5px solid var(--color-border-strong);
        border-radius: var(--radius-sm, 6px);
        background: #fff;
        cursor: pointer;
        transition: all 140ms ease;
      }
      .saved-addr-card:hover {
        border-color: var(--color-accent);
      }
      .saved-addr-card.selected {
        border-color: var(--color-accent);
        background: var(--color-accent-soft, rgba(0, 102, 204, 0.04));
      }
      .addr-radio-indicator {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid var(--color-border-strong);
        display: grid;
        place-items: center;
        flex-shrink: 0;
      }
      .saved-addr-card.selected .addr-radio-indicator {
        border-color: var(--color-accent);
      }
      .addr-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: transparent;
        transition: background 120ms ease;
      }
      .saved-addr-card.selected .addr-dot {
        background: var(--color-accent);
      }
      .addr-content {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .addr-top-line {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
      }
      .addr-name {
        color: var(--color-text);
      }
      .addr-phone {
        color: var(--color-muted);
        font-size: 12px;
      }
      .addr-default-pill {
        font-size: 9.5px;
        font-weight: 700;
        padding: 1px 6px;
        border-radius: 999px;
        background: #e6f4ea;
        color: #137333;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .addr-detail {
        font-size: 12px;
        color: var(--color-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .addr-edit-btn {
        background: none;
        border: none;
        padding: 4px;
        color: var(--color-muted);
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        align-items: center;
      }
      .addr-edit-btn:hover {
        color: var(--color-text);
        background: rgba(0, 0, 0, 0.05);
      }
      label {
        display: grid;
        gap: 4px;
        font-size: 12.5px;
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
      .grid input,
      .grid select {
        height: 38px;
        padding: 0 10px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        font-size: 13.5px;
      }
      .grid label {
        grid-template-rows: auto 38px minmax(14px, auto);
        align-content: start;
      }
      .grid label:last-child { grid-template-rows: auto 38px; }
      .error-hidden { visibility: hidden; }
      .validation-summary { min-height: 36px; margin: 0; }
      .grid select { width: 100%; min-width: 0; background: var(--color-surface, #fff); color: var(--color-text); }
      .grid select.ng-invalid { color: var(--color-muted); }
      .grid input[aria-invalid='true'],
      .grid select[aria-invalid='true'] { border-color: var(--color-danger, #dc2626); }
      .error-msg {
        color: var(--color-danger, #dc2626);
        font-size: 11px;
        font-weight: 600;
      }
      .payments {
        display: grid;
        gap: 8px;
      }
      .payment {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        min-height: 40px;
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
        cursor: not-allowed;
        border-style: dashed;
        background: rgba(245, 240, 230, 0.45);
      }
      .payment.coming-soon:hover {
        border-color: #d9bd8b;
        background: rgba(245, 240, 230, 0.75);
      }
      .payment input[type='radio'] {
        margin: 0;
      }
      .payment ui-icon {
        flex-shrink: 0;
      }
      .payment-title-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
      }
      .payment strong {
        font-size: 13.5px;
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
      .policy-card {
        padding: 10px 12px;
        border-radius: var(--radius-sm, 6px);
        background: #fafaf9;
        border: 1px solid var(--color-border);
      }
      .checkbox-container {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        padding: 8px 10px;
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
        margin: 0;
        cursor: pointer;
        width: 15px;
        height: 15px;
        accent-color: var(--color-accent);
      }
      .checkbox-text {
        font-size: 12px;
        font-weight: 500;
        line-height: 1.4;
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
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly provinces = CAMBODIA_LOCATIONS;
  protected readonly paymentOptions = PAYMENT_OPTIONS;
  protected readonly method = signal<PaymentMethod>('COD');
  protected readonly attemptedSubmit = signal(false);
  protected readonly submitting = signal(false);
  protected readonly uncertainSubmission = signal(false);
  protected readonly checkingRecovery = signal(false);
  protected readonly recoveryMessage = signal('');
  protected readonly error = signal('');

  protected readonly savedAddresses = signal<SavedAddress[]>([]);
  protected readonly selectedAddressId = signal<string | null>(null);
  protected readonly showAddressForm = signal<boolean>(false);

  private readonly STORAGE_SAVED_ADDRESSES = 'rentify_saved_addresses';

  private readonly checkoutKeys = new Map<string, string>();

  ngOnInit(): void {
    this.seo.setPageTitle(`${this.translate.t('checkout.title')} | Rentify Marketplace`);
    this.initSavedAddresses();
  }

  private initSavedAddresses(): void {
    let list: SavedAddress[] = [];
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.STORAGE_SAVED_ADDRESSES);
        if (stored) {
          list = JSON.parse(stored);
        }
      } catch {}
    }

    // Only real addresses are offered; never pre-fill a placeholder delivery address.
    this.savedAddresses.set(list);

    // Auto-select the first/default address and populate the form
    const defaultAddr = list.find((a) => a.isDefault) || list[0];
    if (defaultAddr) {
      this.selectSavedAddress(defaultAddr);
    }
  }

  protected selectSavedAddress(addr: SavedAddress): void {
    this.selectedAddressId.set(addr.id);
    this.form.patchValue({
      fullName: addr.fullName,
      phone: addr.phone,
      province: addr.province,
      city: addr.city,
      address: addr.address,
      note: addr.note || '',
    });
  }

  protected toggleCustomAddress(): void {
    const currentlyShowing = this.showAddressForm();
    if (currentlyShowing) {
      // Switching back to saved list
      this.showAddressForm.set(false);
      const curId = this.selectedAddressId();
      const addr = this.savedAddresses().find((a) => a.id === curId) || this.savedAddresses()[0];
      if (addr) {
        this.selectSavedAddress(addr);
      }
    } else {
      // Opening custom address form
      this.showAddressForm.set(true);
    }
  }

  protected editSelectedAddress(addr: SavedAddress, event: MouseEvent): void {
    event.stopPropagation();
    this.selectSavedAddress(addr);
    this.showAddressForm.set(true);
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
        variantId: l.variantId,
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

  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  protected readonly districts = computed(() =>
    this.provinces.find((province) => province.en === this.formValue().province)?.districts ?? [],
  );

  protected provinceChanged(): void {
    this.form.controls.city.reset('');
  }

  protected readonly showValidationSummary = computed(() => {
    this.formValue();
    return this.attemptedSubmit() && this.form.invalid;
  });

  protected readonly fullDeliveryAddress = computed(() => {
    const { address, city, province, note } = this.formValue();
    return [address, city, province, note?.trim()].filter(Boolean).join(', ');
  });

  protected invalid(field: string): boolean {
    const control = this.form.get(field);
    return Boolean(control && this.attemptedSubmit() && control.invalid);
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

    this.attemptedSubmit.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const firstInvalid = Object.keys(this.form.controls).find((name) => this.form.get(name)?.invalid);
      this.host.nativeElement.querySelector<HTMLInputElement>(`[formControlName="${firstInvalid}"]`)?.focus();
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
