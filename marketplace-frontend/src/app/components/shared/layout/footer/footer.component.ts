import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

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
      <div class="payment-strip-title">Accepted & Supported Payments</div>
      <div class="payment-badges">
        <div class="pay-badge active" title="Pay with cash on delivery">
          <span class="pay-dot"></span>
          <span class="pay-name">Cash on Delivery</span>
          <span class="pay-pill available">Available</span>
        </div>
        <div class="pay-badge soon" title="Bakong KHQR instant scan payment">
          <span class="pay-name">Bakong KHQR</span>
          <span class="pay-pill soon">Coming Soon</span>
        </div>
        <div class="pay-badge soon" title="ABA Mobile & PayWay">
          <span class="pay-name">ABA PayWay</span>
          <span class="pay-pill soon">Coming Soon</span>
        </div>
        <div class="pay-badge soon" title="Visa and Mastercard cards">
          <span class="pay-name">Visa / Mastercard</span>
          <span class="pay-pill soon">Coming Soon</span>
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
    .footer { background: #1f3028; color: #f7f0e5; margin-top: 0; padding-top: clamp(30px, 3.5vw, 44px); border-top: 0; }
    .footer-grid {
      display: grid;
      grid-template-columns: 1.6fr repeat(4, minmax(110px, 1fr));
      gap: clamp(20px, 2.5vw, 40px);
      padding-bottom: 30px;
    }
    .footer-brand .logo { font-family: var(--font-heading); font-weight: 600; font-size: 22px; color: #fffaf0; margin-bottom: 10px; display: flex; align-items: center; gap: 9px; }
    .logo-mark { width: 31px; height: 31px; border-radius: 8px; object-fit: contain; display: block; flex-shrink: 0; }
    .footer-brand p { font-size: 13px; color: rgba(255,250,240,.65); line-height: 1.55; max-width: 300px; }
    .footer-col h4 { font-family: var(--font-body); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 12px; color: #d9bd8b; }
    .footer-col a { display: block; font-size: 13px; color: rgba(255,250,240,.65); margin-bottom: 8px; }
    .footer-col a:hover { color: #fff; }
    .footer-payment-strip {
      border-top: 1px solid rgba(255,255,255,.12);
      padding-top: 18px;
      padding-bottom: 18px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .payment-strip-title {
      font-size: 11.5px;
      font-weight: 600;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: #d9bd8b;
    }
    .payment-badges {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .pay-badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 5px 11px;
      border-radius: 6px;
      font-size: 12px;
      background: rgba(255,255,255,.07);
      border: 1px solid rgba(255,255,255,.13);
      color: #fffaf0;
    }
    .pay-badge.active .pay-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #34d399;
      box-shadow: 0 0 6px rgba(52, 211, 153, 0.6);
    }
    .pay-pill {
      font-size: 9.5px;
      padding: 1.5px 6px;
      border-radius: 4px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .04em;
    }
    .pay-pill.available {
      background: rgba(52, 211, 153, 0.2);
      color: #34d399;
      border: 1px solid rgba(52, 211, 153, 0.35);
    }
    .pay-pill.soon {
      background: rgba(217, 189, 139, 0.2);
      color: #d9bd8b;
      border: 1px solid rgba(217, 189, 139, 0.35);
    }
    .footer-bottom {
      border-top: 1px solid rgba(255,255,255,.12);
      padding-top: 14px;
      padding-bottom: 16px;
      font-size: 12.5px;
      color: rgba(255,250,240,.5);
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
  protected readonly sellerLoginUrl = this.auth.getLoginUrl('http://localhost:4400');
}
