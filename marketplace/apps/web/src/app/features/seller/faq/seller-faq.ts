import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { KcIcon } from '../../../components/shared/ui/kc-icon/kc-icon';
import { ScrollReveal } from '../../../components/shared/ui/scroll-reveal/scroll-reveal.directive';
import { SellerPortalHeader } from '../shared/seller-portal-header';
import { SellerFooter } from '../shared/seller-footer';
import { faqItems, sellerSteps } from '../../../core/data/seller-content.data';

@Component({
  selector: 'app-seller-faq',
  imports: [RouterLink, KcIcon, ScrollReveal, SellerPortalHeader, SellerFooter],
  template: `
    <app-seller-portal-header />
    <main>
      <section class="intro">
        <div class="wrap">
          <p class="eyebrow">Questions before you start</p>
          <h1>Seller FAQ</h1>
          <p class="lead">Learn what to prepare before submitting your store. You can also read more about KhmerCraft.</p>
          <a routerLink="/about" class="text-link">About KhmerCraft <span aria-hidden="true">→</span></a>
        </div>
      </section>

      <section class="list-wrap">
        <div class="wrap faq-list">
          @for (faq of faqItems; track faq.question; let i = $index) {
            <article class="faq-item" [kcReveal]="i">
              <h3>
                <button type="button" (click)="toggleFaq(i)" [attr.aria-expanded]="openFaq() === i" [attr.aria-controls]="'faq-answer-' + i">
                  <span>{{ faq.question }}</span>
                  <span class="icon" aria-hidden="true">{{ openFaq() === i ? '−' : '+' }}</span>
                </button>
              </h3>
              <div class="faq-answer" [class.open]="openFaq() === i" [attr.aria-hidden]="openFaq() !== i" [id]="'faq-answer-' + i">
                <p>{{ faq.answer }}</p>
              </div>
            </article>
          }
        </div>
      </section>

      <section class="timeline-recap">
        <div class="wrap">
          <div class="recap-intro centered" [kcReveal]="0">
            <p class="eyebrow">Still deciding?</p>
            <h2>Here's the short version of what happens.</h2>
          </div>
          <ol class="recap-list">
            @for (step of steps; track step.number; let i = $index) {
              <li [kcReveal]="i + 1">
                <span class="recap-icon"><kc-icon [name]="step.icon" [size]="18" /></span>
                <div><strong>{{ step.title }}</strong><p>{{ step.description }}</p></div>
              </li>
            }
          </ol>
        </div>
      </section>

      <section class="closing">
        <div class="wrap closing-inner">
          <h2>Answered what you needed?</h2>
          <div class="closing-actions">
            <button class="button primary" type="button" (click)="startOnboarding()">Start selling <span aria-hidden="true">→</span></button>
            <a class="text-link" routerLink="/become-a-seller/pricing">Check pricing again <span aria-hidden="true">→</span></a>
          </div>
        </div>
      </section>
    </main>
    <app-seller-footer />
  `,
  styles: [`
    :host{display:block;background:#fcfaf5;color:#28231f;--green:#213b30;--clay:#9b3827;--line:#e4dbce}*{box-sizing:border-box}.wrap{width:min(760px,calc(100% - 48px));margin-inline:auto}
    .eyebrow{margin:0 0 16px;color:var(--clay);font-size:12px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}
    .intro{padding:clamp(70px,9vw,105px) 0 30px;text-align:center}h1{margin:0 0 18px;font-family:var(--font-heading);font-size:clamp(38px,4.4vw,58px);font-weight:500;letter-spacing:-.04em}.lead{margin:0 auto 22px;max-width:480px;color:#655d54;font-size:clamp(16px,1.4vw,18px);line-height:1.65}
    .text-link{display:inline-flex;align-items:center;gap:8px;color:var(--green);font-size:13px;font-weight:750;text-decoration:none}.text-link span{transition:transform .25s ease}.text-link:hover span{transform:translateX(3px)}
    .list-wrap{padding:20px 0 clamp(90px,10vw,130px)}
    .faq-list{border-top:1px solid var(--line)}.faq-item{border-bottom:1px solid var(--line)}.faq-item h3{margin:0}
    .faq-item button{display:flex;justify-content:space-between;gap:20px;width:100%;padding:26px 4px;border:0;background:transparent;text-align:left;font-weight:750;font-size:16px;cursor:pointer;color:inherit}
    .faq-item .icon{flex:none;color:var(--clay);font-size:18px}
    .faq-answer{display:grid;grid-template-rows:0fr;transition:grid-template-rows .3s ease}.faq-answer.open{grid-template-rows:1fr}
    .faq-answer p{min-height:0;overflow:hidden;margin:0;padding:0 4px;color:#6f665c;font-size:14px;line-height:1.7}
    .faq-answer.open p{padding-bottom:26px}
    a:focus-visible,button:focus-visible{outline:3px solid #bd8a42;outline-offset:4px}
    .timeline-recap{padding:clamp(60px,8vw,90px) 0;background:#f3eee5}.recap-intro.centered{max-width:520px;margin:0 auto 40px;text-align:center}.recap-intro h2{font-family:var(--font-heading);font-size:clamp(24px,2.8vw,34px);font-weight:500;letter-spacing:-.03em;margin:0}
    .recap-list{margin:0;padding:0;list-style:none;display:grid;gap:16px}.recap-list li{display:flex;gap:16px;align-items:flex-start;padding:18px 20px;background:#fff;border:1px solid #ddd3c2;border-radius:10px}.recap-icon{flex:none;display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:var(--green);color:#fff}.recap-list strong{display:block;font-size:14px;margin-bottom:4px}.recap-list p{margin:0;color:#6e655c;font-size:12.5px;line-height:1.55}
    .closing{padding:clamp(60px,8vw,90px) 0;text-align:center}.closing h2{font-family:var(--font-heading);font-size:clamp(24px,2.8vw,34px);font-weight:500;letter-spacing:-.03em;margin:0 0 22px}.closing-actions{display:flex;align-items:center;justify-content:center;gap:24px;flex-wrap:wrap}
    .button{display:inline-flex;align-items:center;justify-content:center;gap:22px;min-height:50px;padding:0 24px;border:0;border-radius:8px;font-weight:750;cursor:pointer;background:var(--green);color:#fff}
    .button span{transition:transform .25s ease}.button:hover span{transform:translateX(4px)}
    @media(max-width:600px){.recap-list li{padding:16px}}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
  `],
})
export class SellerFaq {
  private readonly router = inject(Router);

  protected readonly faqItems = faqItems;
  protected readonly steps = sellerSteps;
  protected readonly openFaq = signal<number | null>(null);

  protected toggleFaq(index: number): void {
    this.openFaq.set(this.openFaq() === index ? null : index);
  }

  protected startOnboarding(): void {
    void this.router.navigateByUrl('/seller/onboarding');
  }
}
