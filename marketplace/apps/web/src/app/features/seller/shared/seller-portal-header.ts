import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * Every nav item here is a real route, not a same-page anchor — clicking
 * "Pricing" takes you to the pricing page, not to a spot further down
 * whatever page you happened to be on. `routerLinkActive` highlights
 * whichever one you're currently on.
 */
@Component({
  selector: 'app-seller-portal-header',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="seller-header">
      <div class="header-inner">
        <a class="brand" routerLink="/">KhmerCraft</a>

        <nav class="desktop-nav" aria-label="Seller navigation">
          <a routerLink="/become-a-seller" routerLinkActive="current" [routerLinkActiveOptions]="{ exact: true }">Why Sell</a>
          <a routerLink="/become-a-seller/explore" routerLinkActive="current">Explore</a>
          <a routerLink="/become-a-seller/pricing" routerLinkActive="current">Pricing</a>
          <a routerLink="/become-a-seller/faq" routerLinkActive="current">FAQ</a>
          <a routerLink="/about">About us</a>
        </nav>

        <div class="desktop-actions">
          <a class="sign-in" routerLink="/seller/login">Seller Sign In</a>
          <a class="start" routerLink="/seller/onboarding">Start Selling</a>
        </div>

        <button type="button" class="menu-button" (click)="menuOpen.set(!menuOpen())" aria-label="Toggle seller navigation" [attr.aria-expanded]="menuOpen()" aria-controls="seller-mobile-nav">
          {{ menuOpen() ? 'Close' : 'Menu' }}
        </button>
      </div>

      @if (menuOpen()) {
        <nav id="seller-mobile-nav" class="mobile-nav" aria-label="Mobile seller navigation">
          <a routerLink="/become-a-seller" routerLinkActive="current" [routerLinkActiveOptions]="{ exact: true }" (click)="menuOpen.set(false)">Why Sell</a>
          <a routerLink="/become-a-seller/explore" routerLinkActive="current" (click)="menuOpen.set(false)">Explore</a>
          <a routerLink="/become-a-seller/pricing" routerLinkActive="current" (click)="menuOpen.set(false)">Pricing</a>
          <a routerLink="/become-a-seller/faq" routerLinkActive="current" (click)="menuOpen.set(false)">FAQ</a>
          <a routerLink="/about" (click)="menuOpen.set(false)">About us</a>
          <a routerLink="/seller/login" (click)="menuOpen.set(false)">Seller Sign In</a>
          <a class="start" routerLink="/seller/onboarding" (click)="menuOpen.set(false)">Start Selling</a>
        </nav>
      }
    </header>
  `,
  styles: [`
    :host { display: block; position: sticky; top: 0; z-index: 60; }
    .seller-header { background: rgba(252,250,245,.94); border-bottom: 1px solid #e4dbce; backdrop-filter: blur(14px); }
    .header-inner { align-items: center; display: flex; justify-content: space-between; margin: 0 auto; max-width: 1210px; min-height: 72px; padding: 0 32px; }
    .brand { color: #213b30; font-family: var(--font-heading); font-size: 21px; font-weight: 700; letter-spacing: -.025em; text-decoration: none; }
    .desktop-nav, .desktop-actions { align-items: center; display: flex; }
    .desktop-nav { gap: 34px; }
    .desktop-actions { gap: 22px; }
    a { color: #625b53; font-size: 12px; font-weight: 700; text-decoration: none; transition: color .2s ease; }
    a:hover { color: #9b3827; }
    .desktop-nav a.current { color: #213b30; }
    .desktop-nav a { position: relative; padding-bottom: 4px; }
    .desktop-nav a.current::after { content: ''; position: absolute; left: 0; right: 0; bottom: -2px; height: 2px; background: #bd8a42; border-radius: 2px; }
    a:focus-visible, button:focus-visible { outline: 3px solid #bd8a42; outline-offset: 4px; }
    .sign-in { color: #213b30; font-weight: 800; }
    .start { background: #213b30; border-radius: 7px; color: white; padding: 11px 22px; transition: background .2s ease, transform .2s ease; }
    .start:hover { background: #2f5543; color: white; transform: translateY(-1px); }
    .menu-button { background: none; border: 0; color: #213b30; display: none; font: inherit; font-size: 13px; font-weight: 800; }
    .mobile-nav { background: #fcfaf5; border-top: 1px solid #e4dbce; display: flex; flex-direction: column; gap: 15px; padding: 18px 24px 22px; }
    .mobile-nav a.current { color: #213b30; }
    .mobile-nav .start { text-align: center; }
    @media (max-width: 860px) {
      .desktop-nav, .desktop-actions { display: none; }
      .menu-button { display: block; }
    }
    @media (prefers-reduced-motion: reduce) { * { transition-duration: .01ms !important; } }
  `],
})
export class SellerPortalHeader {
  protected readonly menuOpen = signal(false);
}
