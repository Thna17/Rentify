import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, Store, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { RENTIFY_API_BASE } from '@rentify/shared/config/urls';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@rentify/shared/ui/card';
import { Button } from '@rentify/shared/ui/button';
import { useChannels } from '../../../context/ChannelContext';

// Same rules as Core's /api/stores/mine/logo upload (SVG is never accepted).
export const LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_LOGO_BYTES = 5 * 1024 * 1024;

/** Returns a message when the file cannot be used as a logo, otherwise null. */
export const logoFileProblem = (file: File): string | null => {
  if (!LOGO_TYPES.includes(file.type)) return 'Use a JPG, PNG, WebP or GIF image.';
  if (file.size > MAX_LOGO_BYTES) return 'The logo must be 5 MB or smaller.';
  return null;
};

const errorMessage = async (response: Response, fallback: string) => {
  try {
    const body = await response.json();
    return body?.error || body?.message || fallback;
  } catch {
    return fallback;
  }
};

/**
 * The store's logo, shown on its marketplace card and store page. Only the
 * store owner can change it; the image is uploaded to Rentify's image storage.
 */
export const StoreLogoCard: React.FC = () => {
  const { store, setStore } = useChannels();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
  const [broken, setBroken] = useState(false);

  if (!store) return null;
  const logoUrl: string | null = store.logoUrl || null;
  const initial = String(store.name || '').trim().charAt(0).toUpperCase() || '?';

  const saved = (next: any, message: string) => {
    setStore(next);
    setBroken(false);
    toast.success(message);
  };

  const upload = async (file: File) => {
    const problem = logoFileProblem(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy('upload');
    try {
      const body = new FormData();
      body.append('logo', file);
      const response = await fetch(`${RENTIFY_API_BASE}/api/stores/mine/logo`, {
        method: 'POST',
        credentials: 'include',
        body,
      });
      if (!response.ok) throw new Error(await errorMessage(response, 'The logo could not be uploaded.'));
      const result = await response.json();
      saved({ ...store, ...result.data }, 'Store logo updated');
    } catch (error: any) {
      toast.error(error?.message || 'The logo could not be uploaded.');
    } finally {
      setBusy(null);
      if (input.current) input.current.value = '';
    }
  };

  const remove = async () => {
    setBusy('remove');
    try {
      const response = await fetch(`${RENTIFY_API_BASE}/api/stores/mine`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoUrl: '' }),
      });
      if (!response.ok) throw new Error(await errorMessage(response, 'The logo could not be removed.'));
      const result = await response.json();
      saved({ ...store, ...result.data, logoUrl: null }, 'Store logo removed');
    } catch (error: any) {
      toast.error(error?.message || 'The logo could not be removed.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Store className="h-5 w-5" aria-hidden="true" />
          Store logo
        </CardTitle>
        <CardDescription>Shown on your store card and store page in the Rentify Marketplace.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-muted text-3xl font-semibold text-muted-foreground">
            {logoUrl && !broken ? (
              <img src={logoUrl} alt={`${store.name || 'Store'} logo`} className="h-full w-full object-contain" onError={() => setBroken(true)} />
            ) : (
              <span aria-hidden="true">{initial}</span>
            )}
          </div>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              A square image works best. JPG, PNG, WebP or GIF, up to 5 MB.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                ref={input}
                type="file"
                accept={LOGO_TYPES.join(',')}
                className="hidden"
                aria-label="Choose a store logo"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) upload(file);
                }}
              />
              <Button type="button" onClick={() => input.current?.click()} disabled={busy !== null}>
                {busy === 'upload' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                {logoUrl ? 'Change logo' : 'Upload logo'}
              </Button>
              {logoUrl && (
                <Button type="button" variant="outline" onClick={remove} disabled={busy !== null}>
                  {busy === 'remove' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StoreLogoCard;
