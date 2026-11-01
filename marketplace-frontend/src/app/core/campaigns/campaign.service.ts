import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RentifyMarketplaceService, RentifyProduct } from '../rentify/rentify-marketplace.service';
export interface Campaign { id:string;slug:string;title:string;description:string;bannerUrl:string;startsAt:string;endsAt:string;minimumDiscount:number;homepage:boolean;priority:number }
export interface CampaignProducts { campaign:Campaign;products:RentifyProduct[];total:number;page:number;limit:number }
@Injectable({providedIn:'root'})
export class CampaignService {
  private readonly http=inject(HttpClient);private readonly api=inject(RentifyMarketplaceService);
  readonly campaigns=signal<Campaign[]>([]);readonly error=signal('');readonly loaded=signal(false);
  constructor(){void this.load();}
  async load(){this.loaded.set(false);this.error.set('');try{const r=await firstValueFrom(this.http.get<{campaigns:Campaign[]}>(this.api.commerce+'/api/marketplace/campaigns'));this.campaigns.set(r.campaigns);}catch{this.campaigns.set([]);this.error.set('Campaigns could not be loaded. Please try again.');}finally{this.loaded.set(true);}}
  detail(slug:string,page=1,search='',sort='newest') {return firstValueFrom(this.http.get<CampaignProducts>(this.api.commerce+'/api/marketplace/campaigns/'+encodeURIComponent(slug),{params:new HttpParams().set('page',page).set('search',search).set('sort',sort)}));}
}
