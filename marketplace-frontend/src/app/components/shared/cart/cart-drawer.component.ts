import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  OnDestroy,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../../core/cart/cart.service';
import { IconComponent } from '../ui/icon/icon.component';

@Component({
  selector: 'app-cart-drawer',
  imports: [RouterLink, IconComponent],
  template: `
    <div class="cart-layer" aria-live="polite">
      <button
        class="cart-backdrop"
        type="button"
        aria-label="Close shopping bag"
        animate.leave="backdrop-leave"
        (click)="requestClose()"
      ></button>

      <aside
        #panel
        class="cart-panel"
        animate.leave="panel-leave"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        aria-describedby="cart-drawer-description"
        tabindex="-1"
      >
        <header class="drawer-header">
          <div>
            <p class="eyebrow">Hak Shop checkout</p>
            <div class="title-row">
              <h2 id="cart-drawer-title">Your bag</h2>
              <span class="item-count">{{ cart.count() }} {{ cart.count() === 1 ? 'item' : 'items' }}</span>
              <a class="full-cart-link" routerLink="/cart" (click)="requestClose()">
                View full cart <ui-icon name="arrow-right" [size]="12" />
              </a>
            </div>
            <p id="cart-drawer-description" class="sr-only">
              Review products, update quantities, or proceed to checkout.
            </p>
          </div>
          <button #closeButton class="close-button" type="button" aria-label="Close shopping bag" (click)="requestClose()">
            <ui-icon name="x" [size]="20" />
          </button>
        </header>

        <div class="drawer-body">
          @if (cart.isEmpty()) {
            <div class="empty-state">
              <div class="empty-icon"><ui-icon name="cart" [size]="28" /></div>
              <h3>Your bag is ready for something special</h3>
              <p>Discover locally made products from Cambodian artisans.</p>
              <button type="button" class="secondary-action" (click)="continueShopping()">Explore products</button>
            </div>
          } @else {
            @if (cart.freeShippingRemaining() > 0) {
              <div class="shipping-progress">
                <div class="shipping-copy">
                  <ui-icon name="truck" [size]="15" />
                  <span>Add <strong>\${{ cart.freeShippingRemaining().toFixed(2) }}</strong> for free delivery</span>
                </div>
                <div class="progress-track"><span [style.width.%]="shippingProgress"></span></div>
              </div>
            } @else {
              <div class="shipping-earned"><ui-icon name="check" [size]="14" /> You unlocked free delivery</div>
            }

            <div class="cart-lines">
              @for (line of cart.lines(); track line.product.id) {
                <article class="cart-line">
                  <a class="product-image" [routerLink]="['/product', line.product.id]" (click)="requestClose()" [attr.aria-label]="'View ' + line.product.name">
                    @if (line.product.image) {
                      <img [src]="line.product.image" [alt]="line.product.name" />
                    } @else {
                      <span>{{ line.product.categoryName }}</span>
                    }
                  </a>

                  <div class="line-content">
                    <div class="line-top">
                      <div>
                        <a class="product-name" [routerLink]="['/product', line.product.id]" (click)="requestClose()">{{ line.product.name }}</a>
                        <span class="seller-name">{{ line.product.sellerName }}</span>
                      </div>
                      <button class="remove-button" type="button" (click)="cart.remove(line.product.id)" [attr.aria-label]="'Remove ' + line.product.name">
                        <ui-icon name="trash" [size]="15" />
                      </button>
                    </div>

                    <span class="unit-price">\${{ line.product.price.toFixed(2) }} each</span>

                    <div class="line-bottom">
                      <div class="quantity-control" [attr.aria-label]="'Quantity for ' + line.product.name">
                        <button type="button" (click)="cart.changeQuantity(line.product.id, -1)" [attr.aria-label]="'Decrease ' + line.product.name + ' quantity'">
                          <ui-icon name="minus" [size]="12" />
                        </button>
                        <span aria-live="polite" [attr.aria-label]="'Quantity ' + line.quantity">{{ line.quantity }}</span>
                        <button type="button" (click)="cart.changeQuantity(line.product.id, 1)" [disabled]="line.quantity >= line.product.stock" [attr.aria-label]="'Increase ' + line.product.name + ' quantity'">
                          <ui-icon name="plus" [size]="12" />
                        </button>
                      </div>
                      <strong class="line-total">\${{ line.lineTotal.toFixed(2) }}</strong>
                    </div>
                  </div>
                </article>
              }
            </div>
          }
        </div>

        <footer class="order-summary">
          <div class="summary-line"><span>Subtotal</span><span>\${{ cart.subtotal().toFixed(2) }}</span></div>
          <div class="summary-line"><span>Delivery</span><span [class.free]="cart.shipping() === 0">{{ cart.shipping() === 0 ? 'Free' : '$' + cart.shipping().toFixed(2) }}</span></div>
          <div class="summary-line total"><span>Total</span><strong>\${{ cart.total().toFixed(2) }}</strong></div>
          <button class="checkout-button" type="button" [disabled]="cart.isEmpty()" (click)="checkout()">
            Secure checkout <span>\${{ cart.total().toFixed(2) }}</span>
          </button>
          <p class="secure-note"><ui-icon name="lock" [size]="12" /> Secure payment · Easy order tracking</p>
        </footer>
      </aside>
    </div>
  `,
  styles: [`
    :host { position: fixed; inset: 0; z-index: 1000; }
    .cart-layer { position: fixed; inset: 0; }
    .cart-backdrop { animation: backdrop-in 220ms ease-out both; backdrop-filter: blur(3px); background: rgba(15, 23, 19, .61); border: 0; cursor: default; inset: 0; padding: 0; position: absolute; width: 100%; }
    .cart-panel { animation: drawer-in 360ms cubic-bezier(.22,.85,.32,1) both; background: #fffdf9; box-shadow: -24px 0 70px rgba(9, 27, 19, .24); display: grid; grid-template-rows: auto minmax(0, 1fr) auto; height: 100%; max-width: 480px; outline: none; position: absolute; right: 0; top: 0; width: min(41vw, 480px); }
    .drawer-header { align-items: flex-start; border-bottom: 1px solid #e7e4dc; display: flex; justify-content: space-between; padding: 27px 28px 22px; }
    .eyebrow { color: #8a6f4f; font-size: 10px; font-weight: 800; letter-spacing: .12em; margin: 0 0 8px; text-transform: uppercase; }
    .title-row { align-items: baseline; display: flex; flex-wrap: wrap; gap: 8px 11px; }
    h2 { color: var(--color-text); font-family: var(--font-heading); font-size: 28px; line-height: 1; margin: 0; }
    .item-count { color: #6e7772; font-size: 12px; }
    .full-cart-link { align-items: center; color: var(--color-accent); display: inline-flex; font-size: 10.5px; font-weight: 750; gap: 4px; margin-left: 3px; text-decoration: none; }
    .full-cart-link:hover { color: var(--color-accent-hover); text-decoration: underline; text-underline-offset: 3px; }
    .close-button { align-items: center; background: #f2f0e9; border: 1px solid transparent; border-radius: 50%; color: #243129; cursor: pointer; display: flex; height: 38px; justify-content: center; transition: background 160ms, transform 160ms; width: 38px; }
    .close-button:hover { background: #e8e5dc; transform: rotate(4deg); }
    .close-button:focus-visible, button:focus-visible, a:focus-visible { outline: 3px solid rgba(26, 102, 68, .28); outline-offset: 2px; }
    .drawer-body { min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 0 28px 24px; }
    .shipping-progress, .shipping-earned { background: var(--color-accent-soft); border: 1px solid var(--color-accent-soft-strong); border-radius: 11px; margin: 20px 0 4px; padding: 13px 14px; }
    .shipping-copy { align-items: center; color: #4e5c55; display: flex; font-size: 11.5px; gap: 8px; }
    .shipping-copy strong { color: var(--color-accent); }
    .progress-track { background: #d9e3dc; border-radius: 99px; height: 4px; margin-top: 10px; overflow: hidden; }
    .progress-track span { background: var(--color-accent); border-radius: inherit; display: block; height: 100%; transition: width 220ms ease; }
    .shipping-earned { align-items: center; color: var(--color-accent); display: flex; font-size: 11.5px; font-weight: 700; gap: 7px; }
    .cart-lines { display: grid; }
    .cart-line { display: grid; gap: 15px; grid-template-columns: 88px minmax(0,1fr); padding: 22px 0; }
    .cart-line + .cart-line { border-top: 1px solid #ebe8e1; }
    .product-image { align-items: center; background: linear-gradient(145deg,#ece9df,#dfddd3); border-radius: 11px; color: #7a7469; display: flex; height: 104px; justify-content: center; overflow: hidden; text-align: center; }
    .product-image img { height: 100%; object-fit: cover; width: 100%; }
    .product-image span { font-size: 9px; font-weight: 700; line-height: 1.3; padding: 8px; text-transform: uppercase; }
    .line-content { display: flex; flex-direction: column; min-width: 0; }
    .line-top { align-items: flex-start; display: flex; justify-content: space-between; gap: 10px; }
    .product-name { color: #233029; display: block; font-size: 13.5px; font-weight: 750; line-height: 1.35; overflow: hidden; text-decoration: none; text-overflow: ellipsis; white-space: nowrap; }
    .seller-name { color: #7b837f; display: block; font-size: 10.5px; margin-top: 4px; }
    .unit-price { color: #68726d; font-size: 11px; margin-top: 9px; }
    .remove-button { align-items: center; background: transparent; border: 0; border-radius: 6px; color: #9b8d80; cursor: pointer; display: flex; flex: 0 0 auto; height: 28px; justify-content: center; padding: 0; width: 28px; }
    .remove-button:hover { background: #f6eae5; color: #9d3d30; }
    .line-bottom { align-items: center; display: flex; justify-content: space-between; margin-top: auto; padding-top: 13px; }
    .quantity-control { align-items: center; border: 1px solid #d9d8d0; border-radius: 8px; display: flex; height: 32px; overflow: hidden; }
    .quantity-control button { align-items: center; background: transparent; border: 0; color: #344039; cursor: pointer; display: flex; height: 100%; justify-content: center; width: 31px; }
    .quantity-control button:hover { background: #f1f2ed; }
    .quantity-control button:disabled { cursor: not-allowed; opacity: .35; }
    .quantity-control > span { border-left: 1px solid #e4e2dc; border-right: 1px solid #e4e2dc; font-size: 11px; font-weight: 750; min-width: 31px; text-align: center; }
    .line-total { color: var(--color-text); font-size: 13px; }
    .order-summary { background: var(--color-surface); border-top: 1px solid var(--color-border); box-shadow: 0 -8px 22px rgba(64,44,34,.05); padding: 12px 24px 14px; }
    .summary-line { color: var(--color-muted); display: flex; font-size: 11px; justify-content: space-between; margin-bottom: 5px; }
    .summary-line.total { border-top: 1px solid var(--color-border); color: var(--color-text); font-size: 13px; margin: 9px 0 10px; padding-top: 9px; }
    .summary-line.total strong { font-size: 16px; }
    .free { color: var(--color-accent); font-weight: 750; }
    .checkout-button { align-items: center; background: var(--color-accent); border: 0; border-radius: 8px; color: white; cursor: pointer; display: flex; font-size: 12px; font-weight: 800; justify-content: space-between; min-height: 42px; padding: 0 15px; transition: background 160ms, transform 160ms; width: 100%; }
    .checkout-button:hover:not(:disabled) { background: var(--color-accent-hover); transform: translateY(-1px); }
    .checkout-button:disabled { cursor: not-allowed; opacity: .45; }
    .secure-note { align-items: center; color: var(--color-muted-2); display: flex; font-size: 9px; gap: 5px; justify-content: center; margin: 7px 0 0; }
    .empty-state { align-items: center; display: flex; flex-direction: column; min-height: 100%; justify-content: center; padding: 60px 20px; text-align: center; }
    .empty-icon { align-items: center; background: var(--color-accent-soft); border-radius: 50%; color: var(--color-accent); display: flex; height: 68px; justify-content: center; width: 68px; }
    .empty-state h3 { color: #223029; font-family: var(--font-heading); font-size: 21px; margin: 20px 0 8px; max-width: 270px; }
    .empty-state p { color: #717b75; font-size: 12px; line-height: 1.6; margin: 0 0 22px; max-width: 280px; }
    .secondary-action { background: transparent; border: 1px solid var(--color-accent); border-radius: 8px; color: var(--color-accent); cursor: pointer; font-size: 12px; font-weight: 750; padding: 11px 18px; }
    .sr-only { clip: rect(0,0,0,0); clip-path: inset(50%); height: 1px; overflow: hidden; position: absolute; white-space: nowrap; width: 1px; }
    @keyframes backdrop-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes drawer-in { from { opacity: .85; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
    @keyframes backdrop-out { from { opacity: 1; } to { opacity: 0; } }
    @keyframes drawer-out { from { opacity: 1; transform: translateX(0); } to { opacity: .85; transform: translateX(100%); } }
    .backdrop-leave { animation: backdrop-out 200ms ease-in both; }
    .panel-leave { animation: drawer-out 240ms cubic-bezier(.4,0,.68,.15) both; }
    @media (max-width: 720px) {
      .cart-backdrop { background: rgba(12,22,17,.56); }
      .cart-panel { animation-name: sheet-in; border-radius: 20px 20px 0 0; bottom: 0; height: min(88dvh, 760px); max-width: none; top: auto; width: 100%; }
      .cart-panel::before { background: #d3d1ca; border-radius: 99px; content: ''; height: 4px; left: 50%; position: absolute; top: 9px; transform: translateX(-50%); width: 42px; }
      .drawer-header { padding: 27px 20px 18px; }
      .drawer-body { padding: 0 20px 20px; }
      .order-summary { padding: 11px 16px max(12px, env(safe-area-inset-bottom)); }
      .cart-line { grid-template-columns: 76px minmax(0,1fr); gap: 12px; padding: 18px 0; }
      .product-image { height: 92px; }
      @keyframes sheet-in { from { opacity: .9; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
      @keyframes sheet-out { from { opacity: 1; transform: translateY(0); } to { opacity: .9; transform: translateY(100%); } }
      .panel-leave { animation-name: sheet-out; }
    }
    @media (prefers-reduced-motion: reduce) {
      .cart-backdrop, .cart-panel, .backdrop-leave, .panel-leave { animation-duration: 1ms; }
    }
  `],
})
export class CartDrawerComponent implements AfterViewInit, OnDestroy {
  @Output() readonly closed = new EventEmitter<void>();
  @ViewChild('panel') private readonly panel?: ElementRef<HTMLElement>;
  @ViewChild('closeButton') private readonly closeButton?: ElementRef<HTMLButtonElement>;

  protected readonly cart = inject(CartService);
  private readonly router = inject(Router);
  private readonly previousOverflow = document.body.style.overflow;
  private readonly previousPaddingRight = document.body.style.paddingRight;

  protected get shippingProgress(): number {
    return Math.min(100, (this.cart.subtotal() / 50) * 100);
  }

  constructor() {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.closeButton?.nativeElement.focus());
  }

  ngOnDestroy(): void {
    document.body.style.overflow = this.previousOverflow;
    document.body.style.paddingRight = this.previousPaddingRight;
  }

  protected requestClose(): void {
    this.closed.emit();
  }

  protected continueShopping(): void {
    this.requestClose();
    void this.router.navigateByUrl('/products');
  }

  protected checkout(): void {
    if (this.cart.isEmpty()) return;
    this.requestClose();
    void this.router.navigateByUrl('/checkout');
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.requestClose();
      return;
    }
    if (event.key !== 'Tab' || !this.panel) return;

    const focusable = Array.from(this.panel.nativeElement.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => !element.hasAttribute('hidden'));
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
