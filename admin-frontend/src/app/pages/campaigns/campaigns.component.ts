import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RentifyAdminService } from '../../core/rentify/rentify-admin.service';

@Component({
  selector: 'app-campaigns', standalone: true, imports: [CommonModule, FormsModule],
  template: `
    <header class="heading"><div><p class="eyebrow">Marketplace</p><h1>Campaigns & events</h1><p>Create seasonal collections, invite merchants, and review their products.</p></div>
      <button class="btn btn-primary" (click)="create()" [disabled]="busy()">New campaign</button></header>
    @if (error()) { <p class="alert" role="alert">{{error()}}</p> }
    @if (message()) { <p class="notice" role="status">{{message()}}</p> }
    <div class="workspace">
      <aside class="panel"><h2>Your campaigns</h2><button class="btn btn-default" (click)="load()" [disabled]="busy()">Refresh</button>
        @for (c of campaigns(); track c.id) {
          <button class="campaign-choice" [class.selected]="form.id === c.id" (click)="select(c)" [disabled]="busy()"><strong>{{c.title}}</strong><span>{{c.status}} · {{c.minimumDiscount}}% minimum</span><small>{{c.startsAt | date:'mediumDate'}} – {{c.endsAt | date:'mediumDate'}}</small></button>
        } @empty { <p>No campaigns yet. Create your first event.</p> }
      </aside>
      <div>
        <form class="panel editor" (ngSubmit)="save()">
          <h2>{{form.id ? 'Edit campaign' : 'Create campaign'}}</h2>
          <label>Title<input name="title" [(ngModel)]="form.title" required maxlength="160" placeholder="Halloween finds" /></label>
          <label>Page link<input name="slug" [(ngModel)]="form.slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" [readonly]="!!form.id" placeholder="halloween-finds" /></label>
          <label>About this event<textarea name="description" [(ngModel)]="form.description" required maxlength="5000" rows="3"></textarea></label>
          <label>Banner artwork<select name="artwork" [(ngModel)]="form.bannerUrl"><option value="/assets/collections/sale.png">Sale artwork</option><option value="/assets/collections/lifestyle.png">Lifestyle artwork</option><option value="/assets/collections/local-crafts.png">Local crafts artwork</option><option [value]="customBanner">Custom HTTPS image (enter below)</option></select></label>
          <label>Image URL<input name="banner" [(ngModel)]="form.bannerUrl" required placeholder="https://…" maxlength="1000" /></label>
          @if (form.bannerUrl) { <img class="banner" [src]="preview(form.bannerUrl)" alt="Campaign banner preview" /> }
          <div class="fields"><label>Starts (your local time)<input type="datetime-local" name="starts" [(ngModel)]="form.startsAt" required /></label><label>Ends (your local time)<input type="datetime-local" name="ends" [(ngModel)]="form.endsAt" required /></label></div>
          <div class="fields"><label>Submission deadline<input type="datetime-local" name="deadline" [(ngModel)]="form.submissionEndsAt" required /></label><label>Minimum discount (%)<input type="number" name="minimum" [(ngModel)]="form.minimumDiscount" min="0" max="100" step="1" required /></label></div>
          <p class="hint">Use 0 for a collection without a discount requirement. Discounts must already exist in the merchant's catalog and apply to every active product option. Approval does not change prices.</p>
          <div class="fields"><label>Status<select name="status" [(ngModel)]="form.status"><option value="draft">Draft — private</option><option value="published">Published — invite merchants</option><option value="closed">Closed — hidden</option></select></label><label>Display order<input name="priority" type="number" [(ngModel)]="form.priority" min="0" max="999" /></label></div>
          <label class="check"><input name="homepage" type="checkbox" [(ngModel)]="form.homepage" /> Feature this campaign on the marketplace homepage</label>
          <p class="hint">Published campaigns appear in every merchant's Campaigns page until they end. Shoppers see them only between the start and end dates.</p>
          <div class="actions"><button class="btn btn-primary" type="submit" [disabled]="busy()">{{busy() ? 'Saving…' : 'Save campaign'}}</button>
            @if (form.id) { <a class="btn btn-default" target="_blank" rel="noopener" [href]="api.marketplace + '/campaigns/' + form.slug">View public page</a> }</div>
        </form>
        @if (form.id) {
          <section class="panel"><h2>Merchant submissions</h2><p>Review products against the event and artwork. Reject unrelated products and explain why.</p>
            <button class="btn btn-default" (click)="details(form.id)" [disabled]="busy()">Refresh submissions</button>
            @for (s of submissions(); track s.id) {
              <article class="submission"><div><h3>{{s.product?.name || 'Product unavailable'}}</h3><small>Store {{s.storeId}}</small><p>{{s.product?.price | currency:'USD'}} <s>{{s.product?.compareAtPrice | currency:'USD'}}</s></p><span class="badge">{{s.status}}</span>
                @if (s.priceChanged) { <p class="alert">Prices changed after approval. Hidden until the merchant resubmits and you approve again.</p> }
                <p>{{s.merchantNote || 'No merchant note'}}</p></div>
                <div class="review"><label>Decision note<textarea [name]="'note-' + s.id" [(ngModel)]="reviewNotes[s.id]" maxlength="1000" rows="2" placeholder="Required when rejecting"></textarea></label>
                  <div class="actions"><button class="btn btn-primary" (click)="decide(s, 'approved')" [disabled]="busy() || s.status === 'withdrawn'">Approve</button><button class="btn btn-default" (click)="decide(s, 'rejected')" [disabled]="busy() || s.status === 'withdrawn'">Reject / remove</button></div></div>
              </article>
            } @empty { <p>No submissions yet. Publishing makes the invitation available in merchant dashboards.</p> }
          </section>
          <section class="panel"><h2>Recent activity</h2>@for (event of audit(); track event.id) { <p class="activity">{{event.createdAt | date:'short'}} · {{event.action}} · {{event.actorId}}</p> }</section>
        }
      </div>
    </div>
  `,
  styles: [`
    .heading,.actions,.fields { display:flex;gap:16px;align-items:center;justify-content:space-between }.heading{margin-bottom:24px}.workspace{display:grid;grid-template-columns:260px minmax(0,1fr);gap:24px;align-items:start}.panel{background:var(--card,#fff);border:1px solid var(--border,#e2e8f0);border-radius:16px;padding:22px;margin-bottom:22px}.panel h2{margin:0 0 14px}.editor{display:grid;gap:16px}.editor label,.review label{display:grid;gap:6px;font-weight:600;font-size:13px}input,textarea,select{width:100%;box-sizing:border-box;padding:11px;border:1px solid #cbd5e1;border-radius:9px;background:white;color:#0f172a;font:inherit}.fields{align-items:start}.fields label{flex:1;min-width:0}.hint,small{color:#64748b;font-size:12px;line-height:1.6}.banner{width:100%;aspect-ratio:3/1;object-fit:contain;border-radius:12px}.editor .check{display:flex;align-items:center}.check input{width:auto}.campaign-choice{display:grid;gap:7px;text-align:left;width:100%;border:1px solid #e2e8f0;background:transparent;border-radius:10px;padding:14px;margin-top:12px}.campaign-choice.selected{border-color:#4f46e5;background:#eef2ff}.campaign-choice span{font-size:12px}.submission{display:grid;grid-template-columns:1fr 1fr;gap:20px;border-top:1px solid #e2e8f0;margin-top:20px;padding-top:20px}.alert{background:#fff1f2;color:#9f1239;padding:12px;border-radius:8px}.notice{background:#ecfdf5;color:#065f46;padding:12px}.activity{font-size:12px;overflow-wrap:anywhere}.actions{justify-content:flex-start;flex-wrap:wrap}.review{display:grid;gap:12px}.eyebrow{text-transform:uppercase;font-size:12px;letter-spacing:.1em;color:#64748b}@media(max-width:900px){.workspace{grid-template-columns:1fr}.fields,.heading{flex-direction:column;align-items:stretch}.submission{grid-template-columns:1fr}}
  `],
})
export class CampaignsComponent {
  readonly api = inject(RentifyAdminService);
  private readonly http = inject(HttpClient);
  readonly campaigns = signal<any[]>([]); readonly submissions = signal<any[]>([]); readonly audit = signal<any[]>([]);
  readonly busy = signal(false); readonly error = signal(''); readonly message = signal('');
  readonly customBanner = 'https://'; reviewNotes: Record<string,string> = {};
  form: any = this.blank();
  constructor() { void this.load(); }
  private blank() { return { title:'',slug:'',description:'',bannerUrl:'/assets/collections/sale.png',startsAt:'',endsAt:'',submissionEndsAt:'',minimumDiscount:0,homepage:true,priority:0,status:'draft' }; }
  create() { this.form=this.blank();this.submissions.set([]);this.audit.set([]);this.error.set('');this.message.set(''); }
  preview(url:string) { return url.startsWith('/assets/') ? this.api.marketplace + url : url; }
  private date(value:string) { const d = new Date(value);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16); }
  select(c:any) { this.form={...c,startsAt:this.date(c.startsAt),endsAt:this.date(c.endsAt),submissionEndsAt:this.date(c.submissionEndsAt)};this.message.set('');void this.details(c.id); }
  private failure(e:any) { this.error.set(e?.error?.error?.message || e?.error?.error || e?.message || 'Request failed. Try again.'); }
  async load() { this.error.set('');try { const r:any=await firstValueFrom(this.http.get(this.api.commerce+'/api/admin/campaigns'));this.campaigns.set(r.campaigns); }catch(e){this.failure(e);} }
  async details(id:string) { this.error.set('');try { const r:any=await firstValueFrom(this.http.get(this.api.commerce+'/api/admin/campaigns/'+id));if(this.form.id!==id)return;this.submissions.set(r.submissions);this.audit.set(r.audit); }catch(e){this.failure(e);} }
  async save() {
    this.busy.set(true);this.error.set('');this.message.set('');
    try { const body={...this.form,startsAt:new Date(this.form.startsAt).toISOString(),endsAt:new Date(this.form.endsAt).toISOString(),submissionEndsAt:new Date(this.form.submissionEndsAt).toISOString()};
      const root=this.api.commerce+'/api/admin/campaigns';const r:any=await firstValueFrom(this.form.id?this.http.patch(root+'/'+this.form.id,body):this.http.post(root,body));await this.load();this.select(r.campaign);this.message.set('Campaign saved. Published events are available to merchants.');
    }catch(e){this.failure(e);}finally{this.busy.set(false);}
  }
  async decide(s:any,status:string) {
    this.busy.set(true);this.error.set('');try { await firstValueFrom(this.http.post(this.api.commerce+'/api/admin/campaigns/'+this.form.id+'/submissions/'+s.id+'/decision',{status,note:this.reviewNotes[s.id]||'',revision:s.revision}));await this.details(this.form.id);this.message.set('Decision saved.'); }catch(e){this.failure(e);}finally{this.busy.set(false);}
  }
}
