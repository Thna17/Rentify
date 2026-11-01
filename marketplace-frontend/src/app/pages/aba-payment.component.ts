import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { IconComponent } from '../components/shared/ui/icon/icon.component';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { TranslateService } from '../core/i18n/translate.service';
import { MarketplaceOrder, RentifyMarketplaceService } from '../core/rentify/rentify-marketplace.service';

const POLL_FAST_MS = 3_000;
const POLL_SLOW_MS = 10_000;
const POLL_FAST_WINDOW_MS = 2 * 60_000;

interface KhqrSession {
  orderId: string;
  orderNumber: string;
  storeName?: string;
  amount: number;
  currency: string;
  qrImage: string;
  qrString: string;
  checkoutUrl?: string;
  expiresAt: string;
  paymentId?: string;
}

@Component({
  selector: 'app-khqr-payment',
  standalone: true,
  imports: [IconComponent, RouterLink, TranslatePipe],
  template: `
    <section class="page">
      <div class="card">
        @if (loading()) {
          <div class="skeleton qr-skel" aria-hidden="true"></div>
          <p class="muted" role="status">{{ 'aba.loading' | translate }}</p>
        } @else if (fatal()) {
          <ui-icon name="alert-circle" [size]="28" />
          <h1>{{ 'pay.errorTitle' | translate }}</h1>
          <p class="muted">{{ fatal() }}</p>
          <div class="row">
            <button type="button" class="btn primary" (click)="open()">{{ 'pay.tryAgain' | translate }}</button>
            <a class="btn" routerLink="/orders">{{ 'pay.myOrders' | translate }}</a>
          </div>
        } @else if (session(); as qr) {
          <p class="eyebrow">{{ qr.storeName || ('checkout.title' | translate) }} · {{ 'aba.forOrder' | translate }} #{{ qr.orderNumber }}</p>
          <p class="amount">\${{ qr.amount.toFixed(2) }} <span>{{ qr.currency }}</span></p>

          <div class="qr" [class.expired]="expired()">
            <img [src]="qr.qrImage" [alt]="'aba.qrAlt' | translate" />
            @if (expired()) {
              <div class="veil">
                <strong>{{ 'pay.expiredTitle' | translate }}</strong>
                <p class="muted-light">{{ 'pay.expiredDesc' | translate }}</p>
                <a class="btn primary sm" routerLink="/checkout">{{ 'pay.newCode' | translate }}</a>
              </div>
            }
          </div>

          @if (!expired()) {
            <p class="status" role="status">
              <span class="dot" [class.busy]="checking()"></span>
              {{ (checking() ? 'aba.checking' : 'pay.waiting') | translate }}
            </p>
            <p class="muted timer-text">
              {{ 'pay.expiresIn' | translate }} <span class="timer">{{ remaining() }}</span>
            </p>

            @if (checkError()) {
              <p class="note">{{ checkError() }}</p>
            }

            @if (qr.checkoutUrl) {
              <a class="btn primary block" [href]="qr.checkoutUrl" target="_blank" rel="noopener">
                {{ 'pay.openApp' | translate }}
              </a>
            }

            <div class="links">
              <button type="button" class="link" [disabled]="checking()" (click)="check(true)">
                {{ 'pay.checkNow' | translate }}
              </button>
              <span class="sep">·</span>
              <button type="button" class="link" (click)="copy(qr.qrString)">
                {{ (copied() ? 'pay.copied' : 'pay.copyCode') | translate }}
              </button>
            </div>
          }

          <div class="trouble-card">
            <h3>{{ 'pay.troubleTitle' | translate }}</h3>
            <div class="trouble-item">
              <strong>{{ 'pay.errorTitle' | translate }}</strong>
              <p class="meta">{{ 'pay.errorDesc' | translate }}</p>
              <div class="trouble-actions">
                <button type="button" class="btn sm" (click)="check(true)">{{ 'pay.tryAgain' | translate }}</button>
                <a class="btn sm ghost" routerLink="/orders">{{ 'pay.myOrders' | translate }}</a>
              </div>
            </div>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .page { min-height: calc(100dvh - 160px); display: grid; place-items: center; padding: 32px var(--page-gutter, 16px); }
    .card {
      width: min(100%, 420px); display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px;
      padding: 28px 24px 22px; border-radius: var(--radius-xl, 20px); background: var(--color-surface); box-shadow: var(--shadow-lg);
    }
    h1 { margin: 6px 0 0; font-size: 18px; color: var(--color-text); }
    h3 { margin: 0 0 6px; font-size: 13px; font-weight: 600; color: var(--color-text); text-align: left; }
    .eyebrow { margin: 0; font-size: 12px; font-weight: 600; letter-spacing: .04em; color: var(--color-muted); }
    .amount { margin: 4px 0 0; font-size: 34px; font-weight: 700; letter-spacing: -.02em; color: var(--color-text); }
    .amount span { font-size: 15px; font-weight: 500; color: var(--color-muted); }
    .muted { margin: 0; font-size: 13px; color: var(--color-text-secondary); }
    .muted-light { margin: 0; font-size: 12px; color: #fff; }
    .timer-text { margin-top: -4px; font-size: 12.5px; }
    .qr { position: relative; margin: 12px 0 6px; width: 232px; height: 232px; padding: 10px; border-radius: 16px; background: var(--color-bg); }
    .qr img { width: 100%; height: 100%; object-fit: contain; }
    .qr.expired img { filter: blur(6px); opacity: .35; }
    .veil { position: absolute; inset: 0; display: grid; place-content: center; gap: 8px; background: rgba(0, 0, 0, 0.45); border-radius: 16px; color: #fff; }
    .skeleton.qr-skel { width: 232px; height: 232px; margin: 14px 0 8px; border-radius: 16px; background: var(--color-bg-alt); animation: pulse 1.4s ease-in-out infinite; }
    @keyframes pulse { 50% { opacity: .55; } }
    .status { display: inline-flex; align-items: center; gap: 6px; margin: 4px 0 2px; font-size: 13px; color: var(--color-text-secondary); }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-success, #2f7a4f); }
    .dot.busy { animation: pulse .8s ease-in-out infinite; }
    .timer { font-variant-numeric: tabular-nums; font-weight: 600; }
    .note { margin: 0 0 6px; font-size: 12.5px; color: var(--color-danger, #c2261c); }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 18px; border: 0;
      border-radius: var(--radius-md, 12px); background: var(--color-bg-alt); color: var(--color-text); font-size: 14px;
      font-weight: 600; text-decoration: none; cursor: pointer;
    }
    .btn.primary { background: var(--color-forest, #0E6EE6); color: #fff; }
    .btn.sm { min-height: 36px; padding: 0 12px; font-size: 12.5px; }
    .btn.ghost { background: transparent; border: 1px solid var(--color-border, #e2e8f0); }
    .btn.block { width: 100%; margin-top: 6px; }
    .row { display: flex; gap: 8px; margin-top: 10px; }
    .links { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 6px; font-size: 13px; }
    .link { min-height: 40px; padding: 0 6px; border: 0; background: none; color: var(--color-forest, #0E6EE6); font-weight: 600; cursor: pointer; }
    .link:disabled { opacity: .5; cursor: default; }
    .sep { color: var(--color-muted); }
    .trouble-card { width: 100%; margin-top: 16px; padding: 12px; border-radius: 12px; border: 1px solid var(--color-border, #e2e8f0); background: var(--color-bg-alt, #f8fafc); text-align: left; }
    .trouble-item { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
    .meta { font-size: 11.5px; color: var(--color-muted); margin: 0; }
    .trouble-actions { display: flex; gap: 6px; margin-top: 6px; }
    @media (prefers-reduced-motion: reduce) { .skeleton.qr-skel, .dot.busy { animation: none; } }
  `],
})
export class AbaPaymentComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly rentify = inject(RentifyMarketplaceService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly session = signal<KhqrSession | null>(null);
  protected readonly loading = signal(true);
  protected readonly checking = signal(false);
  protected readonly fatal = signal('');
  protected readonly checkError = signal('');
  protected readonly copied = signal(false);
  private readonly now = signal(Date.now());

  protected readonly expired = computed(() => {
    const qr = this.session();
    return qr ? this.now() >= Date.parse(qr.expiresAt) : false;
  });
  protected readonly remaining = computed(() => {
    const qr = this.session();
    const ms = qr ? Math.max(0, Date.parse(qr.expiresAt) - this.now()) : 0;
    const m = Math.floor(ms / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    return `${m}:${String(s).padStart(2, '0')}`;
  });

  private readonly orderId = this.route.snapshot.paramMap.get('orderId') || '';
  private startedAt = Date.now();
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly clock = setInterval(() => this.now.set(Date.now()), 1000);

  constructor() {
    this.destroyRef.onDestroy(() => {
      clearInterval(this.clock);
      if (this.pollTimer) clearTimeout(this.pollTimer);
    });
  }

  ngOnInit(): void {
    if (!this.orderId) {
      this.loading.set(false);
      this.fatal.set(this.translate.t('aba.missingOrder'));
      return;
    }
    void this.open();
  }

  protected async open(): Promise<void> {
    this.loading.set(true);
    this.fatal.set('');
    this.checkError.set('');
    try {
      const res = await firstValueFrom(this.rentify.order(this.orderId));
      const order = res.order;
      if (!order) {
        this.fatal.set(this.translate.t('aba.missingOrder'));
        return;
      }

      if (order.paymentStatus === 'paid' || order.status === 'completed' || order.payment?.status === 'paid' || order.payment?.status === 'completed') {
        await this.goToSuccess(order.orderNumber);
        return;
      }

      const rawQR = order.payment?.rawQR || '';
      const qrImage = rawQR
        ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(rawQR)}`
        : '';
      const totalNum = parseFloat(order.totalAmount) || 0;
      const createdAt = order.createdAt ? new Date(order.createdAt).getTime() : Date.now();
      const expiresAt = new Date(createdAt + 15 * 60 * 1000).toISOString();

      this.session.set({
        orderId: order.id,
        orderNumber: order.orderNumber || order.id.slice(0, 8),
        storeName: order.storeName,
        amount: totalNum,
        currency: 'USD',
        qrImage,
        qrString: rawQR,
        checkoutUrl: order.payment?.qrCodeUrl || undefined,
        expiresAt,
        paymentId: order.payment?.id,
      });

      this.startedAt = Date.now();
      this.schedulePoll();
    } catch (err: any) {
      this.fatal.set(this.translate.t(err?.status === 404 ? 'aba.disabled' : 'aba.openFailed'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async check(userAsked: boolean): Promise<boolean> {
    if (this.checking()) return false;
    this.checking.set(true);
    try {
      const paymentId = this.session()?.paymentId;
      if (paymentId && typeof this.rentify.checkPaymentStatus === 'function') {
        const paymentRes = await firstValueFrom(this.rentify.checkPaymentStatus(paymentId));
        if (paymentRes?.status === 'paid' || paymentRes?.status === 'completed') {
          await this.goToSuccess(this.session()?.orderNumber);
          return true;
        }
      }

      const orderRes = await firstValueFrom(this.rentify.order(this.orderId));
      const order = orderRes.order;
      if (order?.paymentStatus === 'paid' || order?.status === 'completed') {
        await this.goToSuccess(order.orderNumber);
        return true;
      }

      if (order?.status === 'cancelled' || order?.payment?.status === 'expired') {
        this.checkError.set(this.translate.t('pay.expiredTitle'));
        return false;
      }

      if (userAsked) {
        this.checkError.set(this.translate.t('aba.notYet'));
      }
      return false;
    } catch {
      if (userAsked) this.checkError.set(this.translate.t('pay.errorTitle'));
      return false;
    } finally {
      this.checking.set(false);
    }
  }

  protected async copy(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // clipboard unavailable
    }
  }

  private schedulePoll(): void {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    const delay = Date.now() - this.startedAt < POLL_FAST_WINDOW_MS ? POLL_FAST_MS : POLL_SLOW_MS;
    this.pollTimer = setTimeout(async () => {
      if (this.expired()) return;
      const paid = await this.check(false);
      if (!paid) this.schedulePoll();
    }, delay);
  }

  private async goToSuccess(orderNumber?: string | null): Promise<void> {
    const order = orderNumber || this.session()?.orderNumber || 'confirmed';
    await this.router.navigate(['/order-success'], { queryParams: { orders: order, order, paid: 'khqr' } });
  }
}

export const KhqrPaymentComponent = AbaPaymentComponent;
