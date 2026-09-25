import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { merchantDashboardUrl } from '../../../../core/rentify/rentify-marketplace.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <footer class="footer">
    <div class="container footer-grid">
      <div class="footer-brand">
        <div class="logo">
          <img src="/assets/rentify-logo.webp" alt="Rentify Marketplace" class="logo-mark" />
          Rentify Marketplace
        </div>
        <p>A Cambodian local-first marketplace for products from independent stores.</p>
      </div>
      <div class="footer-col">
        <h4>Shop</h4>
        <a routerLink="/">Home</a>
        <a routerLink="/products">Products</a>
        <a routerLink="/categories">Categories</a>
        <a routerLink="/stores">Stores</a>
        <a routerLink="/about">About</a>
      </div>
      <div class="footer-col">
        <h4>Account</h4>
        <a [href]="signInUrl">Sign in</a>
        <a [href]="registerUrl">Create account</a>
        <a routerLink="/orders">My orders</a>
        <a routerLink="/wishlist">Wishlist</a>
        <a routerLink="/cart">Cart</a>
      </div>
      <div class="footer-col">
        <h4>Sell</h4>
        <a routerLink="/become-a-seller">Become a Seller</a>
        <a [href]="sellerLoginUrl">Seller login</a>
      </div>
      <div class="footer-col">
        <h4>Assistance</h4>
        <a routerLink="/help">Help centre</a>
        <a routerLink="/contact">Contact us</a>
        <a routerLink="/shipping">Shipping info</a>
        <a routerLink="/privacy">Privacy policy</a>
        <a routerLink="/terms">Terms of service</a>
      </div>
    </div>
    <div class="footer-payment-strip container">
      <div class="payment-strip-title">Accepted &amp; supported payments</div>
      <div class="payment-badges">
        <div class="pay-badge active" title="Pay with cash on delivery">
          <span class="pay-dot"></span>
          <span class="pay-name">Cash on Delivery</span>
          <span class="pay-pill available">Available</span>
        </div>
        <div class="pay-badge soon" title="Bakong KHQR instant scan payment">
          <span class="pay-name">Bakong KHQR</span>
          <span class="pay-pill soon">Coming soon</span>
        </div>
        <div class="pay-badge soon" title="ABA Mobile &amp; PayWay">
          <span class="pay-name">ABA PayWay</span>
          <span class="pay-pill soon">Coming soon</span>
        </div>
        <div class="pay-badge soon" title="Visa and Mastercard cards">
          <span class="pay-name">Visa / Mastercard</span>
          <span class="pay-pill soon">Coming soon</span>
        </div>
      </div>
    </div>
    <div class="footer-bottom container">
      <span>&copy; 2026 Rentify Marketplace. All rights reserved.</span>
      <span class="made-in">Cambodian stores, one marketplace.</span>
    </div>
  </footer>
  `,
  styles: [`
    .footer { background: var(--color-bg-alt); color: var(--color-text); margin-top: 0; padding-top: clamp(40px, 4.5vw, 64px); border-top: 1px solid var(--color-border); }
    .footer-grid {
      display: grid;
      grid-template-columns: 1.6fr repeat(4, minmax(110px, 1fr));
      gap: clamp(20px, 2.5vw, 40px);
      padding-bottom: 40px;
    }
    .footer-brand .logo { font-family: var(--font-body); font-weight: 700; font-size: 19px; letter-spacing: -.01em; color: var(--color-text); margin-bottom: 10px; display: flex; align-items: center; gap: 9px; }
    .logo-mark { width: 31px; height: 31px; border-radius: 8px; object-fit: contain; display: block; flex-shrink: 0; }
    .footer-brand p { font-size: 13px; color: var(--color-muted); line-height: 1.6; max-width: 300px; }
    .footer-col h4 { font-family: var(--font-body); font-size: 13px; font-weight: 600; margin-bottom: 14px; color: var(--color-text); }
    .footer-col a { display: block; font-size: 13.5px; color: var(--color-muted); margin-bottom: 10px; transition: color 150ms ease; }
    .footer-col a:hover { color: var(--color-accent); }
    .footer-payment-strip {
      border-top: 1px solid var(--color-border);
      padding-top: 16px;
      padding-bottom: 16px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .payment-strip-title { font-size: 12.5px; font-weight: 600; color: var(--color-text); }
    .payment-badges { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .pay-badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 5px 11px;
      border-radius: 6px;
      font-size: 12px;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      color: var(--color-text);
    }
    .pay-badge.soon { color: var(--color-muted); }
    .pay-dot { width: 7px; height: 7px; border-radius: 50%; background: #16a34a; }
    .pay-pill {
      font-size: 10px;
      padding: 1.5px 6px;
      border-radius: 4px;
      font-weight: 600;
      letter-spacing: .02em;
    }
    .pay-pill.available { background: #dcfce7; color: #166534; }
    .pay-pill.soon { background: var(--color-bg-alt); color: var(--color-muted); border: 1px solid var(--color-border); }
    .footer-bottom {
      border-top: 1px solid var(--color-border);
      padding-top: 18px;
      padding-bottom: 22px;
      font-size: 12.5px;
      color: var(--color-muted);
      display: flex;
      justify-content: space-between;
    }
    /*
     * There are five children here — the brand block plus four link columns —
     * so any grid with four or two tracks leaves the last column stranded on
     * its own row with a band of empty space beside it. Below the full-width
     * layout the brand takes a row of its own and the four link columns share
     * the next one evenly, which divides cleanly at both 4 and 2 tracks.
     */
    @media (max-width: 1180px) {
      .footer-grid { grid-template-columns: repeat(4, minmax(110px, 1fr)); }
      .footer-brand { grid-column: 1 / -1; }
      .footer-brand p { max-width: 46ch; }
    }
    @media (max-width: 720px) {
      .footer-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 26px 20px; }
      .footer-bottom { flex-direction: column; gap: 6px; }
    }
  `]
})
export class FooterComponent {
  private readonly auth = inject(AuthService);
  protected readonly signInUrl = this.auth.getLoginUrl();
  protected readonly registerUrl = this.auth.getRegisterUrl();
  protected readonly sellerLoginUrl = this.auth.getLoginUrl(merchantDashboardUrl());
}
