import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import {
  BuyerSession, MarketplaceOrder, RentifyMarketplaceService,
  RentifyProduct, RentifyStore, StoreCart,
} from '../core/rentify/rentify-marketplace.service';

function message(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    return error.error?.error || error.error?.message || `Request failed (${error.status})`;
  }
  return error instanceof Error ? error.message : 'Request failed';
}

function initialTab(): 'catalog' | 'cart' | 'orders' {
  const path = globalThis.location.pathname;
  if (/^\/(cart|checkout)(\/|$)/.test(path)) return 'cart';
  if (/^\/orders(\/|$)/.test(path)) return 'orders';
  return 'catalog';
}

@Component({
  selector: 'app-rentify-preview',
  imports: [FormsModule],
  template: `
    <main class="pilot">
      <header class="top">
        <div><p class="eyebrow">Rentify marketplace pilot</p><h1>Shop Cambodian merchants</h1></div>
        @if (api.merchantDashboard) { <a [href]="api.merchantDashboard">Merchant dashboard</a> }
        @if (api.enabled && api.configured) { <div class="account">
          @if (buyer(); as user) {
            <span>{{ user.name }}</span><button type="button" (click)="signOut()">Sign out</button>
          } @else {
            <a [href]="api.authLink('login')">Sign in</a>
            <a [href]="api.authLink('signup')">Create account</a>
          }
        </div> }
      </header>
      @if (!api.enabled || !api.configured) {
        <section class="notice">This Rentify checkout preview is disabled in this environment.</section>
      } @else {
        <nav class="tabs" aria-label="Marketplace sections">
          <button type="button" [class.active]="tab() === 'catalog'" (click)="tab.set('catalog')">Products</button>
          <button type="button" [class.active]="tab() === 'cart'" (click)="tab.set('cart')">Cart ({{ itemCount() }})</button>
          <button type="button" [class.active]="tab() === 'orders'" (click)="tab.set('orders')">My orders</button>
        </nav>
        @if (notice()) { <p class="notice" role="status">{{ notice() }}</p> }
        @if (busy()) { <p role="status">Working…</p> }
        @if (tab() === 'catalog') {
          <section>
            <h2>Available products</h2>
            @if (!products().length) { <p>No approved products are available yet.</p> }
            <div class="products">
              @for (product of products(); track product.id) {
                <article class="card">
                  @if (product.images[0]) { <img [src]="product.images[0].url" [alt]="product.name" /> }
                  <div class="body"><p class="eyebrow">{{ storeName(product.storeId) }} · {{ product.category }}</p>
                    <h3>{{ product.name }}</h3><p>{{ product.description }}</p>
                    <div class="buy"><strong>\${{ product.price }}</strong>
                      <button type="button" [disabled]="busy() || product.stockQuantity === 0"
                        (click)="add(product)">{{ product.stockQuantity === 0 ? 'Sold out' : 'Add to cart' }}</button>
                    </div>
                  </div>
                </article>
              }
            </div>
            @if (products().length < totalProducts()) {
              <button type="button" [disabled]="busy()" (click)="loadMore()">Load more</button>
            }
          </section>
        }
        @if (tab() === 'cart') {
          <section><h2>Your cart</h2>
            @if (!buyer()) { <p><a [href]="api.authLink('login')">Sign in</a> to add products and place a COD order.</p> }
            @if (buyer() && !carts().length) { <p>Your cart is empty.</p> }
            @for (cart of carts(); track cart.storeId) {
              <article class="card cart">
                <h3>{{ storeName(cart.storeId) }}</h3>
                @for (item of cart.items; track item.productId) {
                  <div class="line"><span>{{ productName(item.productId) }}</span>
                    <span>\${{ item.currentPrice || '—' }}</span>
                    <div class="quantity">
                      <button type="button" [disabled]="busy()" (click)="change(cart, item.productId, item.quantity - 1)">−</button>
                      <span>{{ item.quantity }}</span>
                      <button type="button" [disabled]="busy()" (click)="change(cart, item.productId, item.quantity + 1)">+</button>
                    </div>
                  </div>
                }
                <p>Products: \${{ cart.subtotal }} · Delivery: \${{ cart.deliveryFee || '—' }}</p>
                <p class="total">Cash on delivery: \${{ cart.totalAmount || '—' }}</p>
                @for (issue of cart.issues; track issue) { <p class="error">{{ issue }}</p> }
                @if (cart.checkoutReady && cart.totalAmount) {
                  <form (ngSubmit)="placeOrder(cart)" class="checkout">
                    <label>Recipient name<input name="name" required [(ngModel)]="name" /></label>
                    <label>Phone<input name="phone" required [(ngModel)]="phone" /></label>
                    <label>Delivery address<input name="address" required [(ngModel)]="address" /></label>
                    <button [disabled]="busy()" type="submit">Place {{ storeName(cart.storeId) }} COD order</button>
                  </form>
                }
              </article>
            }
          </section>
        }
        @if (tab() === 'orders') {
          <section><h2>My marketplace orders</h2>
            @if (!buyer()) { <p><a [href]="api.authLink('login')">Sign in</a> to view your orders.</p> }
            @if (buyer() && !orders().length) { <p>No orders yet.</p> }
            @for (order of orders(); track order.id) {
              <article class="card order"><h3>{{ storeName(order.storeId) }} · {{ order.orderNumber || order.id }}</h3>
                <p>Delivery: {{ order.deliveryStatus }} · Payment: {{ order.payment?.status || 'pending' }}</p>
                @for (item of order.items; track item.productId) {
                  <p>{{ item.quantity }} × {{ item.name }} · \${{ item.total }}</p>
                }
                <p class="total">COD total: \${{ order.totalAmount }} (includes \${{ order.deliveryFee }} delivery)</p>
                <form (ngSubmit)="report(order, 'complaint')" class="report">
                  <label>Reason for a complaint or return request
                    <input name="reason-{{ order.id }}" required [(ngModel)]="reportReasons[order.id]" />
                  </label>
                  <button type="submit" [disabled]="busy()">Report a problem</button>
                  <button type="button" [disabled]="busy()" (click)="report(order, 'return_requested')">Request a return</button>
                </form>
              </article>
            }
          </section>
        }
      }
    </main>
  `,
  styles: [`
    .pilot { max-width: 1180px; margin: auto; padding: 24px; color: #172033; }
    .top, .account, .tabs, .buy, .line, .quantity { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .top { flex-wrap: wrap; } .top h1 { font-size: 30px; margin: 0; }
    .eyebrow { color: #405c8b; font-size: 12px; font-weight: 700; }
    .account a, .account button, .tabs button, .pilot button { cursor: pointer; }
    .tabs { justify-content: start; margin: 28px 0; border-bottom: 1px solid #d7deea; }
    .tabs button { padding: 12px 16px; border: 0; background: transparent; }
    .tabs button.active { border-bottom: 3px solid #1d4ed8; font-weight: 700; }
    .notice { padding: 12px; margin: 16px 0; border-radius: 8px; background: #eaf2ff; }
    .products { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 18px; }
    .card { border: 1px solid #d7deea; border-radius: 14px; background: white; overflow: hidden; margin: 12px 0; }
    .card img { width: 100%; height: 190px; object-fit: cover; }
    .body, .cart, .order { padding: 18px; } .body h3, .card h3 { margin: 6px 0; }
    .buy { margin-top: 16px; } .buy button, .checkout button, .report button { background: #1d4ed8; color: white; padding: 9px 14px; border: 0; border-radius: 8px; }
    button:disabled { opacity: .55; cursor: not-allowed; }
    .line { padding: 12px 0; border-bottom: 1px solid #e7ebf1; }
    .quantity button { border: 1px solid #d7deea; background: white; width: 28px; height: 28px; }
    .total { font-weight: 700; } .error { color: #b91c1c; }
    .checkout, .report { display: flex; flex-wrap: wrap; align-items: end; gap: 12px; margin-top: 20px; }
    .checkout label, .report label { display: grid; gap: 5px; min-width: 180px; flex: 1; }
    input { padding: 9px; border: 1px solid #bdc7d7; border-radius: 7px; }
    @media (max-width: 680px) { .line { flex-wrap: wrap; } .checkout, .report { display: grid; } }
  `],
})
export class RentifyPreviewComponent {
  protected readonly api = inject(RentifyMarketplaceService);
  protected readonly tab = signal<'catalog' | 'cart' | 'orders'>(initialTab());
  protected readonly busy = signal(false);
  protected readonly notice = signal('');
  protected readonly buyer = signal<BuyerSession | null>(null);
  protected readonly products = signal<RentifyProduct[]>([]);
  protected readonly stores = signal<Record<string, RentifyStore>>({});
  protected readonly carts = signal<StoreCart[]>([]);
  protected readonly orders = signal<MarketplaceOrder[]>([]);
  protected readonly totalProducts = signal(0);
  protected name = '';
  protected phone = '';
  protected address = '';
  protected reportReasons: Record<string, string> = {};
  private page = 1;
  private readonly productDetails = signal<Record<string, RentifyProduct>>({});

  constructor() { if (this.api.enabled && this.api.configured) void this.start(); }

  private async start() {
    try {
      await this.loadProducts(1);
      try {
        const { user } = await firstValueFrom(this.api.session());
        this.buyer.set(user);
        this.name = user.name || '';
        this.phone = user.phoneNumber || '';
        await this.refreshBuyer();
      } catch (error) {
        if (!(error instanceof HttpErrorResponse && error.status === 401)) throw error;
      }
    } catch (error) { this.notice.set(message(error)); }
  }

  private async profiles(ids: string[]) {
    const missing = [...new Set(ids)].filter((id) => id && !this.stores()[id]);
    for (let i = 0; i < missing.length; i += 60) {
      const response = await firstValueFrom(this.api.stores(missing.slice(i, i + 60)));
      this.stores.update((current) => ({ ...current,
        ...Object.fromEntries(response.data.map((store) => [store.id, store])) }));
    }
  }

  private async loadProducts(page: number) {
    const response = await firstValueFrom(this.api.products(page));
    this.products.update((current) => page === 1 ? response.products : [...current, ...response.products]);
    this.totalProducts.set(response.total);
    this.page = page;
    this.productDetails.update((current) => ({ ...current,
      ...Object.fromEntries(response.products.map((product) => [product.id, product])) }));
    await this.profiles(response.products.map((product) => product.storeId));
  }

  protected async loadMore() {
    this.busy.set(true);
    try { await this.loadProducts(this.page + 1); }
    catch (error) { this.notice.set(message(error)); }
    finally { this.busy.set(false); }
  }

  private async refreshBuyer() {
    const [carts, orders] = await Promise.all([
      firstValueFrom(this.api.carts()), firstValueFrom(this.api.orders()),
    ]);
    this.carts.set(carts.carts);
    this.orders.set(orders.orders);
    await this.profiles([...carts.carts.map((cart) => cart.storeId),
      ...orders.orders.map((order) => order.storeId)]);
    const missing = carts.carts.flatMap((cart) => cart.items.map((item) => item.productId))
      .filter((id) => !this.productDetails()[id]);
    await Promise.all([...new Set(missing)].map(async (id) => {
      try {
        const product = await firstValueFrom(this.api.product(id));
        this.productDetails.update((current) => ({ ...current, [id]: product }));
      } catch { /* An unpublished cart item remains visible as unavailable. */ }
    }));
  }

  protected itemCount() { return this.carts().reduce((count, cart) =>
    count + cart.items.reduce((sum, item) => sum + item.quantity, 0), 0); }
  protected storeName(id: string) { return this.stores()[id]?.name || 'Store'; }
  protected productName(id: string) { return this.productDetails()[id]?.name || 'Unavailable product'; }

  protected async add(product: RentifyProduct) {
    if (!this.buyer()) { globalThis.location.href = this.api.authLink('login'); return; }
    if (!this.buyer()?.isVerified) { this.notice.set('Verify your Rentify account before ordering.'); return; }
    const current = this.carts().find((cart) => cart.storeId === product.storeId)?.items
      .find((item) => item.productId === product.id)?.quantity || 0;
    await this.changeQuantity(product.storeId, product.id, current + 1);
    this.tab.set('cart');
  }

  protected async change(cart: StoreCart, productId: string, quantity: number) {
    await this.changeQuantity(cart.storeId, productId, quantity);
  }

  private async changeQuantity(storeId: string, productId: string, quantity: number) {
    this.busy.set(true);
    this.notice.set('');
    try {
      await firstValueFrom(this.api.setQuantity(storeId, productId, quantity));
      await this.refreshBuyer();
    } catch (error) { this.notice.set(message(error)); }
    finally { this.busy.set(false); }
  }

  protected async placeOrder(cart: StoreCart) {
    if (!cart.totalAmount || !cart.checkoutReady || !this.name.trim() || !this.phone.trim() || !this.address.trim()) return;
    const lines = cart.items.map((item) => [item.productId, item.quantity, item.currentPrice])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    const fingerprint = JSON.stringify([cart.storeId, lines, cart.deliveryFee, cart.totalAmount,
      this.name.trim(), this.phone.trim(), this.address.trim()]);
    const storageKey = `rentify-marketplace-checkout:${cart.storeId}`;
    let saved: { fingerprint: string; key: string } | null = null;
    try { saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null'); } catch { /* New key below. */ }
    const key = saved?.fingerprint === fingerprint ? saved.key : crypto.randomUUID();
    sessionStorage.setItem(storageKey, JSON.stringify({ fingerprint, key }));
    this.busy.set(true);
    this.notice.set('');
    try {
      const { order } = await firstValueFrom(this.api.checkout(cart.storeId, cart.totalAmount,
        this.name.trim(), this.phone.trim(), this.address.trim(), key));
      sessionStorage.removeItem(storageKey);
      await this.refreshBuyer();
      this.tab.set('orders');
      this.notice.set(`Order ${order.orderNumber || order.id} placed. Pay ${order.totalAmount} on delivery.`);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409) sessionStorage.removeItem(storageKey);
      this.notice.set(message(error));
      await this.refreshBuyer().catch(() => {});
    } finally { this.busy.set(false); }
  }

  protected async report(order: MarketplaceOrder, type: 'complaint' | 'return_requested') {
    const reason = this.reportReasons[order.id]?.trim();
    if (!reason) { this.notice.set('Enter a reason first.'); return; }
    const storageKey = `rentify-marketplace-report:${order.id}:${type}`;
    let saved: { reason: string; key: string } | null = null;
    try { saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null'); } catch { /* New key below. */ }
    const key = saved?.reason === reason ? saved.key : crypto.randomUUID();
    sessionStorage.setItem(storageKey, JSON.stringify({ reason, key }));
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.report(order.id, type, reason, key));
      sessionStorage.removeItem(storageKey);
      this.reportReasons[order.id] = '';
      this.notice.set(type === 'complaint' ? 'Complaint submitted.' : 'Return request submitted.');
    } catch (error) { this.notice.set(message(error)); }
    finally { this.busy.set(false); }
  }

  protected async signOut() {
    try { await firstValueFrom(this.api.logout()); }
    catch (error) { this.notice.set(message(error)); return; }
    this.buyer.set(null);
    this.carts.set([]);
    this.orders.set([]);
    this.tab.set('catalog');
  }
}
