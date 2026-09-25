import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { productApi } from '@rentify/apis/apis/productApi';
import { useStorefrontCategories, useStorefrontWebsite } from '../website';
import { ownerText } from './ownerText';
import { createCategory, createProduct, getProductFormConfig, uploadStoreImage } from './ownerApi';

/**
 * Quick "add product" and "add category" forms for the store owner, shown in
 * the owner panel. Products are created through Commerce's normal product API
 * (which checks the owner's product permission and the store type's rules);
 * the store type's extra required fields come from Commerce as well.
 */
const MAX_PHOTOS = 5;
const inputClass =
  'block w-full rounded-lg border border-input bg-card px-3 py-2 text-base text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 aria-[invalid=true]:border-error sm:text-sm';
const labelClass = 'mb-1.5 block text-sm font-medium text-foreground';

const list = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

function TextField({ label, value, onChange, error, hint, type = 'text', multiline = false, ...props }) {
  const id = useId();
  const described = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
  const Control = multiline ? 'textarea' : 'input';
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <Control
        id={id}
        type={multiline ? undefined : type}
        rows={multiline ? 3 : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={described}
        className={inputClass}
        {...props}
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}

function PhotoPicker({ label, photos, onChange, max, websiteId, t }) {
  const id = useId();
  const input = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      onChange([...photos, await uploadStoreImage(websiteId, file)]);
    } catch {
      setError(t.uploadFailed);
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div>
      <span className={labelClass}>{label}</span>
      {photos.length > 0 && (
        <ul className="mb-2 grid grid-cols-4 gap-2">
          {photos.map((src, index) => (
            <li key={src} className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
              <img src={src} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(photos.filter((_, position) => position !== index))}
                className="absolute right-1 top-1 rounded-full bg-foreground/80 px-1.5 text-[0.6875rem] font-semibold text-background"
                aria-label={`${t.removeImage} ${index + 1}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {photos.length < max && (
        <>
          <input ref={input} id={id} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => upload(event.target.files?.[0])} />
          <label
            htmlFor={id}
            className={`inline-flex min-h-10 cursor-pointer items-center rounded-lg border border-dashed border-primary/50 px-3 text-sm font-medium text-primary hover:bg-primary/5 ${uploading ? 'pointer-events-none opacity-60' : ''}`}
          >
            {uploading ? t.uploading : t.upload}
          </label>
        </>
      )}
      {error && <p className="mt-1 text-sm text-error">{error}</p>}
    </div>
  );
}

const emptyProduct = (categoryId = '') => ({ name: '', price: '', stock: '10', categoryId, description: '', photos: [], extra: {} });

export function AddProductForm({ initialCategoryId = '', onDone }) {
  const t = ownerText();
  const dispatch = useDispatch();
  const { websiteId } = useStorefrontWebsite();
  const { categories } = useStorefrontCategories();
  const [form, setForm] = useState(() => emptyProduct(initialCategoryId));
  const [extraFields, setExtraFields] = useState(null);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ state: 'idle' });

  useEffect(() => {
    let active = true;
    getProductFormConfig(websiteId)
      .then((config) => active && setExtraFields(Array.isArray(config.quickAddFields) ? config.quickAddFields : []))
      .catch(() => active && setExtraFields([]));
    return () => {
      active = false;
    };
  }, [websiteId]);

  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));
  const setExtra = (key) => (value) => setForm((current) => ({ ...current, extra: { ...current.extra, [key]: value } }));

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = t.required;
    if (!(Number(form.price) > 0)) next.price = t.pricePositive;
    for (const field of extraFields || []) {
      const value = form.extra[field.key];
      const missing = field.type === 'list' ? list(value).length === 0 : !String(value ?? '').trim();
      if (field.required && missing) next[field.key] = t.required;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    const nicheAttributes = {};
    const options = [];
    for (const field of extraFields || []) {
      const raw = form.extra[field.key];
      const value = field.type === 'list' ? list(raw) : field.type === 'number' ? Number(raw) : String(raw || '').trim();
      if (field.target === 'nicheAttributes') nicheAttributes[field.key] = value;
      else if (field.target?.startsWith('option:')) {
        options.push({
          name: field.target.slice('option:'.length),
          type: field.optionType || 'select',
          values: value.map((item) => ({ value: item, label: item })),
        });
      }
    }

    setStatus({ state: 'saving' });
    try {
      const product = await createProduct(websiteId, {
        name: form.name.trim(),
        price: Number(form.price),
        stockQuantity: Math.max(0, Math.floor(Number(form.stock) || 0)),
        trackInventory: true,
        description: form.description.trim(),
        categoryId: form.categoryId || null,
        images: form.photos.map((url) => ({ url, alt: form.name.trim() })),
        status: 'active',
        nicheAttributes,
        ...(options.length && { options }),
      });
      dispatch(productApi.util.invalidateTags(['Product']));
      setStatus({ state: 'saved', productId: product?.id });
      setForm(emptyProduct(form.categoryId));
      setErrors({});
    } catch (error) {
      setStatus({ state: 'error', message: error.message });
    }
  };

  if (extraFields === null) return <p className="text-sm text-muted-foreground">{t.loadingForm}</p>;

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="text-sm text-muted-foreground">{t.productHelp}</p>
      <TextField label={`${t.name} *`} value={form.name} onChange={set('name')} error={errors.name} maxLength={200} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label={`${t.price} *`} type="number" inputMode="decimal" min="0.01" step="0.01" value={form.price} onChange={set('price')} error={errors.price} />
        <TextField label={t.stock} type="number" inputMode="numeric" min="0" step="1" value={form.stock} onChange={set('stock')} />
      </div>
      <div>
        <label htmlFor="owner-product-category" className={labelClass}>
          {t.category}
        </label>
        <select id="owner-product-category" value={form.categoryId} onChange={(event) => set('categoryId')(event.target.value)} className={inputClass}>
          <option value="">{t.noCategory}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      {(extraFields || []).map((field) => (
        <TextField
          key={field.key}
          label={`${field.label}${field.required ? ' *' : ''}`}
          hint={field.hint}
          type={field.type === 'number' ? 'number' : 'text'}
          value={form.extra[field.key] ?? ''}
          onChange={setExtra(field.key)}
          error={errors[field.key]}
        />
      ))}
      <TextField label={t.description} multiline value={form.description} onChange={set('description')} maxLength={2000} />
      <PhotoPicker label={t.photos} photos={form.photos} onChange={set('photos')} max={MAX_PHOTOS} websiteId={websiteId} t={t} />

      <div role="status" className="min-h-5 text-sm">
        {status.state === 'saved' && (
          <span className="text-success">
            {t.added}{' '}
            {status.productId && (
              <Link to={`/product/${encodeURIComponent(status.productId)}`} onClick={onDone} className="font-semibold underline underline-offset-4">
                {t.viewProduct}
              </Link>
            )}
          </span>
        )}
        {status.state === 'error' && <span className="text-error">{status.message || t.addFailed}</span>}
      </div>
      <button
        type="submit"
        disabled={status.state === 'saving'}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {status.state === 'saving' ? t.adding : t.addProduct}
      </button>
    </form>
  );
}

export function AddCategoryForm() {
  const t = ownerText();
  const { websiteId } = useStorefrontWebsite();
  const { refetch } = useStorefrontCategories();
  const [name, setName] = useState('');
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState({ state: 'idle' });

  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setError(t.required);
      return;
    }
    setError('');
    setStatus({ state: 'saving' });
    try {
      await createCategory(websiteId, { name: name.trim(), ...(photos[0] && { image: photos[0] }) });
      await refetch?.();
      setStatus({ state: 'saved' });
      setName('');
      setPhotos([]);
    } catch (caught) {
      setStatus({ state: 'error', message: caught.message });
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="text-sm text-muted-foreground">{t.categoryHelp}</p>
      <TextField label={`${t.name} *`} value={name} onChange={setName} error={error} maxLength={80} />
      <PhotoPicker label={t.photo} photos={photos} onChange={setPhotos} max={1} websiteId={websiteId} t={t} />
      <div role="status" className="min-h-5 text-sm">
        {status.state === 'saved' && <span className="text-success">{t.added}</span>}
        {status.state === 'error' && <span className="text-error">{status.message || t.addFailed}</span>}
      </div>
      <button
        type="submit"
        disabled={status.state === 'saving'}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {status.state === 'saving' ? t.adding : t.addCategory}
      </button>
    </form>
  );
}
