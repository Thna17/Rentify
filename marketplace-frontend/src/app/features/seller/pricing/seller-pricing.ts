import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { KcIcon } from '../../../components/shared/ui/kc-icon/kc-icon';
import { ScrollReveal } from '../../../components/shared/ui/scroll-reveal/scroll-reveal.directive';
import { SellerPortalHeader } from '../shared/seller-portal-header';
import { SellerFooter } from '../shared/seller-footer';
import { faqItems, sellerTools } from '../../../core/data/seller-content.data';

@Component({
  selector: 'app-seller-pricing',
  imports: [RouterLink, KcIcon, ScrollReveal, SellerPortalHeader, SellerFooter],
  template: `
    <app-seller-portal-header />
    <main>
      <section class="intro">
        <div class="wrap">
          <p class="eyebrow">Simple, transparent pricing</p>
          <h1>Start free. Choose more support as your store grows.</h1>
          <p class="lead">The original KhmerCraft plan options are kept here in one clear comparison, with every included feature visible before onboarding.</p>
        </div>
      </section>

      <section class="card-wrap">
        <div class="wrap-plans">
          <div class="plans-grid">
            @for (plan of plans; track plan.name; let i = $index) {
              <div class="plan-card" [class.featured]="plan.featured" [kcReveal]="i">
                <span class="plan-badge" [class.gold]="plan.featured">{{ plan.badge }}</span>
                <h2>{{ plan.name }}</h2>
                <p class="plan-description">{{ plan.description }}</p>
                <div class="plan-amount">{{ plan.price }}<small>/ month</small></div>
                <ul>
                  @for (feature of plan.features; track feature) {
                    <li><kc-icon name="check" [size]="14" /> {{ feature }}</li>
                  }
                </ul>
                <button class="button" [class.on-dark]="plan.featured" [class.outline]="!plan.featured" type="button" (click)="startOnboarding(plan.key)">{{ plan.cta }} <span aria-hidden="true">→</span></button>
              </div>
            }
          </div>
          <div class="plan-footnote reveal">
            <kc-icon name="info" [size]="16" />
            <p>These are the approved plan prices. Features marked “planned” are not active yet and will only become plan benefits after their backend workflow is available.</p>
          </div>
        </div>
      </section>

      <section class="included">
        <div class="wrap">
          <div class="included-intro centered" [kcReveal]="0">
            <p class="eyebrow">Included in every plan</p>
            <h2>The seller workspace we are building.</h2>
            <p class="lead">Core store and order workflows are being connected now. Higher-plan capabilities must not be treated as active until they are released.</p>
          </div>
          <div class="included-grid">
            @for (tool of tools; track tool.title; let i = $index) {
              <article [kcReveal]="i + 1"><kc-icon [name]="tool.icon" [size]="21" /><h3>{{ tool.title }}</h3><p>{{ tool.description }}</p></article>
            }
          </div>
        </div>
      </section>

      <section class="mini-faq">
        <div class="wrap mini-faq-grid">
          <div [kcReveal]="0">
            <p class="eyebrow">Before you ask</p>
            <h2>Two questions every new seller has.</h2>
            <a routerLink="/become-a-seller/faq" class="text-link">Read the full FAQ <span aria-hidden="true">→</span></a>
          </div>
          <div class="mini-faq-list">
            @for (faq of pricingFaq; track faq.question; let i = $index) {
              <article [kcReveal]="i + 1">
                <h3>{{ faq.question }}</h3>
                <p>{{ faq.answer }}</p>
              </article>
            }
          </div>
        </div>
      </section>

      <section class="closing">
        <div class="wrap closing-inner">
          <h2>Ready to see if this is worth your time?</h2>
          <div class="closing-actions">
            <button class="button primary" type="button" (click)="startOnboarding()">Start selling <span aria-hidden="true">→</span></button>
            <a class="text-link" routerLink="/become-a-seller/explore">See the workspace first <span aria-hidden="true">→</span></a>
          </div>
        </div>
      </section>
    </main>
    <app-seller-footer />
  `,
  styles: [`
    :host{display:block;background:#fcfaf5;color:#28231f;--green:#213b30;--green2:#2f5543;--clay:#9b3827;--line:#e4dbce}*{box-sizing:border-box}.wrap{width:min(720px,calc(100% - 48px));margin-inline:auto}
    .eyebrow{margin:0 0 16px;color:var(--clay);font-size:12px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}
    h1,h2,h3,p{margin-top:0}
    .intro{padding:clamp(70px,9vw,105px) 0 10px;text-align:center}h1{margin:0 0 18px;font-family:var(--font-heading);font-size:clamp(36px,4.2vw,54px);font-weight:500;letter-spacing:-.04em;line-height:1.05}.lead{margin:0 auto;max-width:520px;color:#655d54;font-size:clamp(16px,1.4vw,18px);line-height:1.65}
    .card-wrap{padding:50px 0 10px}
    .wrap-plans{width:min(880px,calc(100% - 48px));margin-inline:auto}
    @keyframes pop{from{opacity:0;transform:translateY(20px) scale(.98)}}
    .plans-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
    .plan-card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:clamp(26px,3.5vw,34px);box-shadow:0 20px 45px rgba(40,32,22,.07);animation:pop .5s cubic-bezier(.16,1,.3,1) both;display:flex;flex-direction:column}
    .plan-card.featured{background:linear-gradient(150deg,#2f5543,#1a2f26);color:#fff;border-color:#1a2f26;box-shadow:0 26px 55px rgba(26,47,38,.28)}
    .plan-badge{display:inline-block;padding:6px 12px;border-radius:999px;background:#f0ece2;color:#57503f;font-size:11px;font-weight:800;letter-spacing:.04em;width:max-content}
    .plan-badge.gold{background:#e8c98a;color:#3a2c12}
    .plan-card h2{margin:20px 0 8px;color:inherit;font-family:var(--font-heading);font-size:25px}.plan-description{min-height:42px;margin:0;color:#746b61;font-size:12px;line-height:1.55}.featured .plan-description{color:rgba(255,255,255,.7)}
    .plan-amount{font-family:var(--font-heading);font-size:42px;font-weight:700;margin:20px 0 22px}
    .plan-amount small{font-size:13px;font-weight:500;color:#847b6f}
    .featured .plan-amount small{color:rgba(255,255,255,.65)}
    .plan-card ul{list-style:none;margin:0 0 26px;padding:0;display:flex;flex-direction:column;gap:13px;flex:1}
    .plan-card li{display:flex;align-items:flex-start;gap:9px;font-size:13.5px;line-height:1.4}
    .plan-card li kc-icon{flex:none;margin-top:2px;color:var(--clay)}
    .featured li kc-icon{color:#e8c98a}
    .plan-footnote{display:flex;gap:12px;margin-top:28px;padding:20px 4px 0;color:#6e655c}
    .plan-footnote kc-icon{flex:none;color:var(--clay);margin-top:2px}
    .plan-footnote p{margin:0;font-size:12.5px;line-height:1.6}
    .button{display:inline-flex;align-items:center;justify-content:center;gap:16px;min-height:50px;padding:0 24px;border:0;border-radius:8px;font-weight:750;cursor:pointer;width:100%}
    .button span{transition:transform .25s ease}.button:hover span{transform:translateX(4px)}
    .button.primary{background:var(--green);color:#fff;box-shadow:0 10px 24px rgba(33,59,48,.17)}.button.primary:hover{background:var(--green2)}
    .button.on-dark{background:#a8efc7;color:#176242;box-shadow:0 10px 24px rgba(0,0,0,.18)}.button.on-dark:hover{background:#bff5d6}
    .button.outline{background:transparent;border:1px solid var(--line);color:var(--green)}.button.outline:hover{background:#f6f2e9}
    .text-link{display:inline-flex;align-items:center;gap:8px;color:var(--green);font-size:13px;font-weight:750;text-decoration:none}
    .text-link:hover span{transform:translateX(3px)}
    .included{padding:clamp(70px,9vw,110px) 0}.included-intro.centered{max-width:560px;margin:0 auto 44px;text-align:center}.included-intro h2{font-family:var(--font-heading);font-size:clamp(26px,3vw,36px);font-weight:500;letter-spacing:-.03em;margin-bottom:14px}
    .included-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.included-grid article{padding:24px;border:1px solid var(--line);border-radius:12px;background:#fff}.included-grid kc-icon{color:var(--clay)}.included-grid h3{margin:14px 0 6px;font-size:15px;font-weight:750}.included-grid p{margin:0;color:#6e655c;font-size:12.5px;line-height:1.6}
    .mini-faq{padding:clamp(70px,9vw,110px) 0;background:#f3eee5}.mini-faq-grid{display:grid;grid-template-columns:.85fr 1.15fr;gap:clamp(35px,6vw,70px)}.mini-faq-grid>div:first-child h2{font-family:var(--font-heading);font-size:clamp(24px,2.8vw,32px);font-weight:500;letter-spacing:-.03em;margin-bottom:20px}.mini-faq-list{display:grid;gap:22px}.mini-faq-list article{padding-bottom:22px;border-bottom:1px solid #ddd3c2}.mini-faq-list article:last-child{border-bottom:0;padding-bottom:0}.mini-faq-list h3{margin:0 0 8px;font-size:15px;font-weight:750}.mini-faq-list p{margin:0;color:#6e655c;font-size:13px;line-height:1.65}
    .closing{padding:clamp(70px,8vw,100px) 0;text-align:center}.closing h2{font-family:var(--font-heading);font-size:clamp(26px,3vw,38px);font-weight:500;letter-spacing:-.03em;margin-bottom:24px}.closing-actions{display:flex;align-items:center;justify-content:center;gap:26px;flex-wrap:wrap}
    @media(max-width:850px){.plans-grid{grid-template-columns:1fr}.plan-description{min-height:0}}@media(max-width:700px){.included-grid{grid-template-columns:1fr}.mini-faq-grid{grid-template-columns:1fr}}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
  `],
})
export class SellerPricing {
  private readonly router = inject(Router);

  protected readonly tools = sellerTools;

  protected readonly plans = [
    { key: 'STARTER', name: 'Starter', badge: 'Start here', price: '$0', description: 'For new makers beginning their online journey.', featured: false, cta: 'Choose Starter', features: ['Publish and manage products', 'Standard storefront', 'Order management', 'Customer reviews'] },
    { key: 'STANDARD', name: 'Growth', badge: 'Approved price', price: '$12', description: 'For active sellers ready to reach more customers.', featured: true, cta: 'Choose Growth', features: ['Everything in Starter', 'Sales and stock overview', 'Store logo and cover controls', 'Promotion tools · planned'] },
    { key: 'PREMIUM', name: 'Professional', badge: 'Approved price', price: '$29', description: 'For established workshops and growing brands.', featured: false, cta: 'Choose Professional', features: ['Everything in Growth', 'Multiple-store workspace', 'Team access · planned', 'Featured campaigns · planned'] },
  ] as const;

  protected readonly pricingFaq = faqItems.filter((item) =>
    ['How much does it cost to sell?', 'How do I get paid?'].includes(item.question),
  );

  protected startOnboarding(plan: 'STARTER' | 'STANDARD' | 'PREMIUM' = 'STARTER'): void {
    void this.router.navigate(['/seller/onboarding'], { queryParams: { plan } });
  }
}
