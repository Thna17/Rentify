import { useEffect, useState } from 'react';
import { Package, Truck, ImagePlus } from 'lucide-react';
import { ECOMMERCE_API_ROOT, RENTIFY_API_BASE } from '@rentify/shared/config/urls';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { Textarea } from '@rentify/shared/ui/textarea';
import { Button } from '@rentify/shared/ui/button';
import { Badge } from '@rentify/shared/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@rentify/shared/ui/select';
import { ImageUploader } from '../product-form/components/ImageUploader';
import { uploadProductImages } from '../../services/productImages';

const commerce = `${ECOMMERCE_API_ROOT}/api`;

async function getJson(url, options = {}) {
  const response = await fetch(url, { credentials: 'include', ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.message || 'Request failed');
  return data;
}

export default function StoreCatalogPage({ storeId: suppliedStoreId }) {
  const [storeId, setStoreId] = useState(suppliedStoreId || null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [deliveryPolicy, setDeliveryPolicy] = useState(null);
  const [deliveryFee, setDeliveryFee] = useState('');
  const [deliveryBusy, setDeliveryBusy] = useState(false);
  const [productImages, setProductImages] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageErrors, setImageErrors] = useState([]);
  const [form, setForm] = useState({
    name: '', description: '', price: '', stockQuantity: 0,
    marketplaceCategory: '', status: 'draft',
  });

  async function refresh(id) {
    const result = await getJson(`${commerce}/stores/${id}/products`);
    setProducts(result.products || []);
  }

  async function loadDelivery(id) {
    const result = await getJson(`${commerce}/stores/${id}/marketplace-delivery`);
    setDeliveryPolicy(result.policy);
    setDeliveryFee(result.policy?.flatFee ?? '');
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      getJson(`${commerce}/marketplace/categories`),
      suppliedStoreId ? Promise.resolve({ data: { id: suppliedStoreId } })
        : getJson(`${RENTIFY_API_BASE}/api/stores/mine`),
    ]).then(async ([taxonomy, storeResult]) => {
      if (!active) return;
      setCategories(taxonomy.categories || []);
      setStoreId(storeResult.data.id);
      await Promise.all([refresh(storeResult.data.id), loadDelivery(storeResult.data.id)]);
    }).catch((error) => { if (active) setMessage(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [suppliedStoreId]);

  async function create(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const images = await uploadProductImages({
        files: productImages,
        storeId,
        onProgress: setUploadProgress,
      });
      await getJson(`${commerce}/stores/${storeId}/products`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form, price: Number(form.price), stockQuantity: Number(form.stockQuantity), images,
        }),
      });
      setForm({ name: '', description: '', price: '', stockQuantity: 0,
        marketplaceCategory: '', status: 'draft' });
      setProductImages([]);
      setImageErrors([]);
      await refresh(storeId);
      setMessage('Product saved to your Store catalog.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); setUploadProgress(0); }
  }

  async function changeProduct(product, changes) {
    setBusy(true);
    setMessage('');
    try {
      await getJson(`${commerce}/stores/${storeId}/products/${product.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedVersion: product.version, ...changes }),
      });
      await refresh(storeId);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  async function saveDeliveryFee(event) {
    event.preventDefault();
    const amount = Number(deliveryFee);
    if (!/^\d+(\.\d{1,2})?$/.test(deliveryFee.trim()) ||
        !Number.isFinite(amount) || amount > 1000) {
      setMessage('Enter a USD delivery fee from 0.00 to 1000.00 with at most two decimals.');
      return;
    }
    setDeliveryBusy(true);
    setMessage('');
    try {
      const result = await getJson(`${commerce}/stores/${storeId}/marketplace-delivery`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flatFee: amount.toFixed(2),
          ...(deliveryPolicy ? { expectedVersion: deliveryPolicy.version } : {}) }),
      });
      setDeliveryPolicy(result.policy);
      setDeliveryFee(result.policy.flatFee);
      setMessage('Marketplace delivery fee posted. Buyers will see it before checkout.');
    } catch (error) { setMessage(error.message); }
    finally { setDeliveryBusy(false); }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs font-medium text-muted-foreground">Loading catalog…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <div className="max-w-[1400px] mx-auto px-4 py-6 sm:px-6 md:px-8 md:py-8 space-y-6 md:space-y-8">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground">Store catalog</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            One product ID, price, and stock balance for your storefront and the marketplace.
          </p>
        </div>

        {message && (
          <p role="status" className="rounded-xl bg-primary/[0.06] px-4 py-3 text-sm text-primary">
            {message}
          </p>
        )}

        <Card className="[box-shadow:var(--shadow-soft)] border-transparent">
          <CardContent className="p-6">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Truck className="h-4 w-4" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Marketplace delivery fee</h3>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Post one flat fee per order. Buyers pay the shown fee with the product total on delivery. Enter 0 for free delivery.
            </p>
            <form onSubmit={saveDeliveryFee} className="mt-4 flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="delivery-fee">Delivery fee (USD)</Label>
                <Input
                  id="delivery-fee"
                  required
                  type="number"
                  min="0"
                  max="1000"
                  step="0.01"
                  value={deliveryFee}
                  onChange={(event) => setDeliveryFee(event.target.value)}
                  className="w-40 h-10 border-transparent [box-shadow:var(--shadow-soft)] bg-background"
                />
              </div>
              <Button type="submit" disabled={deliveryBusy || !storeId} className="h-10">
                {deliveryBusy ? 'Saving…' : deliveryPolicy ? 'Update fee' : 'Post fee'}
              </Button>
            </form>
            {!deliveryPolicy && (
              <p className="mt-3 text-sm text-amber-600">
                Post a fee before your approved products appear in the marketplace.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="[box-shadow:var(--shadow-soft)] border-transparent">
          <CardContent className="p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Package className="h-4 w-4" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Add a product</h3>
            </div>

            <form onSubmit={create} className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="product-name">Name</Label>
                <Input
                  id="product-name"
                  required
                  maxLength={200}
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className="border-transparent [box-shadow:var(--shadow-soft)] bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Marketplace category</Label>
                <Select
                  value={form.marketplaceCategory}
                  onValueChange={(value) => setForm({ ...form, marketplaceCategory: value })}
                >
                  <SelectTrigger className="w-full h-9 border-transparent [box-shadow:var(--shadow-soft)] bg-background">
                    <SelectValue placeholder="Choose category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="product-price">Price (USD)</Label>
                <Input
                  id="product-price"
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: event.target.value })}
                  className="border-transparent [box-shadow:var(--shadow-soft)] bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="product-stock">Stock</Label>
                <Input
                  id="product-stock"
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={form.stockQuantity}
                  onChange={(event) => setForm({ ...form, stockQuantity: event.target.value })}
                  className="border-transparent [box-shadow:var(--shadow-soft)] bg-background"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="product-description">Description</Label>
                <Textarea
                  id="product-description"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  className="border-transparent [box-shadow:var(--shadow-soft)] bg-background min-h-24"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center gap-2">
                  <ImagePlus className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Product images</p>
                </div>
                <p className="text-sm text-muted-foreground">Add up to 10 images. The first image becomes the cover.</p>
                <ImageUploader
                  images={productImages}
                  onImagesChange={(files) => setProductImages((current) => [...current, ...files])}
                  onRemoveImage={(index) => setProductImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  onValidationError={setImageErrors}
                  isUploading={busy}
                  uploadProgress={uploadProgress}
                />
                {imageErrors.length > 0 && (
                  <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/[0.06] p-3 text-sm text-destructive">
                    {imageErrors.map((error) => <p key={error}>{error}</p>)}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Publication</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => setForm({ ...form, status: value })}
                >
                  <SelectTrigger className="w-full h-9 border-transparent [box-shadow:var(--shadow-soft)] bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Button type="submit" disabled={busy || !storeId} className="h-10">
                  {busy ? (uploadProgress > 0 ? `Uploading ${uploadProgress}%…` : 'Saving…') : 'Save product'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="[box-shadow:var(--shadow-soft)] border-transparent">
          <CardContent className="p-6">
            <h3 className="text-base font-semibold text-foreground mb-1">Your products</h3>
            {products.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">No products yet.</p>
            )}
            <div className="mt-3 divide-y divide-border">
              {products.map((product) => (
                <div key={product.id} className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-44 flex-1">
                    <p className="font-medium text-foreground">{product.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-muted-foreground">${product.price} · Stock {product.stockQuantity}</p>
                      <Badge variant={product.status === 'active' ? 'default' : 'subtle'} className="capitalize">
                        {product.status}
                      </Badge>
                    </div>
                  </div>

                  <Select
                    value={product.marketplaceCategory || ''}
                    onValueChange={(value) => changeProduct(product, { marketplaceCategory: value })}
                  >
                    <SelectTrigger aria-label={`Category for ${product.name}`} className="h-9 border-transparent [box-shadow:var(--shadow-soft)] bg-background w-[180px]">
                      <SelectValue placeholder="Choose category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={() => changeProduct(product, { status: product.status === 'active' ? 'draft' : 'active' })}
                    className="border-transparent [box-shadow:var(--shadow-soft)] bg-background text-foreground hover:bg-muted/60"
                  >
                    {product.status === 'active' ? 'Make draft' : 'Publish'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={() => changeProduct(product, { marketplaceVisibility: product.marketplaceVisibility === false ? null : false })}
                    className="border-transparent [box-shadow:var(--shadow-soft)] bg-background text-foreground hover:bg-muted/60"
                  >
                    {product.marketplaceVisibility === false ? 'Use Store visibility' : 'Hide from marketplace'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
