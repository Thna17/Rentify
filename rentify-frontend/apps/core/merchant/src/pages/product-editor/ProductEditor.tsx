import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ImagePlus, PackagePlus, Plus, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from '@rentify/utils';
import { Button } from '@rentify/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@rentify/shared/ui/card';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { Textarea } from '@rentify/shared/ui/textarea';
import { Alert, AlertDescription } from '@rentify/shared/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@rentify/shared/ui/select';
import { PageHeader } from '../../layouts/dashboard/PageHeader';
import { WorkspaceState } from '../../components/WorkspaceState';
import { useChannels } from '../../context/ChannelContext';
// @ts-expect-error Legacy JavaScript image adapter has no declaration file yet.
import { selectProductImages, uploadProductImages } from '../../services/productImages';
import { productEditorApi, toEditorForm } from './productEditorApi';
import { blankProduct, blankVariant, editorStateFor, productPayload, type ProductEditorForm } from './productEditorModel';
import { productEditorCopy } from './productEditorCopy';

type LoadState = 'loading' | 'ready' | 'forbidden' | 'conflict' | 'timeout' | 'offline' | 'error';

export default function ProductEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language } = useTranslation();
  const copy = productEditorCopy[language === 'kh' ? 'kh' : 'en'];
  const { store } = useChannels();
  const storeId = store?.storeId || store?.id;
  const [form, setForm] = useState<ProductEditorForm>(blankProduct);
  const [categories, setCategories] = useState<string[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileAlts, setFileAlts] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const load = useCallback(async () => {
    if (!storeId) return;
    setState('loading'); setMessage('');
    try {
      const [taxonomy, product] = await Promise.all([
        productEditorApi.categories(),
        id ? productEditorApi.get(storeId, id) : Promise.resolve(null),
      ]);
      setCategories(taxonomy);
      if (product) setForm(toEditorForm(product));
      else setForm((current) => ({
        ...current,
        marketplaceCategory: current.marketplaceCategory ||
          (taxonomy.includes(store?.primaryCategory) ? store.primaryCategory : ''),
      }));
      setState('ready');
    } catch (error) {
      const next = editorStateFor(error);
      setState(next); setMessage(copy[next]);
    }
  }, [copy, id, store?.primaryCategory, storeId]);

  useEffect(() => { void load(); }, [load]);

  const totalStock = useMemo(() => form.variants
    .filter((variant) => variant.status === 'active')
    .reduce((sum, variant) => sum + (Number(variant.stockQuantity) || 0), 0), [form.variants]);
  const fromPrice = useMemo(() => {
    const prices = form.variants.map((variant) => Number(variant.price)).filter((value) => value > 0);
    return prices.length ? Math.min(...prices).toFixed(2) : '0.00';
  }, [form.variants]);

  const chooseFiles = (selected: FileList | null) => {
    const result = selectProductImages(selected, form.images.length + files.length);
    setFiles((current) => [...current, ...result.accepted]);
    setFileAlts((current) => [...current, ...result.accepted.map(() => '')]);
    setMessage(result.rejected.length ? `${copy.imageError} ${result.rejected.join(' ')}` : '');
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const invalid = !form.name.trim() || !form.marketplaceCategory || !form.variants.length ||
      form.variants.some((variant) => !variant.sku.trim() || !(Number(variant.price) > 0) ||
        !Number.isSafeInteger(Number(variant.stockQuantity)) || Number(variant.stockQuantity) < 0);
    if (invalid) { setMessage(copy.validation); return; }
    setBusy(true); setMessage('');
    try {
      const uploaded = await uploadProductImages({ files, storeId, onProgress: setUploadProgress });
      const images = [
        ...form.images,
        ...uploaded.map((image: { url: string }, index: number) => ({ url: image.url, alt: fileAlts[index] || '' })),
      ];
      const result = await productEditorApi.save(storeId, id, productPayload({ ...form, images }));
      setForm(toEditorForm(result)); setFiles([]); setFileAlts([]); setState('ready');
      setMessage(copy.saved);
      if (!id) navigate(`/products/edit/${result.id}`, { replace: true });
    } catch (error) {
      const next = editorStateFor(error);
      setState(next); setMessage(copy[next]);
    } finally { setBusy(false); setUploadProgress(0); }
  };

  if (!storeId) return <WorkspaceState kind="empty" title={copy.error} />;
  if (state !== 'ready' && state !== 'conflict') {
    return <WorkspaceState kind={state} title={message || copy.loading} actionLabel={state === 'loading' || state === 'forbidden' ? undefined : copy.retry} onAction={state === 'loading' || state === 'forbidden' ? undefined : load} />;
  }

  return (
    <div className="min-h-full">
      <PageHeader
        title={id ? copy.editTitle : copy.createTitle}
        description={copy.description}
        icon={PackagePlus}
        breadcrumb={[{ label: copy.products, href: '/products' }, { label: id ? copy.editTitle : copy.createTitle }]}
      />
      <form onSubmit={save} className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 sm:px-6 md:px-8 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <div className="space-y-6">
          {message && <Alert variant={state === 'conflict' ? 'destructive' : 'default'}><AlertDescription>{message}</AlertDescription></Alert>}
          <Card className="border-border/70 shadow-[var(--shadow-soft)]">
            <CardHeader><CardTitle>{copy.details}</CardTitle></CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <Field label={copy.name} id="product-name"><Input id="product-name" required maxLength={200} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
              <div className="space-y-2"><Label htmlFor="product-category">{copy.category}</Label><Select value={form.marketplaceCategory} onValueChange={(value) => setForm({ ...form, marketplaceCategory: value })}><SelectTrigger id="product-category"><SelectValue placeholder={copy.chooseCategory} /></SelectTrigger><SelectContent>{categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></div>
              <Field label={copy.descriptionLabel} id="product-description" className="md:col-span-2"><Textarea id="product-description" maxLength={4000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
              <div className="space-y-2"><Label htmlFor="product-publication">{copy.publication}</Label><Select value={form.status} onValueChange={(value: ProductEditorForm['status']) => setForm({ ...form, status: value })}><SelectTrigger id="product-publication"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">{copy.draft}</SelectItem><SelectItem value="active">{copy.active}</SelectItem>{id && <SelectItem value="archived">{copy.archived}</SelectItem>}</SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="product-visibility">{copy.visibility}</Label><Select value={form.marketplaceVisibility === null ? 'inherit' : String(form.marketplaceVisibility)} onValueChange={(value) => setForm({ ...form, marketplaceVisibility: value === 'inherit' ? null : value === 'true' })}><SelectTrigger id="product-visibility"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="inherit">{copy.inherit}</SelectItem><SelectItem value="true">{copy.visible}</SelectItem><SelectItem value="false">{copy.hidden}</SelectItem></SelectContent></Select></div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-[var(--shadow-soft)]">
            <CardHeader><CardTitle>{copy.skus}</CardTitle><p className="text-sm leading-6 text-muted-foreground">{copy.skuHelp}</p></CardHeader>
            <CardContent className="space-y-4">
              {form.variants.map((variant, index) => (
                <fieldset key={variant.id || index} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2 lg:grid-cols-6">
                  <legend className="sr-only">{copy.sku} {index + 1}</legend>
                  <Field label={copy.sku} id={`sku-${index}`}><Input id={`sku-${index}`} required maxLength={120} value={variant.sku} onChange={(event) => setForm({ ...form, variants: form.variants.map((item, itemIndex) => itemIndex === index ? { ...item, sku: event.target.value } : item) })} /></Field>
                  <Field label={copy.price} id={`price-${index}`}><Input id={`price-${index}`} required type="number" min="0.01" step="0.01" value={variant.price} onChange={(event) => setForm({ ...form, variants: form.variants.map((item, itemIndex) => itemIndex === index ? { ...item, price: event.target.value } : item) })} /></Field>
                  <Field label={copy.stock} id={`stock-${index}`}><Input id={`stock-${index}`} required type="number" min="0" step="1" value={variant.stockQuantity} onChange={(event) => setForm({ ...form, variants: form.variants.map((item, itemIndex) => itemIndex === index ? { ...item, stockQuantity: event.target.value } : item) })} /></Field>
                  <Field label={copy.optionName} id={`option-name-${index}`}><Input id={`option-name-${index}`} value={variant.optionName} onChange={(event) => setForm({ ...form, variants: form.variants.map((item, itemIndex) => itemIndex === index ? { ...item, optionName: event.target.value } : item) })} /></Field>
                  <Field label={copy.optionValue} id={`option-value-${index}`}><Input id={`option-value-${index}`} value={variant.optionValue} onChange={(event) => setForm({ ...form, variants: form.variants.map((item, itemIndex) => itemIndex === index ? { ...item, optionValue: event.target.value } : item) })} /></Field>
                  <div className="flex items-end gap-2"><Select value={variant.status} onValueChange={(value: 'active' | 'disabled') => setForm({ ...form, variants: form.variants.map((item, itemIndex) => itemIndex === index ? { ...item, status: value } : item) })}><SelectTrigger aria-label={`${copy.sku} ${index + 1} status`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">{copy.enabled}</SelectItem><SelectItem value="disabled">{copy.disabled}</SelectItem></SelectContent></Select>{form.variants.length > 1 && <Button type="button" size="icon" variant="outline" aria-label={`${copy.removeSku} ${index + 1}`} onClick={() => setForm({ ...form, variants: form.variants.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>}</div>
                </fieldset>
              ))}
              <Button type="button" variant="outline" onClick={() => setForm({ ...form, variants: [...form.variants, blankVariant()] })}><Plus className="mr-2 h-4 w-4" aria-hidden="true" />{copy.addSku}</Button>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-[var(--shadow-soft)]">
            <CardHeader><CardTitle>{copy.images}</CardTitle><p className="text-sm leading-6 text-muted-foreground">{copy.imageHelp}</p></CardHeader>
            <CardContent className="space-y-4">
              <Label htmlFor="product-images" className="inline-flex cursor-pointer items-center rounded-md border border-input px-4 py-2"><ImagePlus className="mr-2 h-4 w-4" aria-hidden="true" />{copy.upload}</Label>
              <Input id="product-images" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="sr-only" onChange={(event) => chooseFiles(event.target.files)} />
              {[...form.images.map((image) => ({ ...image, saved: true })), ...files.map((file, index) => ({ url: URL.createObjectURL(file), alt: fileAlts[index], saved: false }))].map((image, index) => (
                <div key={`${image.url}-${index}`} className="grid items-center gap-3 rounded-xl border border-border p-3 sm:grid-cols-[4rem_1fr_auto]">
                  <img src={image.url} alt="" className="h-16 w-16 rounded-lg object-cover" onError={(event) => { event.currentTarget.hidden = true; }} />
                  <Field label={copy.alt} id={`image-alt-${index}`}><Input id={`image-alt-${index}`} maxLength={240} value={image.alt} onChange={(event) => image.saved ? setForm({ ...form, images: form.images.map((item, itemIndex) => itemIndex === index ? { ...item, alt: event.target.value } : item) }) : setFileAlts(fileAlts.map((item, itemIndex) => itemIndex === index - form.images.length ? event.target.value : item))} /></Field>
                  <Button type="button" size="icon" variant="outline" aria-label={`${copy.removeImage} ${index + 1}`} onClick={() => image.saved ? setForm({ ...form, images: form.images.filter((_, itemIndex) => itemIndex !== index) }) : (setFiles(files.filter((_, itemIndex) => itemIndex !== index - form.images.length)), setFileAlts(fileAlts.filter((_, itemIndex) => itemIndex !== index - form.images.length)))}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>
                </div>
              ))}
              {uploadProgress > 0 && <p role="status" className="text-sm text-muted-foreground">{uploadProgress}%</p>}
            </CardContent>
          </Card>
          <div className="flex flex-wrap gap-3"><Button type="submit" disabled={busy}>{busy ? copy.saving : copy.save}</Button><Button type="button" variant="outline" onClick={() => navigate('/products')}>{copy.cancel}</Button></div>
        </div>

        <aside aria-label={copy.preview} className="lg:sticky lg:top-24 lg:self-start">
          <Card className="overflow-hidden border-border/70 shadow-[var(--shadow-soft)]"><div className="grid aspect-[4/3] place-items-center bg-muted">{form.images[0]?.url ? <img src={form.images[0].url} alt={form.images[0].alt} className="h-full w-full object-cover" /> : <ImagePlus className="h-8 w-8 text-muted-foreground" aria-label={copy.noImage} />}</div><CardContent className="space-y-3 p-5"><h2 className="text-lg font-semibold leading-snug">{form.name || copy.createTitle}</h2><p className="text-sm text-muted-foreground">{copy.fromPrice} ${fromPrice} · {copy.totalStock} {totalStock}</p><p className="text-xs leading-5 text-muted-foreground">{copy.previewHelp}</p></CardContent></Card>
        </aside>
      </form>
    </div>
  );
}

function Field({ label, id, className = '', children }: { label: string; id: string; className?: string; children: ReactNode }) {
  return <div className={`space-y-2 ${className}`}><Label htmlFor={id}>{label}</Label>{children}</div>;
}
