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
  protected readonly sellerLoginUrl = this.auth.getLoginUrl(
    typeof window !== 'undefined' ? `${window.location.origin}/seller/dashboard` : '/seller/dashboard',
  );
}
