import React, { useEffect, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { RENTIFY_API_BASE } from '@rentify/shared/config/urls';
import { useChannels } from '../../../context/ChannelContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@rentify/shared/ui/card';
import { Button } from '@rentify/shared/ui/button';

const COLORS = [
  { value: '#4f46e5', label: 'Indigo' }, { value: '#275643', label: 'Forest' },
  { value: '#963827', label: 'Clay' }, { value: '#9a691b', label: 'Gold' },
  { value: '#263750', label: 'Midnight' },
];

export function MarketplaceColorCard() {
  const { store, setStore } = useChannels();
  const [selected, setSelected] = useState(store?.marketplaceColor || COLORS[0].value);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { setSelected(store?.marketplaceColor || COLORS[0].value); }, [store?.id, store?.marketplaceColor]);
  if (!store) return null;
  const save = async () => {
    setSaving(true); setMessage('');
    try {
      const response = await fetch(`${RENTIFY_API_BASE}/api/stores/mine`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketplaceColor: selected }),
      });
      const result = await response.json();
      if (!response.ok || !result.data) throw new Error(result.error || 'Could not save the color. Please retry.');
      setStore(result.data); setMessage('Marketplace color saved.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save the color.'); }
    finally { setSaving(false); }
  };
  return <Card>
    <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" />Marketplace color</CardTitle><CardDescription>Choose your store’s accent color on Rentify Marketplace. The shared layout stays the same. This does not change your storefront template or theme.</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      <div role="group" aria-label="Marketplace accent color" className="flex flex-wrap gap-2">
        {COLORS.map(color => <button key={color.value} type="button" aria-pressed={selected === color.value} disabled={saving} onClick={() => { setSelected(color.value); setMessage(''); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ borderColor: selected === color.value ? color.value : undefined }}><span className="grid h-5 w-5 place-items-center rounded-full text-white" style={{ background: color.value }}>{selected === color.value && <Check size={13} />}</span>{color.label}</button>)}
      </div>
      <div className="rounded-xl border p-4"><div className="mb-3 h-2 rounded-full" style={{ background: selected }} /><p className="text-sm font-semibold">{store.name}</p><p className="mt-1 text-xs text-muted-foreground">Marketplace store preview</p><span className="mt-3 inline-block rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ background: selected }}>Shop products</span></div>
      <Button type="button" disabled={saving || selected === (store.marketplaceColor || COLORS[0].value)} onClick={save}>{saving ? 'Saving…' : 'Save color'}</Button>
      {message && <p role="status" className="text-sm">{message}</p>}
    </CardContent>
  </Card>;
}
