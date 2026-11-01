import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useChannels } from '../../context/ChannelContext';
import { campaignRequest } from './campaignApi';
import { useAccess } from '../../utils/access';
export function CampaignInvitation() {
  const { store }=useChannels();const access=useAccess();const [count,setCount]=useState(0);
  useEffect(()=>{let current=true;if(store?.id && access.can('manage_products')) campaignRequest(`/stores/${store.id}/campaigns`).then(r=>{if(current)setCount(r.campaigns.filter((c:{acceptingSubmissions:boolean})=>c.acceptingSubmissions).length);}).catch(()=>{if(current)setCount(0);});return()=>{current=false;};},[store?.id]);
  return count ? <Link to="/campaigns" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card p-4 text-sm"><span><strong>{count} marketplace campaign{count===1?'':'s'} accepting products</strong><span className="mt-1 block text-muted-foreground">Explore the events and submit your products for admin review.</span></span><span className="font-semibold underline">View invitations →</span></Link> : null;
}
