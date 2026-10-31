import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { IconComponent } from '../components/shared/ui/icon/icon.component';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { TranslateService } from '../core/i18n/translate.service';
import { AbaPaywayTransaction, RentifyMarketplaceService } from '../core/rentify/rentify-marketplace.service';

// Fast while the buyer is most likely paying, then slower so an idle tab doesn't hammer ABA
const POLL_FAST_MS = 5_000;
const POLL_SLOW_MS = 15_000;
const POLL_FAST_WINDOW_MS = 2 * 60_000;

/**
 * ABA PayWay KHQR payment for one marketplace order (test-only, PAYWAY_ENABLED).
 * Ported from KhmerCraft's payway-payment page. Paid is only ever what Commerce confirms
 * after asking ABA; returning from the ABA app just triggers another check.
 */
@Component({
  selector: 'app-aba-payment',
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
          <h1>{{ 'aba.errorTitle' | translate }}</h1>
          <p class="muted">{{ fatal() }}</p>
          <div class="row">
            <button type="button" class="btn primary" (click)="open()">{{ 'aba.retry' | translate }}</button>
            <a class="btn" routerLink="/orders">{{ 'aba.viewOrders' | translate }}</a>
          </div>
        } @else if (session(); as qr) {
          <p class="eyebrow">ABA PayWay · KHQR <span class="test">{{ (qr.mock ? 'aba.mockMode' : 'checkout.testMode') | translate }}</span></p>
          <p class="amount">\${{ qr.amount.toFixed(2) }} <span>{{ qr.currency }}</span></p>
          <p class="muted">{{ 'aba.forOrder' | translate }} #{{ qr.orderNumber || qr.orderId.slice(0, 8) }}</p>

          <div class="qr" [class.expired]="expired()">
            <img [src]="qr.qrImage" [alt]="'aba.qrAlt' | translate" />
            @if (expired()) {
              <div class="veil">
                <strong>{{ 'aba.expired' | translate }}</strong>
                <button type="button" class="btn primary sm" (click)="open()">{{ 'aba.newQr' | translate }}</button>
              </div>
            }
          </div>

          @if (!expired()) {
            <p class="status" role="status">
              <span class="dot" [class.busy]="checking()"></span>
              {{ (checking() ? 'aba.checking' : 'aba.waiting') | translate }}
              <span class="sep">·</span>
              <span class="timer">{{ remaining() }}</span>
            </p>
            @if (checkError()) {
              <p class="note">{{ checkError() }}</p>
            }
            @if (qr.mock) {
              <button type="button" class="btn primary block" [disabled]="checking()" (click)="approveMock()">
                {{ 'aba.mockPay' | translate }}
              </button>
            }
            @if (qr.deeplink) {
              <a class="btn primary block" [href]="qr.deeplink">{{ 'aba.openApp' | translate }}</a>
            }
            <div class="links">
              <button type="button" class="link" [disabled]="checking()" (click)="check(true)">{{ 'aba.checkNow' | translate }}</button>
              <span class="sep">·</span>
              <button type="button" class="link" (click)="copy(qr.qrString)">
                {{ (copied() ? 'aba.copied' : 'aba.copy') | translate }}
              </button>
            </div>
          }
          <p class="fine"><ui-icon name="lock" [size]="12" /> {{ 'aba.fine' | translate }}</p>
        }
      </div>
    </section>
  `,
  styles: [`
    .page { min-height: calc(100dvh - 160px); display: grid; place-items: center; padding: 32px var(--page-gutter, 16px); }
    .card {
      width: min(100%, 400px); display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px;
      padding: 28px 24px 22px; border-radius: var(--radius-xl, 20px); background: var(--color-surface); box-shadow: var(--shadow-lg);
    }
    h1 { margin: 6px 0 0; font-size: 18px; color: var(--color-text); }
    .eyebrow { margin: 0; font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--color-muted); }
    .test { margin-left: 6px; padding: 2px 8px; border-radius: var(--radius-full, 999px); background: var(--color-bg-alt); color: var(--color-text-secondary); letter-spacing: 0; text-transform: none; }
    .amount { margin: 4px 0 0; font-size: 34px; font-weight: 700; letter-spacing: -.02em; color: var(--color-text); }
    .amount span { font-size: 15px; font-weight: 500; color: var(--color-muted); }
    .muted { margin: 0; font-size: 13.5px; color: var(--color-text-secondary); }
    .qr { position: relative; margin: 14px 0 8px; width: 232px; height: 232px; padding: 10px; border-radius: 16px; background: var(--color-bg); }
    .qr img { width: 100%; height: 100%; object-fit: contain; }
    .qr.expired img { filter: blur(6px); opacity: .35; }
    .veil { position: absolute; inset: 0; display: grid; place-content: center; gap: 10px; }
    .skeleton.qr-skel { width: 232px; height: 232px; margin: 14px 0 8px; border-radius: 16px; background: var(--color-bg-alt); animation: pulse 1.4s ease-in-out infinite; }
    @keyframes pulse { 50% { opacity: .55; } }
    .status { display: inline-flex; align-items: center; gap: 6px; margin: 2px 0 8px; font-size: 13px; color: var(--color-text-secondary); }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-success, #2f7a4f); }
    .dot.busy { animation: pulse .8s ease-in-out infinite; }
    .sep { color: var(--color-muted); }
    .timer { font-variant-numeric: tabular-nums; }
    .note { margin: 0 0 6px; font-size: 12.5px; color: var(--color-danger, #c2261c); }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 18px; border: 0;
      border-radius: var(--radius-md, 12px); background: var(--color-bg-alt); color: var(--color-text); font-size: 14px;
      font-weight: 600; text-decoration: none; cursor: pointer;
    }
    .btn.primary { background: var(--color-forest); color: var(--color-bg); }
    .btn.sm { min-height: 38px; font-size: 13px; }
    .btn.block { width: 100%; }
    .row { display: flex; gap: 8px; margin-top: 10px; }
    .links { display: flex; align-items: center; gap: 8px; margin-top: 10px; font-size: 13px; }
    .link { min-height: 44px; padding: 0 4px; border: 0; background: none; color: var(--color-forest); font-weight: 600; cursor: pointer; }
    .link:disabled { opacity: .5; cursor: default; }
    .fine { display: inline-flex; align-items: center; gap: 6px; margin: 8px 0 0; font-size: 12px; color: var(--color-muted); }
    @media (prefers-reduced-motion: reduce) { .skeleton.qr-skel, .dot.busy { animation: none; } }
  `],
})
export class AbaPaymentComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly rentify = inject(RentifyMarketplaceService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly session = signal<AbaPaywayTransaction | null>(null);
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
    // Coming back from the ABA app: check first, the order may already be paid
    if (this.route.snapshot.queryParamMap.get('returned')) {
      void this.check(false).then((paid) => { if (!paid) void this.open(); });
      return;
    }
    void this.open();
  }

  protected async open(): Promise<void> {
    this.loading.set(true);
    this.fatal.set('');
    this.checkError.set('');
    try {
      const qr = await firstValueFrom(this.rentify.abaCheckout(this.orderId));
      this.session.set(qr);
      this.startedAt = Date.now();
      this.schedulePoll();
    } catch (err: any) {
      if (err?.error?.code === 'ALREADY_PAID') {
        await this.goToSuccess();
        return;
      }
      this.fatal.set(this.translate.t(err?.status === 404 ? 'aba.disabled' : 'aba.openFailed'));
    } finally {
      this.loading.set(false);
    }
  }

  /** Returns true when ABA confirmed payment. `userAsked` surfaces errors; background polls stay quiet. */
  protected async check(userAsked: boolean): Promise<boolean> {
    if (this.checking()) return false;
    this.checking.set(true);
    try {
      const status = await firstValueFrom(this.rentify.abaStatus(this.orderId));
      this.checkError.set('');
      if (status.paid) {
        await this.goToSuccess(status.orderNumber);
        return true;
      }
      if (status.paymentStatus === 'failed') this.checkError.set(this.translate.t('aba.failed'));
      else if (userAsked) this.checkError.set(this.translate.t('aba.notYet'));
      return false;
    } catch {
      if (userAsked) this.checkError.set(this.translate.t('aba.checkFailed'));
      return false;
    } finally {
      this.checking.set(false);
    }
  }

  /** Local mock only: acts as the buyer paying in the ABA app, then shows what Commerce confirmed. */
  protected async approveMock(): Promise<void> {
    if (this.checking()) return;
    this.checking.set(true);
    try {
      const status = await firstValueFrom(this.rentify.abaMockApprove(this.orderId));
      this.checkError.set('');
      if (status.paid) await this.goToSuccess(status.orderNumber);
    } catch {
      this.checkError.set(this.translate.t('aba.checkFailed'));
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
      // clipboard unavailable; nothing else to do
    }
  }

  private schedulePoll(): void {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    const delay = Date.now() - this.startedAt < POLL_FAST_WINDOW_MS ? POLL_FAST_MS : POLL_SLOW_MS;
    this.pollTimer = setTimeout(async () => {
      if (this.expired()) return; // an expired QR can't be paid; stop until a new one is opened
      const paid = await this.check(false);
      if (!paid) this.schedulePoll();
    }, delay);
  }

  private async goToSuccess(orderNumber?: string | null): Promise<void> {
    const order = orderNumber || this.session()?.orderNumber || 'confirmed';
    await this.router.navigate(['/order-success'], { queryParams: { orders: order, order, paid: 'aba' } });
  }
}
