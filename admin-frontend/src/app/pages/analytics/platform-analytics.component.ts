import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslateService } from '../../core/i18n/translate.service';
import { PlatformOperationsService } from '../../services/platform-operations.service';

@Component({
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">P5-ANA-001 · CATALOG {{catalogVersion()}}</p>
        <h1>{{ 'analytics.title' | translate }}</h1>
        <p>{{ 'analytics.subtitle' | translate }}</p>
      </div>
      <div class="period" role="group" [attr.aria-label]="'analytics.period' | translate">
        @for (value of periods; track value) {
          <button type="button" [class.active]="days() === value" (click)="load(value)">{{value}}d</button>
        }
      </div>
    </header>

    @if (loading()) {
      <section class="state" aria-live="polite">{{ 'common.loading' | translate }}</section>
    } @else if (error()) {
      <section class="state error" role="alert">
        <strong>{{ 'common.errorTitle' | translate }}</strong>
        <span>{{ 'analytics.loadError' | translate }}</span>
        <button type="button" (click)="load(days())">{{ 'common.retry' | translate }}</button>
      </section>
    } @else {
      @if (core()?.subscriptions?.lifecycleAuthorityComplete === false) {
        <aside class="warning" role="status">
          <strong>{{ 'analytics.subscriptionGapTitle' | translate }}</strong>
          <span>{{ 'analytics.subscriptionGapBody' | translate }}</span>
        </aside>
      }

      <section aria-labelledby="financial-title">
        <div class="section-head"><div><h2 id="financial-title">{{ 'analytics.financialTitle' | translate }}</h2>
          <p>{{ 'analytics.financialBody' | translate }}</p></div></div>
        <div class="cards financial">
          <article><span>{{ 'analytics.codGmv' | translate }}</span><strong>{{money(commerce()?.cod?.gmvMinorByCurrency)}}</strong><small>{{ 'analytics.merchantMoney' | translate }}</small></article>
          <article><span>{{ 'analytics.codCollected' | translate }}</span><strong>{{money(commerce()?.cod?.collectedMinorByCurrency)}}</strong><small>{{ 'analytics.merchantMoney' | translate }}</small></article>
          <article><span>{{ 'analytics.refunds' | translate }}</span><strong>{{money(commerce()?.refunds?.refundedMinorByCurrency)}}</strong><small>{{ 'analytics.separateMeasure' | translate }}</small></article>
          <article><span>{{ 'analytics.cancellations' | translate }}</span><strong>{{money(commerce()?.cancellations?.cancelledMinorByCurrency)}}</strong><small>{{count(commerce()?.cancellations?.count)}}</small></article>
          <article class="revenue"><span>{{ 'analytics.subscriptionRevenue' | translate }}</span><strong>{{money(core()?.revenue?.subscriptionCollectedMinorByCurrency)}}</strong><small>{{ 'analytics.rentifyRevenue' | translate }}</small></article>
          <article><span>{{ 'analytics.providerFees' | translate }}</span><strong>{{definedMoney(core()?.revenue?.providerFees)}}</strong><small>{{ 'analytics.authenticatedFactsOnly' | translate }}</small></article>
          <article><span>{{ 'analytics.netRevenue' | translate }}</span><strong>{{definedMoney(core()?.revenue?.netRecognizedPlatformRevenue)}}</strong><small>{{ 'analytics.authenticatedFactsOnly' | translate }}</small></article>
        </div>
      </section>

      <section aria-labelledby="journey-title">
        <div class="section-head"><div><h2 id="journey-title">{{ 'analytics.journeyTitle' | translate }}</h2>
          <p>{{ 'analytics.journeyBody' | translate }}</p></div></div>
        <div class="cards">
          <article><span>{{ 'analytics.activation' | translate }}</span><strong>{{percent(core()?.activation?.completionRate)}}</strong><small>{{count(core()?.activation?.activeStores)}} / {{count(core()?.activation?.accountsStarted)}}</small></article>
          <article><span>{{ 'analytics.zeroSearch' | translate }}</span><strong>{{percent(commerce()?.search?.zeroResultRate)}}</strong><small>P95 {{count(commerce()?.search?.latencyMs?.p95)}} ms</small></article>
          <article><span>{{ 'analytics.checkout' | translate }}</span><strong>{{percent(commerce()?.checkout?.completionRate)}}</strong><small>{{count(commerce()?.checkout?.completed)}} {{ 'analytics.completed' | translate }}</small></article>
          <article><span>{{ 'analytics.fulfillment' | translate }}</span><strong>{{percent(commerce()?.fulfillment?.successRate)}}</strong><small>{{count(commerce()?.fulfillment?.open)}} {{ 'analytics.open' | translate }}</small></article>
          <article><span>{{ 'analytics.supportSla' | translate }}</span><strong>{{count(core()?.support?.overdue)}}</strong><small>{{ 'analytics.overdue' | translate }}</small></article>
          <article><span>{{ 'analytics.notificationDelivery' | translate }}</span><strong>{{percent(core()?.notificationReliability?.successRate)}}</strong><small>{{count(core()?.notificationReliability?.failed)}} {{ 'analytics.failedVisible' | translate }}</small></article>
          <article><span>{{ 'analytics.complaints' | translate }}</span><strong>{{count(commerce()?.returnsAndComplaints?.total)}}</strong><small>{{count(commerce()?.returnsAndComplaints?.linkedToCore)}} {{ 'analytics.linked' | translate }}</small></article>
          <article><span>{{ 'analytics.moderation' | translate }}</span><strong>{{sum(commerce()?.moderation)}}</strong><small>{{ 'analytics.auditedDecisions' | translate }}</small></article>
        </div>
      </section>

      <footer class="definitions">
        <strong>{{ 'analytics.definitionTitle' | translate }}</strong>
        <p>{{ 'analytics.definitionBody' | translate }}</p>
        <code>{{generatedAt()}}</code>
      </footer>
    }
  `,
  styles: [`
    :host{display:block;color:var(--color-text,#201b17)}.page-head,.section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:20px}.page-head h1,.section-head h2{margin:3px 0 6px}.page-head p,.section-head p{margin:0;color:var(--color-muted,#70675f);max-width:760px}.eyebrow{font-size:11px;font-weight:800;letter-spacing:.12em;color:var(--color-accent,#875b2f)!important}.period{display:flex;background:#f2eee9;border-radius:10px;padding:3px}.period button{border:0;background:transparent;border-radius:8px;padding:8px 12px;cursor:pointer}.period button.active{background:white;box-shadow:0 1px 4px #0002;font-weight:700}.warning,.state{display:flex;gap:10px;align-items:center;border:1px solid #e8c881;background:#fff8e8;border-radius:12px;padding:14px;margin:0 0 24px}.warning span{color:#6c531e}.state{justify-content:center;min-height:160px}.state.error{flex-direction:column;border-color:#e2a3a3;background:#fff3f3}.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:32px}.cards article{display:flex;flex-direction:column;min-height:105px;border:1px solid var(--color-border,#e5dfd8);border-radius:14px;background:var(--color-surface,#fff);padding:16px;box-shadow:0 3px 14px #4b372510}.cards article.revenue{border-color:#79ad8c;background:#f4fbf6}.cards span{font-size:12px;color:var(--color-muted,#70675f)}.cards strong{font-size:23px;margin:10px 0 5px;font-variant-numeric:tabular-nums}.cards small{color:var(--color-muted,#70675f)}.definitions{border-top:1px solid var(--color-border,#e5dfd8);padding:20px 0;color:var(--color-muted,#70675f)}.definitions p{max-width:900px}.definitions code{font-size:11px}@media(max-width:900px){.cards{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.page-head{flex-direction:column}.cards{grid-template-columns:1fr}.period{width:100%}.period button{flex:1}}
  `],
})
export class PlatformAnalyticsComponent implements OnInit {
  private readonly operations = inject(PlatformOperationsService);
  private readonly translate = inject(TranslateService);
  readonly periods = [7, 30, 90];
  readonly days = signal(30);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly core = signal<any>(null);
  readonly commerce = signal<any>(null);
  readonly catalogVersion = signal('—');
  readonly generatedAt = signal('');

  ngOnInit(): void { this.load(30); }
  load(days: number): void {
    this.days.set(days); this.loading.set(true); this.error.set(false);
    forkJoin({ core: this.operations.coreAnalytics(days), commerce: this.operations.commerceAnalytics(days) })
      .subscribe({ next: ({ core, commerce }) => {
        this.core.set(core.data); this.commerce.set(commerce.data);
        this.catalogVersion.set(core.data.catalogVersion || commerce.data.catalogVersion || '—');
        this.generatedAt.set(core.data.generatedAt || commerce.data.generatedAt || '');
        this.loading.set(false);
      }, error: () => { this.error.set(true); this.loading.set(false); } });
  }
  count(value: unknown): string { return Number(value || 0).toLocaleString(); }
  percent(value: unknown): string {
    return value === null || value === undefined ? '—' : `${(Number(value) * 100).toFixed(1)}%`;
  }
  sum(value: Record<string, number> | null | undefined): string {
    return this.count(Object.values(value || {}).reduce((total, item) => total + Number(item || 0), 0));
  }
  money(value: Record<string, number> | null | undefined): string {
    const entries = Object.entries(value || {});
    if (!entries.length) return '—';
    return entries.map(([currency, minor]) => new Intl.NumberFormat(undefined, {
      style: 'currency', currency, maximumFractionDigits: currency === 'KHR' ? 0 : 2,
    }).format(Number(minor) / (currency === 'KHR' ? 1 : 100))).join(' · ');
  }
  definedMoney(value: { defined?: boolean; minorByCurrency?: Record<string, number> | null } | null | undefined): string {
    return value?.defined ? this.money(value.minorByCurrency) : this.translate.instant('analytics.notDefined');
  }
}
