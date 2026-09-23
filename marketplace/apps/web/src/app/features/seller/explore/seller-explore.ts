import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KcIcon } from '../../../components/shared/ui/kc-icon/kc-icon';
import { ScrollReveal } from '../../../components/shared/ui/scroll-reveal/scroll-reveal.directive';
import { SellerPortalHeader } from '../shared/seller-portal-header';
import { SellerFooter } from '../shared/seller-footer';
import { sellerTools } from '../../../core/data/seller-content.data';

type PreviewView = 'storefront' | 'products' | 'orders';

/**
 * Its own page rather than a section of the landing page — the nav bar
 * link takes you here directly instead of scrolling you to a spot further
 * down whatever page you were already on.
 */
@Component({
  selector: 'app-seller-explore',
  imports: [RouterLink, KcIcon, ScrollReveal, SellerPortalHeader, SellerFooter],
  template: `
    <app-seller-portal-header />
    <main>
      <section class="intro">
        <div class="wrap">
          <p class="eyebrow">See the platform in action</p>
          <h1>Understand what you get before you register.</h1>
          <p class="lead">Switch between workflows already represented in KhmerCraft. Everyday store tasks stay clear, even if this is your first online shop.</p>
        </div>
      </section>

      <section class="stage">
        <div class="wrap">
          <div class="preview-tabs" role="tablist" aria-label="Seller workspace previews">
            @for (item of previewItems; track item.id) {
              <button type="button" role="tab" [attr.aria-selected]="preview() === item.id" [class.active]="preview() === item.id" (click)="preview.set(item.id)">
                <kc-icon [name]="item.icon" [size]="17" /><span>{{ item.label }}</span>
              </button>
            }
          </div>

          <div class="product-demo" role="tabpanel">
            @if (preview() === 'storefront') {
              <div class="store-demo enter">
                <div class="store-cover"><span>YOUR SHOP</span><strong>Tell customers what makes your work special.</strong></div>
                <div class="store-profile"><div class="store-mark">KS</div><div><strong>Your store name</strong><span>Local products · Cambodia</span></div><button tabindex="-1" aria-hidden="true">Follow</button></div>
                <div class="mini-products"><div><span>A</span><small>Product name</small></div><div><span>B</span><small>Product name</small></div><div><span>C</span><small>Product name</small></div></div>
              </div>
            } @else if (preview() === 'products') {
              <div class="table-demo enter"><div class="demo-head"><div><small>PRODUCTS</small><strong>Manage your catalogue</strong></div><button tabindex="-1" aria-hidden="true">+ Add product</button></div><div class="table-row header"><span>Product</span><span>Stock</span><span>Status</span></div><div class="table-row"><span><i>K</i> Handwoven krama</span><span>18</span><b>Active</b></div><div class="table-row"><span><i>P</i> Palm-leaf basket</span><span>4</span><b class="warning">Low stock</b></div><div class="table-row"><span><i>C</i> Ceramic cup</span><span>0</span><b class="muted">Draft</b></div></div>
            } @else {
              <div class="table-demo enter"><div class="demo-head"><div><small>INCOMING ORDERS</small><strong>Know what needs attention</strong></div><span class="status-dot">3 new</span></div><div class="order-line"><div><i>01</i><span><strong>Order KC-1042</strong><small>2 products · Phnom Penh</small></span></div><button tabindex="-1" aria-hidden="true">Review</button></div><div class="order-line"><div><i>02</i><span><strong>Order KC-1038</strong><small>1 product · Siem Reap</small></span></div><b>Preparing</b></div><div class="order-line"><div><i>03</i><span><strong>Order KC-1029</strong><small>3 products · Battambang</small></span></div><b>Shipped</b></div></div>
            }
          </div>
        </div>
      </section>

      <section class="notes">
        <div class="wrap notes-grid">
          @for (note of previewItems; track note.id; let i = $index) {
            <article [kcReveal]="i" [class.active]="preview() === note.id">
              <kc-icon [name]="note.icon" [size]="22" />
              <h3>{{ note.label }}</h3>
              <p>{{ note.detail }}</p>
            </article>
          }
        </div>
      </section>

      <section class="workspace-full">
        <div class="wrap">
          <div class="workspace-full-intro centered" [kcReveal]="0">
            <p class="eyebrow">Beyond these three screens</p>
            <h2>Everything in your seller workspace.</h2>
            <p class="lead">The preview above shows three everyday screens. The full workspace covers the rest of running a store.</p>
          </div>
          <div class="workspace-full-grid">
            @for (tool of tools; track tool.title; let i = $index) {
              <article [kcReveal]="i + 1"><kc-icon [name]="tool.icon" [size]="21" /><h3>{{ tool.title }}</h3><p>{{ tool.description }}</p></article>
            }
          </div>
        </div>
      </section>

      <section class="closing">
        <div class="wrap closing-inner">
          <h2>Know what it costs before you commit.</h2>
          <div class="closing-actions">
            <a class="text-link" routerLink="/become-a-seller/pricing">See pricing <span aria-hidden="true">→</span></a>
            <a class="text-link" routerLink="/become-a-seller/faq">Read the FAQ <span aria-hidden="true">→</span></a>
          </div>
        </div>
      </section>
    </main>
    <app-seller-footer />
  `,
  styles: [`
    :host{display:block;background:#fcfaf5;color:#28231f;--green:#213b30;--clay:#9b3827;--line:#e4dbce}*{box-sizing:border-box}.wrap{width:min(1000px,calc(100% - 48px));margin-inline:auto}
    .eyebrow{margin:0 0 16px;color:var(--clay);font-size:12px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}
    .intro{padding:clamp(70px,9vw,110px) 0 20px;text-align:center}.intro .wrap{max-width:700px}h1{margin:0 0 20px;font-family:var(--font-heading);font-size:clamp(38px,4.4vw,58px);font-weight:500;letter-spacing:-.04em;line-height:1.04}.lead{margin:0;color:#655d54;font-size:clamp(16px,1.4vw,18px);line-height:1.65}
    .stage{padding:50px 0 clamp(70px,8vw,110px)}
    .preview-tabs{display:flex;justify-content:center;gap:10px;margin-bottom:34px;flex-wrap:wrap}.preview-tabs button{display:flex;gap:9px;align-items:center;padding:12px 20px;border:1px solid var(--line);border-radius:999px;background:#fff;color:#766d63;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s ease}.preview-tabs button.active{border-color:var(--green);background:var(--green);color:#fff}.preview-tabs button:hover:not(.active){border-color:#c9bda8}
    .product-demo{min-height:500px;padding:25px;background:#eee8dd;border:1px solid #ddd4c7;border-radius:16px}.enter{animation:demo .35s ease both}@keyframes demo{from{opacity:0;transform:translateY(7px)}}
    .store-demo,.table-demo{min-height:450px;background:#fff;box-shadow:0 18px 35px rgba(45,35,24,.09);border-radius:8px;overflow:hidden}.store-cover{min-height:165px;display:flex;flex-direction:column;justify-content:flex-end;padding:25px;background:linear-gradient(120deg,#1e352b,#59705e);color:#fff}.store-cover span{color:#dfc087;font-size:9px;letter-spacing:.15em}.store-cover strong{max-width:370px;margin-top:9px;font-family:var(--font-heading);font-size:25px;font-weight:500}.store-profile{display:flex;gap:13px;align-items:center;padding:17px 22px;border-bottom:1px solid var(--line)}.store-mark{display:grid;place-items:center;width:42px;height:42px;background:#f4ede1;color:var(--clay);font-family:var(--font-heading);font-weight:700}.store-profile>div:nth-child(2){display:grid;gap:3px}.store-profile span{color:#81786d;font-size:10px}.store-profile button{margin-left:auto;border:1px solid var(--line);background:#fff;padding:8px 13px;font-size:9px}.mini-products{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:20px}.mini-products div{display:grid;gap:8px}.mini-products span{display:grid;place-items:center;aspect-ratio:1.2;background:#f1eadf;color:var(--clay);font-family:var(--font-heading);font-size:29px}.mini-products small{font-size:9px}
    .table-demo{padding:28px}.demo-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:27px}.demo-head div{display:grid;gap:7px}.demo-head small{color:#8b8175;font-size:9px;font-weight:800;letter-spacing:.12em}.demo-head strong{font-family:var(--font-heading);font-size:24px}.demo-head button{border:0;border-radius:5px;padding:9px 12px;background:var(--green);color:#fff;font-size:9px;font-weight:800}.status-dot{padding:7px 10px;border-radius:20px;background:#ece8df;color:#70685f;font-size:9px;font-weight:750}.table-row{display:grid;grid-template-columns:1fr 70px 90px;align-items:center;min-height:65px;border-top:1px solid var(--line);font-size:11px}.table-row.header{min-height:36px;color:#8d8378;font-size:9px;text-transform:uppercase}.table-row span:first-child{display:flex;align-items:center;gap:10px}.table-row i,.order-line i{display:grid;place-items:center;width:30px;height:30px;background:#f1eadd;color:var(--clay);font-family:var(--font-heading);font-style:normal}.table-row b{width:max-content;padding:5px 8px;background:#e9f3ed;color:#2f6b4c;font-size:8px;border-radius:12px}.table-row b.warning{background:#fbefd9;color:#95691e}.table-row b.muted{background:#eeeae5;color:#777}.order-line{display:flex;justify-content:space-between;align-items:center;padding:18px 24px;border-top:1px solid var(--line)}.order-line>div{display:flex;gap:12px;align-items:center}.order-line span{display:grid;gap:5px}.order-line small{color:#81786d;font-size:10px}.order-line button{border:0;border-radius:5px;background:var(--clay);color:#fff;padding:8px 12px;font-size:9px}.order-line>b{color:#52755f;font-size:10px}
    .notes{padding:0 0 clamp(70px,8vw,100px)}.notes-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.notes-grid article{padding:24px;border:1px solid var(--line);border-radius:12px;background:#fff;transition:border-color .25s ease,box-shadow .25s ease}.notes-grid article.active{border-color:var(--green);box-shadow:0 12px 28px rgba(33,59,48,.1)}.notes-grid kc-icon{color:var(--clay)}.notes-grid h3{margin:14px 0 6px;font-size:15px;font-family:var(--font-body)}.notes-grid p{margin:0;color:#6e655c;font-size:12px;line-height:1.6}
    .workspace-full{padding:clamp(70px,9vw,110px) 0;background:#f3eee5}.workspace-full-intro.centered{max-width:560px;margin:0 auto 44px;text-align:center}.workspace-full-intro h2{font-family:var(--font-heading);font-size:clamp(26px,3vw,36px);font-weight:500;letter-spacing:-.03em;margin:0 0 14px}.workspace-full-intro .lead{margin:0;color:#655d54;font-size:14px;line-height:1.6}.workspace-full-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}.workspace-full-grid article{padding:24px;border:1px solid #ddd3c2;border-radius:12px;background:#fff}.workspace-full-grid kc-icon{color:var(--clay)}.workspace-full-grid h3{margin:14px 0 6px;font-size:15px;font-weight:750}.workspace-full-grid p{margin:0;color:#6e655c;font-size:12.5px;line-height:1.6}
    .closing{padding:clamp(70px,8vw,100px) 0;text-align:center}.closing h2{font-family:var(--font-heading);font-size:clamp(24px,2.8vw,34px);font-weight:500;letter-spacing:-.03em;margin:0 0 22px}.closing-actions{display:flex;align-items:center;justify-content:center;gap:30px;flex-wrap:wrap}.text-link{display:inline-flex;align-items:center;gap:8px;color:var(--green);font-size:14px;font-weight:750;text-decoration:none}.text-link span{transition:transform .25s ease}.text-link:hover span{transform:translateX(3px)}
    @media(max-width:760px){.notes-grid{grid-template-columns:1fr}.workspace-full-grid{grid-template-columns:1fr}.order-line{padding:16px 14px}.table-row{grid-template-columns:1fr 45px 68px;font-size:10px}}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
  `],
})
export class SellerExplore {
  protected readonly tools = sellerTools;
  protected readonly preview = signal<PreviewView>('storefront');
  protected readonly previewItems: Array<{ id: PreviewView; label: string; icon: string; detail: string }> = [
    { id: 'storefront', label: 'Your storefront', icon: 'store', detail: 'Present your shop and products the way customers will actually see them.' },
    { id: 'products', label: 'Product management', icon: 'box', detail: 'Control listings and stock levels from a single catalogue view.' },
    { id: 'orders', label: 'Incoming orders', icon: 'cart', detail: 'See what needs attention as buyer orders come in.' },
  ];
}
