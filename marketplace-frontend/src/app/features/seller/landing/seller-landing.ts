import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { KcIcon } from '../../../components/shared/ui/kc-icon/kc-icon';
import { ScrollReveal } from '../../../components/shared/ui/scroll-reveal/scroll-reveal.directive';
import { SellerPortalHeader } from '../shared/seller-portal-header';
import { SellerFooter } from '../shared/seller-footer';
import { sellerSteps, sellerTools } from '../../../core/data/seller-content.data';

@Component({
  selector: 'app-seller',
  imports: [FormsModule, RouterLink, KcIcon, ScrollReveal, SellerPortalHeader, SellerFooter],
  template: `
    <app-seller-portal-header />
    <main>
      <section class="hero">
        <div class="wrap hero-grid">
          <div class="hero-copy reveal">
            <p class="eyebrow">KhmerCraft for sellers</p>
            <h1>Sell what you make.<br /><em>Reach more customers.</em></h1>
            <p class="lead">Create a KhmerCraft storefront, publish your products, and manage buyer orders from one seller workspace built for Cambodian businesses.</p>
            <div class="hero-actions">
              <button class="button primary" type="button" (click)="startOnboarding()">Start selling <span aria-hidden="true">→</span></button>
              <a class="text-link" routerLink="/become-a-seller/explore">See how it works <span aria-hidden="true">→</span></a>
            </div>
            <ul class="trust-chips">
              <li><kc-icon name="heritage" [size]="16" /> Built for Cambodian craftspeople</li>
              <li><kc-icon name="lock" [size]="16" /> Your store stays in your control</li>
            </ul>
          </div>

          <div class="workspace reveal delay" aria-label="Preview of the KhmerCraft seller workspace">
            <div class="chrome"><span></span><span></span><span></span><strong>Seller workspace</strong></div>
            <div class="shell">
              <aside aria-hidden="true"><b>KhmerCraft</b><i class="active"></i><i></i><i></i><i></i></aside>
              <div class="workspace-main">
                <div class="workspace-title"><div><small>STORE OVERVIEW</small><strong>Your shop at a glance</strong></div><span>Store draft</span></div>
                <div class="metrics"><article><small>Products</small><b>12</b></article><article><small>New orders</small><b>3</b></article><article><small>Low stock</small><b>2</b></article></div>
                <div class="latest"><div><small>LATEST ORDER</small><strong>Handwoven krama</strong><span>Quantity 2 · Awaiting confirmation</span></div><button tabindex="-1" aria-hidden="true">Review order</button></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="mission">
        <div class="wrap mission-inner" [kcReveal]="0">
          <h2>Empowering Cambodian craftsmanship.</h2>
          <p>Everything here exists to turn a workshop into a storefront — without asking you to trust an invented price or a fake badge to get started.</p>
        </div>
      </section>

      <section class="why-sell">
        <div class="wrap">
          <div class="why-intro" [kcReveal]="0"><p class="eyebrow">Why sell here</p><h2>Built around what a small seller actually needs.</h2></div>
          <div class="why-grid">
            @for (benefit of whyBenefits; track benefit.title; let i = $index) {
              <article [kcReveal]="i + 1">
                <kc-icon [name]="benefit.icon" [size]="22" />
                <h3>{{ benefit.title }}</h3>
                <p>{{ benefit.description }}</p>
              </article>
            }
          </div>
        </div>
      </section>

      <section class="explore-strip">
        <div class="wrap">
          <div class="strip-intro" [kcReveal]="0"><p class="eyebrow">Everything a new seller needs to know</p><h2>Three pages, no guesswork.</h2></div>
          <div class="strip-grid">
            @for (card of exploreCards; track card.title; let i = $index) {
              <a class="strip-card" [routerLink]="card.link" [kcReveal]="i + 1">
                <kc-icon [name]="card.icon" [size]="26" />
                <h3>{{ card.title }}</h3>
                <p>{{ card.description }}</p>
                <span class="card-link">{{ card.cta }} <span aria-hidden="true">→</span></span>
              </a>
            }
          </div>
        </div>
      </section>

      <section class="journey">
        <div class="wrap">
          <div class="section-intro centered" [kcReveal]="0"><p class="eyebrow">How selling works</p><h2>From registration to your first order.</h2><p>A straightforward setup process with a clear next step at every stage.</p></div>
          <ol class="timeline">
            @for (step of steps; track step.number; let i = $index) {
              <li class="timeline-item" [kcReveal]="i + 1">
                <div class="card"><h3>{{ step.title }}</h3><p>{{ step.description }}</p></div>
                <div class="marker"><kc-icon [name]="step.icon" [size]="19" /></div>
              </li>
            }
          </ol>
        </div>
      </section>

      <section class="seller-fit">
        <div class="wrap">
          <div class="fit-head" [kcReveal]="0">
            <div><p class="eyebrow">Who can sell</p><h2>One marketplace, many kinds of local business.</h2></div>
            <p>Choose the category that best represents your store. You can select more specific product subcategories when you create each listing.</p>
          </div>
          <div class="fit-grid">
            @for (category of sellerCategories; track category.title; let i = $index) {
              <article [kcReveal]="i + 1"><span>{{ category.number }}</span><h3>{{ category.title }}</h3><p>{{ category.description }}</p></article>
            }
          </div>
        </div>
      </section>

      <section class="join">
        <div class="wrap join-card" [kcReveal]="0">
          <div class="join-copy">
            <p class="eyebrow">Quick start</p>
            <h2>Ready to join our community?</h2>
            <p>Registration takes a few minutes. You'll add your store details and first products once you're in.</p>
            <ul class="join-points">
              @for (point of joinPoints; track point) {
                <li><kc-icon name="check" [size]="13" /> {{ point }}</li>
              }
            </ul>
          </div>
          <form class="quick-form" (submit)="continueWithForm($event)">
            <div class="form-row"><label><span>Store name</span><input required name="storeName" [(ngModel)]="form.storeName" placeholder="e.g. Silk Heritage Cambodia" /></label><label><span>Main category</span><select name="category" [(ngModel)]="form.category">@for (category of sellerCategories; track category.title) { <option [value]="category.value">{{ category.title }}</option> }</select></label></div>
            <div class="form-row"><label><span>Phone number</span><input required type="tel" name="phone" [(ngModel)]="form.phone" placeholder="12 345 678" /></label><label><span>Location</span><select name="location" [(ngModel)]="form.location"><option>Phnom Penh</option><option>Siem Reap</option><option>Battambang</option><option>Kampot</option><option>Kandal</option><option>Other province</option></select></label></div>
            <button class="button primary" type="submit">Continue to onboarding <span aria-hidden="true">→</span></button>
            <p class="join-note">Your signed-in KhmerCraft account supplies your personal identity. These store details continue with you into onboarding.</p>
          </form>
        </div>
      </section>

      <section class="tools">
        <div class="wrap">
          <div class="tools-intro centered" [kcReveal]="0"><p class="eyebrow light">Built for daily store work</p><h2>Useful tools, without complicated software.</h2></div>
          <div class="tools-body">
            <div class="tools-visual reveal" aria-hidden="true">
              <div class="phone"><div class="phone-head">Your shop</div><div class="phone-cover"></div><div class="phone-store"><span>KC</span><b>Khmer Ceramic Studio</b></div><div class="phone-grid"><i></i><i></i><i></i><i></i></div></div>
              <div class="floating-note"><kc-icon name="bell" [size]="18" /><span><strong>New order received</strong><small>Open the dashboard to review it</small></span></div>
            </div>
            <div class="tool-grid">
              @for (tool of tools; track tool.title; let i = $index) {
                <article [kcReveal]="i + 1"><kc-icon [name]="tool.icon" [size]="21" /><h3>{{ tool.title }}</h3><p>{{ tool.description }}</p></article>
              }
            </div>
          </div>
        </div>
      </section>

      <section class="closing">
        <div class="wrap closing-inner">
          <p class="eyebrow light">Ready when you are</p>
          <h2>Build a shop that makes your products easier to discover.</h2>
          <div class="closing-actions">
            <button class="button clay" type="button" (click)="startOnboarding()">Start selling <span aria-hidden="true">→</span></button>
            <a class="text-link light" routerLink="/become-a-seller/pricing">Check pricing first <span aria-hidden="true">→</span></a>
          </div>
        </div>
      </section>
    </main>
    <app-seller-footer />
  `,
  styles: [`
    :host{display:block;background:#fcfaf5;color:#28231f;--green:#213b30;--green2:#2f5543;--clay:#9b3827;--gold:#bd8a42;--line:#e4dbce}*{box-sizing:border-box}.wrap{width:min(1180px,calc(100% - 48px));margin-inline:auto}.eyebrow{margin:0 0 16px;color:var(--clay);font-size:12px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}.eyebrow.light{color:#e2c794}h1,h2,h3,p{margin-top:0}h1{margin-bottom:25px;font-family:var(--font-heading);font-size:clamp(47px,5.3vw,78px);font-weight:500;letter-spacing:-.055em;line-height:.98}h1 em{color:var(--clay);font-style:normal}h2{font-family:var(--font-heading);font-size:clamp(35px,4vw,56px);font-weight:500;letter-spacing:-.045em;line-height:1.02}
    .hero{min-height:calc(100vh - 72px);display:grid;align-items:center;padding:72px 0;border-bottom:1px solid var(--line);overflow:hidden}.hero-grid{display:grid;grid-template-columns:.92fr 1.08fr;gap:clamp(50px,7vw,105px);align-items:center}.lead{max-width:590px;color:#655d54;font-size:clamp(17px,1.5vw,20px);line-height:1.65}.hero-actions{display:flex;align-items:center;gap:24px;margin-top:32px}.button{display:inline-flex;align-items:center;justify-content:center;gap:30px;min-height:52px;padding:0 23px;border:0;border-radius:8px;font-weight:750;cursor:pointer}.button span,.text-link span{transition:transform .25s ease}.button:hover span,.text-link:hover span{transform:translateX(4px)}.button.primary{background:var(--green);color:#fff;box-shadow:0 10px 24px rgba(33,59,48,.17)}.button.primary:hover{background:var(--green2);transform:translateY(-2px)}.button.clay{background:#fff6ed;color:#702417}.text-link{display:inline-flex;align-items:center;gap:10px;color:var(--green);font-size:14px;font-weight:750;text-decoration:none}.text-link.light{color:#f9e9d4}.trust-chips{display:flex;flex-wrap:wrap;gap:20px;margin:28px 0 0;padding:0;list-style:none}.trust-chips li{display:flex;align-items:center;gap:8px;color:#72695f;font-size:12px;font-weight:650}.trust-chips kc-icon{color:var(--gold)}
    .workspace{transform:perspective(1200px) rotateY(-2deg);border:1px solid #d7d0c5;border-radius:16px;background:#fff;box-shadow:0 34px 75px rgba(48,38,27,.16);overflow:hidden}.chrome{height:43px;display:flex;align-items:center;gap:6px;padding:0 15px;background:#f2eee7;border-bottom:1px solid #ddd6cb}.chrome span{width:8px;height:8px;border-radius:50%;background:#c9c0b5}.chrome strong{margin-left:9px;color:#7b7268;font-size:10px}.shell{min-height:390px;display:grid;grid-template-columns:82px 1fr}.shell aside{padding:22px 14px;background:var(--green);color:#fff}.shell aside b{font-family:var(--font-heading);font-size:12px}.shell aside i{display:block;width:100%;height:7px;margin-top:25px;border-radius:4px;background:rgba(255,255,255,.17)}.shell aside i.active{background:#d7ad6c}.workspace-main{padding:32px;background:#fbfaf7}.workspace-title{display:flex;justify-content:space-between;align-items:flex-start}.workspace-title div{display:grid;gap:6px}.workspace-title small{color:#8b8175;font-size:9px;font-weight:800;letter-spacing:.12em}.workspace-title strong{font-family:var(--font-heading);font-size:23px}.workspace-title>span{padding:7px 10px;border-radius:20px;background:#ece8df;color:#70685f;font-size:9px;font-weight:750}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:11px;margin-top:28px}.metrics article{padding:18px;border:1px solid #e3ded5;background:#fff}.metrics small,.metrics b{display:block}.metrics small{color:#81786d;font-size:9px}.metrics b{margin-top:8px;color:var(--green);font-family:var(--font-heading);font-size:28px}.latest{display:flex;justify-content:space-between;align-items:center;margin-top:15px;padding:22px;background:var(--green);color:#fff}.latest div{display:grid;gap:6px}.latest small{color:#d9bd8b;font-size:8px;letter-spacing:.12em}.latest span{color:#cbd7d1;font-size:10px}.latest button{border:0;border-radius:5px;padding:9px 12px;background:#fff;color:var(--green);font-size:9px;font-weight:800}.reveal{animation:rise .7s cubic-bezier(.16,1,.3,1) both}.reveal.delay{animation-delay:.12s}@keyframes rise{from{opacity:0;transform:translateY(18px)}}
    .mission{padding:0 0 clamp(60px,7vw,90px)}.mission-inner{max-width:620px;margin:0 auto;text-align:center}.mission-inner h2{font-family:var(--font-heading);font-size:clamp(26px,3vw,38px);font-weight:500;letter-spacing:-.03em;margin:0 0 16px;color:var(--green)}.mission-inner p{margin:0;color:#6e655c;font-size:15px;line-height:1.7}
    .why-sell{padding:0 0 clamp(70px,8vw,110px)}.why-intro{max-width:620px;margin:0 auto 44px;text-align:center}.why-intro h2{margin-bottom:0}.why-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}.why-grid article{padding:26px 22px;border:1px solid var(--line);border-radius:14px;background:#fff;text-align:center;transition:transform .25s ease,box-shadow .25s ease}.why-grid article:hover{transform:translateY(-3px);box-shadow:0 20px 40px rgba(40,32,22,.08)}.why-grid kc-icon{color:var(--clay)}.why-grid h3{margin:16px 0 8px;font-size:15px;font-family:var(--font-body);font-weight:750}.why-grid p{margin:0;color:#6e655c;font-size:12.5px;line-height:1.6}
    .seller-fit{padding:clamp(75px,9vw,120px) 0}.fit-head{display:grid;grid-template-columns:1fr .7fr;gap:70px;align-items:end;margin-bottom:48px}.fit-head>p{margin:0;color:#71685e;font-size:14px;line-height:1.65}.fit-grid{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line);border-left:1px solid var(--line)}.fit-grid article{min-height:205px;padding:25px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}.fit-grid span{color:var(--clay);font-size:10px;font-weight:800}.fit-grid h3{margin:32px 0 10px;font-size:19px}.fit-grid p{margin:0;color:#756c62;font-size:12px;line-height:1.6}
    .join{padding:clamp(70px,8vw,110px) 0;background:#f3eee5}.join-card{max-width:980px;margin:0 auto;background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:0 24px 50px rgba(40,32,22,.08);padding:clamp(32px,5vw,52px);display:grid;grid-template-columns:.75fr 1.25fr;gap:55px;align-items:start}.join-copy h2{margin:0 0 14px}.join-copy>p{color:#6e655c;font-size:14px;line-height:1.65;margin:0 0 24px}.join-points{display:grid;gap:14px;list-style:none;margin:0;padding:0}.join-points li{display:flex;align-items:center;gap:8px;color:#46534f;font-size:13px;font-weight:650}.join-points kc-icon{color:var(--green)}.quick-form{display:grid;gap:16px}.form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}.quick-form label{display:grid;gap:7px}.quick-form label>span{font-size:11px;font-weight:750}.quick-form input,.quick-form select{width:100%;min-height:45px;padding:0 13px;border:1px solid #d9d0c4;background:#fff;font-size:12px}.quick-form .button{justify-self:start}.join-note{margin:0;color:#8b8175;font-size:11.5px}
    .explore-strip{padding:clamp(70px,8vw,110px) 0;border-bottom:1px solid var(--line)}.strip-intro{max-width:620px;margin:0 auto 50px;text-align:center}.strip-intro h2{margin-bottom:0}.strip-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}.strip-card{display:grid;gap:12px;padding:30px 26px;background:#fff;border:1px solid var(--line);border-radius:14px;text-decoration:none;color:inherit;transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease}.strip-card:hover{transform:translateY(-4px);box-shadow:0 20px 40px rgba(40,32,22,.1);border-color:#d7cdbc}.strip-card kc-icon{color:var(--clay)}.strip-card h3{font-size:18px;font-family:var(--font-body);font-weight:750}.strip-card p{margin:0;color:#6e655c;font-size:13px;line-height:1.6}.card-link{display:inline-flex;align-items:center;gap:8px;margin-top:6px;color:var(--green);font-size:12px;font-weight:800}.strip-card:hover .card-link span{transform:translateX(3px)}
    .journey{padding:clamp(80px,9vw,130px) 0;background:#f3eee5}.section-intro.centered{max-width:640px;margin:0 auto;text-align:center}.section-intro h2{margin-bottom:19px}.section-intro>p:not(.eyebrow){color:#6e655c;line-height:1.7}.timeline{position:relative;margin:64px 0 0;padding:0;list-style:none}.timeline::before{content:'';position:absolute;left:50%;top:0;bottom:0;width:2px;background:#d8cfc2;transform:translateX(-1px)}.timeline-item{position:relative;display:grid;grid-template-columns:1fr 56px 1fr;align-items:center;padding:22px 0}.timeline-item .card{grid-column:1;text-align:right;padding-right:36px}.timeline-item .marker{grid-column:2;justify-self:center;width:44px;height:44px;border-radius:50%;background:var(--green);color:#fff;display:grid;place-items:center;z-index:1;box-shadow:0 8px 18px rgba(33,59,48,.28)}.timeline-item:nth-child(even) .card{grid-column:3;grid-row:1;text-align:left;padding-right:0;padding-left:36px}.timeline-item h3{margin-bottom:6px;font-size:19px}.timeline-item p{margin:0;color:#746b61;font-size:13px;line-height:1.6}
    .tools{padding:clamp(80px,9vw,130px) 0;background:var(--green);color:#f9f4ea}.tools h2{color:#fff7eb}.tools-intro.centered{max-width:560px;margin:0 auto 56px;text-align:center}.tools-body{display:grid;grid-template-columns:.85fr 1.15fr;gap:clamp(45px,7vw,90px);align-items:center}.tools-visual{position:relative;min-height:480px;display:grid;place-items:center;background:#2a493b;border-radius:18px;overflow:visible}.phone{width:250px;padding:13px;background:#fcfaf5;border:7px solid #182a22;border-radius:28px;box-shadow:0 25px 50px rgba(0,0,0,.3);color:#28231f}.phone-head{padding:9px 4px;font-size:10px;font-weight:800}.phone-cover{height:80px;background:linear-gradient(130deg,#9d7756,#d3b485);border-radius:4px}.phone-store{display:flex;align-items:center;gap:8px;padding:12px 4px;font-size:10px}.phone-store span{display:grid;place-items:center;width:30px;height:30px;background:#f0e5d4;color:var(--clay);font-family:var(--font-heading)}.phone-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}.phone-grid i{height:88px;background:#eee6d8;border-radius:3px}.floating-note{position:absolute;right:-18px;bottom:38px;display:flex;gap:11px;align-items:center;padding:15px 17px;background:#fff;color:#28231f;border-radius:10px;box-shadow:0 20px 40px rgba(0,0,0,.28);transform:rotate(-2deg)}.floating-note span{display:grid;gap:4px}.floating-note strong{font-size:10px}.floating-note small{color:#756d64;font-size:8px}.tool-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.tool-grid article{padding:22px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:12px}.tool-grid kc-icon{color:#e2c794}.tool-grid h3{color:#fff;margin:14px 0 6px;font-size:15px;font-family:var(--font-body)}.tool-grid p{color:#c3cec8;font-size:12px;line-height:1.55;margin:0}
    .closing{padding:90px 0;background:var(--clay);color:#fff;text-align:center}.closing-inner{display:grid;justify-items:center;gap:14px;max-width:720px;margin:0 auto}.closing h2{color:#fff;font-size:clamp(33px,4vw,50px)}.closing-actions{display:flex;align-items:center;gap:26px;margin-top:18px;flex-wrap:wrap;justify-content:center}
    @media(max-width:900px){.hero{min-height:auto}.hero-grid{grid-template-columns:1fr;gap:55px}.workspace{transform:none}.strip-grid{grid-template-columns:1fr}.timeline::before{left:21px}.timeline-item{grid-template-columns:44px 1fr;column-gap:18px}.timeline-item .marker{grid-column:1;width:38px;height:38px}.timeline-item .card,.timeline-item:nth-child(even) .card{grid-column:2;grid-row:1;text-align:left;padding:0}.fit-head,.join-card{grid-template-columns:1fr;gap:30px}.fit-grid{grid-template-columns:repeat(2,1fr)}.why-grid{grid-template-columns:repeat(2,1fr)}.tools-body{grid-template-columns:1fr}.tools-visual{order:-1;min-height:400px}.tool-grid{grid-template-columns:1fr}}
    @media(max-width:600px){.wrap{width:min(100% - 32px,1180px)}.hero{padding:55px 0}.hero-actions{align-items:flex-start;flex-direction:column}.workspace{margin-inline:-8px}.shell{min-height:330px;grid-template-columns:54px 1fr}.shell aside{padding:18px 9px}.workspace-main{padding:20px 14px}.metrics article{padding:12px 9px}.metrics b{font-size:22px}.latest{align-items:flex-start;flex-direction:column;gap:16px;padding:17px}.fit-grid{grid-template-columns:1fr}.fit-grid article{min-height:auto}.form-row{grid-template-columns:1fr}.tools-visual{margin-inline:-16px;min-height:360px}.floating-note{right:8px}.footer-inner nav{display:grid;grid-template-columns:1fr 1fr;gap:14px 28px;width:100%}}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}.workspace{transform:none}}
  `],
})
export class SellerPage {
  private readonly router = inject(Router);

  protected readonly whyBenefits = [
    { icon: 'globe', title: 'Reach shoppers marketplace-wide', description: 'Your storefront is discoverable by every buyer browsing KhmerCraft, not just people who already know your shop.' },
    { icon: 'wallet', title: 'Payouts you can track', description: 'Every order and its payment status live in your seller dashboard — no separate spreadsheet to reconcile.' },
    { icon: 'shield', title: 'You control what buyers see', description: 'Your store profile, contact details, and categories are yours to edit — nothing is published without you setting it.' },
    { icon: 'sparkles', title: 'Room to grow the storefront', description: 'Start with the basics, then build out categories, collections, and featured products as your catalogue grows.' },
  ];

  protected readonly exploreCards = [
    { icon: 'eye', title: 'See it in action', description: 'Look at the storefront, product, and order screens before you register.', cta: 'Explore the platform', link: '/become-a-seller/explore' },
    { icon: 'percent', title: 'Understand the cost', description: 'Registration and draft listings are free. See exactly what is confirmed and when.', cta: 'View pricing', link: '/become-a-seller/pricing' },
    { icon: 'info', title: 'Get your questions answered', description: 'Shipping, payouts, and coverage — answered plainly before you commit.', cta: 'Read the FAQ', link: '/become-a-seller/faq' },
  ];

  protected readonly steps = sellerSteps;

  protected readonly tools = sellerTools;

  protected readonly joinPoints = [
    'No setup fees to get started',
    'Full seller workspace from day one',
    'Manage orders and reviews in one place',
  ];

  protected readonly sellerCategories = [
    { number: '01', value: 'Fashion & Accessories', title: 'Fashion & accessories', description: 'Clothing, krama, woven textiles, bags, footwear, and accessories.' },
    { number: '02', value: 'Food & Groceries', title: 'Food & groceries', description: 'Produce, rice, pantry goods, beverages, snacks, and packaged local food.' },
    { number: '03', value: 'Home & Living', title: 'Home & living', description: 'Furniture, homeware, pottery, baskets, décor, and household essentials.' },
    { number: '04', value: 'Beauty & Wellness', title: 'Beauty & wellness', description: 'Skincare, hair care, body care, wellness, and personal-care products.' },
    { number: '05', value: 'Electronics', title: 'Electronics', description: 'Phones, computers, accessories, audio, appliances, and everyday technology.' },
    { number: '06', value: 'Kids & Family', title: 'Kids & family', description: 'Children’s products, toys, books, care essentials, and family goods.' },
    { number: '07', value: 'Arts & Culture', title: 'Arts & culture', description: 'Cambodian crafts, art, music, books, collectibles, and meaningful gifts.' },
  ];

  protected form = { storeName: '', phone: '', location: 'Phnom Penh', category: 'Fashion & Accessories' };

  protected continueWithForm(event: Event): void {
    event.preventDefault();
    void this.router.navigate(['/seller/onboarding'], {
      queryParams: {
        storeName: this.form.storeName.trim(),
        phoneNumber: this.form.phone.trim(),
        location: this.form.location,
        category: this.form.category,
      },
    });
  }

  protected startOnboarding(): void {
    void this.router.navigateByUrl('/seller/onboarding');
  }
}
