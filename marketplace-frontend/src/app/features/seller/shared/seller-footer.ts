import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-seller-footer',
  imports: [RouterLink],
  template: `
    <footer class="seller-footer">
      <div class="wrap footer-inner">
        <a class="footer-brand" routerLink="/">KhmerCraft</a>
        <nav aria-label="Seller footer">
          <a routerLink="/">Marketplace</a>
          <a routerLink="/about">About</a>
          <a routerLink="/seller/login">Seller sign in</a>
          <a routerLink="/seller/onboarding">Start selling</a>
        </nav>
        <small>KhmerCraft seller experience</small>
      </div>
    </footer>
  `,
  styles: [`
    :host{display:block}
    .wrap{width:min(1180px,calc(100% - 48px));margin-inline:auto}
    .seller-footer{background:#17281f;color:#e9e3d8}
    .footer-inner{min-height:105px;display:flex;align-items:center;gap:45px;flex-wrap:wrap;padding:20px 0}
    .footer-brand{color:#fff;font-family:var(--font-heading);font-size:21px;font-weight:700;text-decoration:none}
    .footer-inner nav{display:flex;gap:25px;font-size:12px;flex-wrap:wrap}
    .footer-inner nav a{color:#e9e3d8;text-decoration:none}
    .footer-inner nav a:hover{color:#e2c794}
    .footer-inner nav a:focus-visible{outline:3px solid #d19b48;outline-offset:4px}
    .footer-inner small{margin-left:auto;color:#91a197}
    @media(max-width:600px){.footer-inner small{width:100%;margin:0}}
  `],
})
export class SellerFooter {}
