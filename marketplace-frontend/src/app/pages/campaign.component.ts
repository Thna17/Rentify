import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { Campaign, CampaignService } from '../core/campaigns/campaign.service';
import { Product } from '../core/catalog/catalog.models';
import { toProductFromRentify } from '../core/catalog/catalog.service';
import { RentifyMarketplaceService, RentifyStore } from '../core/rentify/rentify-marketplace.service';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { ProductCardComponent } from '../components/user/catalog/product-card/product-card.component';
@Component({
  selector:'app-campaign',imports:[CommonModule,FormsModule,RouterLink,NavbarComponent,FooterComponent,ProductCardComponent],
  template:`<app-navbar/>
    <main class="container campaign-page">
      <nav aria-label="Breadcrumb"><a routerLink="/">Home</a><span> / </span><a routerLink="/campaigns">Campaigns & events</a>@if(campaign()){<span> / {{campaign()!.title}}</span>}</nav>
      @if(!slug){
        <header><p class="eyebrow">Rentify Marketplace</p><h1>Campaigns & events</h1><p>Discover seasonal offers and collections selected by Rentify and local merchants.</p></header>
        @if(service.error()){<p role="alert">{{service.error()}}</p><button class="btn" (click)="service.load()">Try again</button>}
        @if(!service.loaded()){<p role="status">Loading events…</p>}
        <div class="events">@for(c of service.campaigns();track c.id){<a class="event" [routerLink]="['/campaigns',c.slug]"><img [src]="c.bannerUrl" [alt]="c.title"/><h2>{{c.title}}</h2><p>{{c.description}}</p><span>Explore event →</span></a>}@empty{@if(service.loaded() && !service.error()){<section class="empty"><h2>No live campaigns right now</h2><p>New events will appear here when they begin.</p><a routerLink="/products">Browse all products →</a></section>}}</div>
      }@else{
        @if(loading()){<p class="loading" role="status">Loading this campaign…</p>}
        @if(error()){<section class="empty" role="alert"><h1>{{unavailable()?'This event is not available':'Unable to load this event'}}</h1><p>{{error()}}</p><button class="btn" (click)="load()">Try again</button><a routerLink="/campaigns">Explore other events</a></section>}
        @if(campaign();as c){
          <header><img class="banner" [src]="c.bannerUrl" [alt]="c.title"/><div class="intro"><div><p class="eyebrow">Marketplace event · Ends {{c.endsAt | date:'mediumDate'}}</p><h1>{{c.title}}</h1><p class="description">{{c.description}}</p></div><span class="badge">{{c.minimumDiscount ? c.minimumDiscount+'% minimum discount' : 'Selected by Rentify'}}</span></div></header>
          <form class="toolbar" (ngSubmit)="search()"><label>Search this campaign<input type="search" name="search" [(ngModel)]="term" maxlength="120" placeholder="Find a product…"/></label><button class="btn" type="submit" [disabled]="loading()">Search</button><label>Sort<select name="sort" [(ngModel)]="sort" (ngModelChange)="search()"><option value="newest">Newest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></label></form>
          <p class="count" aria-live="polite">{{total()}} matching {{total()===1?'product':'products'}}</p>
          <div class="product-grid">@for(p of products();track p.id){<app-product-card [product]="p"/>}</div>
          @if(!loading() && !products().length){<section class="empty"><h2>{{term?'No products match your search':'Products are on their way'}}</h2><p>{{term?'Try another search within this campaign.':'Approved products will appear here as local merchants join this event.'}}</p><a routerLink="/products">Browse all products →</a></section>}
          @if(total()>24){<nav class="pagination" aria-label="Campaign pages"><button class="btn" [disabled]="page===1 || loading()" (click)="go(page-1)">Previous</button><span>Page {{page}} of {{pages()}}</span><button class="btn" [disabled]="page>=pages() || loading()" (click)="go(page+1)">Next</button></nav>}
        }
      }
    </main><app-footer/>`,
  styles:[`.campaign-page{padding-top:24px;padding-bottom:60px}nav{font-size:13px;color:var(--color-muted);margin-bottom:24px}a{color:inherit}.banner{display:block;width:100%;aspect-ratio:3/1;object-fit:contain;border-radius:20px}.intro{display:flex;gap:24px;align-items:start;justify-content:space-between;margin:28px 0}.intro h1,h1{font-size:clamp(28px,4vw,44px);line-height:1.15;margin:8px 0 16px}.description{white-space:pre-wrap;max-width:65ch;color:var(--color-muted);line-height:1.7}.eyebrow{text-transform:uppercase;letter-spacing:.08em;font-size:11px;color:var(--color-muted)}.badge{white-space:nowrap;border-radius:999px;background:#f0edff;color:#5743bb;padding:10px 16px;font-size:12px}.toolbar{display:flex;gap:12px;align-items:end;padding:20px 0;border-block:1px solid var(--color-border,#e2e8f0)}label{display:grid;gap:8px;font-size:12px}label:first-child{flex:1}input,select{min-height:44px;border:1px solid #cbd5e1;border-radius:12px;padding:10px 14px;background:var(--color-surface);color:var(--color-text);min-width:0;width:100%;box-sizing:border-box}.btn{min-height:44px;border-radius:12px;padding:10px 18px;cursor:pointer;background:#5743bb;color:white;border:0}.btn:disabled{opacity:.5}.count{margin:24px 0;color:var(--color-muted);font-size:13px}.product-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}.empty{text-align:center;padding:60px 20px;background:var(--color-bg-alt);border-radius:20px;display:grid;justify-items:center;gap:16px}.empty p{max-width:50ch;color:var(--color-muted)}.empty a{text-decoration:underline}.loading{padding:40px;text-align:center}.pagination{display:flex;justify-content:center;align-items:center;gap:20px;margin-top:32px}.events{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;margin-top:32px}.event{display:block;text-decoration:none;border:1px solid #e2e8f0;border-radius:20px;padding:14px}.event img{width:100%;aspect-ratio:3/1;object-fit:contain}.event h2{margin:16px 0 10px}.event p{font-size:14px;color:var(--color-muted);line-height:1.65}.event span{display:block;margin-top:16px;font-weight:600}.event:focus-visible{outline:3px solid #5743bb;outline-offset:3px}@media(max-width:900px){.product-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.intro{flex-direction:column}}@media(max-width:600px){.events{grid-template-columns:1fr}.product-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.toolbar{flex-wrap:wrap}.toolbar label:last-child{flex-basis:100%}.intro h1{font-size:28px}.badge{white-space:normal}}`],
})
export class CampaignComponent {
  readonly service=inject(CampaignService);private readonly route=inject(ActivatedRoute);private readonly api=inject(RentifyMarketplaceService);private readonly title=inject(Title);
  readonly campaign=signal<Campaign|null>(null);readonly products=signal<Product[]>([]);readonly total=signal(0);readonly error=signal('');readonly unavailable=signal(false);readonly loading=signal(false);
  slug='';term='';sort='newest';page=1;private request=0;
  constructor(){this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(p=>{this.slug=p.get('slug')||'';this.page=1;this.term='';if(this.slug)void this.load();else this.title.setTitle('Campaigns & events | Rentify Marketplace');});}
  pages(){return Math.max(1,Math.ceil(this.total()/24));}search(){this.page=1;void this.load();}go(page:number){this.page=page;void this.load();}
  async load(){const request=++this.request;this.loading.set(true);this.error.set('');this.unavailable.set(false);
    try{const r=await this.service.detail(this.slug,this.page,this.term,this.sort);if(request!==this.request)return;let stores=new Map<string,RentifyStore>();try{const ids=[...new Set(r.products.map(p=>p.storeId))];if(ids.length){const result=await firstValueFrom(this.api.stores(ids));stores=new Map((result.data||[]).map(s=>[s.id,s]));}}catch{/* Product availability does not depend on store branding. */}if(request!==this.request)return;
      this.campaign.set(r.campaign);this.total.set(r.total);this.products.set(r.products.map(p=>toProductFromRentify(p,stores)));this.title.setTitle(r.campaign.title+' | Rentify Marketplace');
    }catch(e:any){if(request!==this.request)return;this.campaign.set(null);this.products.set([]);this.unavailable.set(e.status===404);this.error.set(e.status===404?'The event may be scheduled, closed, or finished. Explore the marketplace for more finds.':'Please try again.');}finally{if(request===this.request)this.loading.set(false);}
  }
}
