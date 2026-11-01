import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { MARKETPLACE_URL } from '@rentify/shared/config/urls';
import { useChannels } from '../../context/ChannelContext';
import { campaignRequest } from './campaignApi';

type Campaign = { id:string;slug:string;title:string;description:string;bannerUrl:string;startsAt:string;endsAt:string;submissionEndsAt:string;minimumDiscount:number;acceptingSubmissions:boolean };
type Product = { id:string;name:string;price:string;compareAtPrice?:string };
type Submission = { id:string;campaignId:string;productId:string;status:string;revision:number;reviewNote:string;product?:Product };
const banner = (url:string) => url.startsWith('/assets/') ? `${MARKETPLACE_URL}${url}` : url;
const date = (value:string) => new Date(value).toLocaleString();

export default function CampaignsPage() {
  const { store } = useChannels();
  const [campaigns,setCampaigns]=useState<Campaign[]>([]),[submissions,setSubmissions]=useState<Submission[]>([]),[products,setProducts]=useState<Product[]>([]);
  const [selected,setSelected]=useState(''),[note,setNote]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
  const root=store?.id ? `/stores/${store.id}` : '';
  async function load() {
    if(!root)return; setLoading(true);setError('');
    try {
      const data=await campaignRequest(`${root}/campaigns`);setCampaigns(data.campaigns);setSubmissions(data.submissions);
      const all:Product[]=[];
      for(let page=1;page<=100;page++) {
        const r=await campaignRequest(`${root}/products?limit=60&page=${page}`);all.push(...r.products);
        if(all.length>=r.total || !r.products.length)break;
      }
      setProducts([...new Map(all.map(p=>[p.id,p])).values()]);
    }catch(e){setError((e as Error).message);}finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[root]);
  async function submit(c:Campaign) {
    if(!selected)return;setBusy(true);setError('');setMessage('');
    try{await campaignRequest(`${root}/campaigns/${c.id}/submissions`,{productId:selected,note});await load();setSelected('');setNote('');setMessage('Product submitted. The admin will review it before it appears in the campaign.');}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function withdraw(s:Submission) {
    setBusy(true);setError('');setMessage('');
    try{await campaignRequest(`${root}/campaigns/${s.campaignId}/submissions/${s.id}/withdraw`,{revision:s.revision});await load();setMessage('Product withdrawn from the campaign.');}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  if(!store?.id)return <div className="p-8">Open a Store to participate in marketplace campaigns.</div>;
  return <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-muted-foreground">Rentify Marketplace</p><h1 className="text-3xl font-semibold">Campaigns & events</h1><p className="mt-2 max-w-2xl text-muted-foreground">Join seasonal events and featured collections. Choose your products, send a request, and follow the admin's review here.</p></div><Button variant="outline" onClick={load} disabled={loading || busy}><RefreshCw className="size-4"/>Refresh</Button></header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-800">{message}</p>}
    {loading && <p role="status">Loading campaign invitations…</p>}
    {!loading && !error && campaigns.length===0 && <div className="rounded-2xl border bg-card p-8"><CalendarDays className="mb-3 size-8"/><h2 className="text-xl font-semibold">No open campaigns yet</h2><p className="mt-2 text-muted-foreground">New invitations appear here when the marketplace admin publishes an event.</p></div>}
    {campaigns.map(c=><section key={c.id} className="overflow-hidden rounded-2xl border bg-card">
      <img src={banner(c.bannerUrl)} alt={c.title} className="aspect-[3/1] w-full object-contain"/>
      <div className="space-y-5 p-5 md:p-7"><div><h2 className="text-2xl font-semibold">{c.title}</h2><p className="mt-2 whitespace-pre-wrap text-muted-foreground">{c.description}</p></div>
        <dl className="grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-muted-foreground">Event dates</dt><dd>{date(c.startsAt)} – {date(c.endsAt)}</dd></div><div><dt className="text-muted-foreground">Submit before</dt><dd>{date(c.submissionEndsAt)}</dd></div><div><dt className="text-muted-foreground">Minimum discount</dt><dd>{c.minimumDiscount ? `${c.minimumDiscount}% on every active product option` : 'No discount required'}</dd></div></dl>
        <p className="rounded-xl bg-muted p-3 text-sm">Submitting does not change your price. <Link className="underline" to="/catalog">Edit your catalog price</Link> first if a discount is required. If prices change after approval, resubmit for review.</p>
        {c.acceptingSubmissions ? <form onSubmit={e=>{e.preventDefault();void submit(c);}} className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="grid gap-2 text-sm font-medium">Choose one of your products<select value={selected} onChange={e=>setSelected(e.target.value)} required className="min-h-11 min-w-0 rounded-xl border bg-background p-3"><option value="">Choose a product…</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} · ${Number(p.price).toFixed(2)}</option>)}</select></label>
          <Button type="submit" className="self-end" disabled={busy || !selected}>Submit product<ArrowRight className="size-4"/></Button>
          <label className="grid gap-2 text-sm sm:col-span-2">Note for the admin (optional)<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={1000} rows={2} className="rounded-xl border bg-background p-3" placeholder="Explain why your product fits this event"/></label>
        </form> : <p className="font-medium">Submissions have closed. Approved products can remain visible until the event ends.</p>}
        <h3 className="font-semibold">Your submissions</h3>
        <ul className="divide-y">{submissions.filter(s=>s.campaignId===c.id).map(s=><li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><strong>{s.product?.name || 'Product unavailable'}</strong><p className="text-sm capitalize text-muted-foreground">{s.status}</p>{s.reviewNote && <p className="mt-1 text-sm">Admin: {s.reviewNote}</p>}</div>{s.status!=='withdrawn' && <Button variant="outline" disabled={busy} onClick={()=>withdraw(s)}>Withdraw</Button>}</li>)}</ul>
        <a href={`${MARKETPLACE_URL}/campaigns/${c.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm underline">View shopper page<ArrowRight className="size-4"/></a>
      </div>
    </section>)}
  </div>;
}
