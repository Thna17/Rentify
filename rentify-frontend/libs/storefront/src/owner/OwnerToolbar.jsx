import { useEffect, useId, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { DASHBOARD_URL } from '@rentify/shared/config/urls';
import { useStorefrontWebsite } from '../website';
import { contentImages, contentText, getContentValue } from '../content';
import { ownerText } from './ownerText';
import { saveStorefrontContent, uploadStoreImage } from './ownerApi';
import { AddCategoryForm, AddProductForm } from './OwnerAddForms';
import { ADD_CATEGORY, ADD_PRODUCT } from './ownerModes';

/**
 * Loaded only for the store's owner (see StorefrontOwner.jsx): a small bar
 * with "Edit store" and a side panel that edits the template's sections.
 * Saves go to Core, which re-checks ownership and validates every field.
 */
const valueFor = (content, field) =>
  field.type === 'image'
    ? field.multiple
      ? contentImages(getContentValue(content, field.label))
      : contentImages(getContentValue(content, field.label))[0] || ''
    : contentText(getContentValue(content, field.label));

const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function ImageField({ id, field, value, onChange, websiteId, t }) {
  const input = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const images = field.multiple ? value : value ? [value] : [];

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadStoreImage(websiteId, file);
      onChange(field.multiple ? [...images, url] : url);
    } catch {
      setError(t.uploadFailed);
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  };

  const removeAt = (index) => {
    const next = images.filter((_, position) => position !== index);
    onChange(field.multiple ? next : '');
  };

  const canAdd = field.multiple ? images.length < (field.max || 6) : images.length === 0;

  return (
    <div>
      {images.length > 0 && (
        <ul className="mb-2 grid grid-cols-3 gap-2">
          {images.map((src, index) => (
            <li key={`${src}-${index}`} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
              <img src={src} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="absolute right-1 top-1 rounded-full bg-foreground/80 px-2 py-0.5 text-[0.6875rem] font-semibold text-background hover:bg-foreground"
                aria-label={`${t.removeImage} ${index + 1}`}
              >
                {t.remove}
              </button>
            </li>
          ))}
        </ul>
      )}
      {canAdd && (
        <>
          <input
            ref={input}
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(event) => upload(event.target.files?.[0])}
          />
          <label
            htmlFor={id}
            className={`inline-flex min-h-10 cursor-pointer items-center rounded-lg border border-dashed border-primary/50 px-3 text-sm font-medium text-primary hover:bg-primary/5 ${uploading ? 'pointer-events-none opacity-60' : ''}`}
          >
            {uploading ? t.uploading : t.upload}
          </label>
        </>
      )}
      {error && <p className="mt-1.5 text-sm text-error">{error}</p>}
    </div>
  );
}

function Field({ field, value, onChange, error, websiteId, t }) {
  const id = useId();
  const describedBy = [field.hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
  const inputClass =
    'block w-full rounded-lg border border-input bg-card px-3 py-2 text-base text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 sm:text-sm';

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {field.label}
      </label>
      {field.type === 'image' ? (
        <ImageField id={id} field={field} value={value} onChange={onChange} websiteId={websiteId} t={t} />
      ) : field.multiline ? (
        <textarea id={id} rows={3} value={value} onChange={(event) => onChange(event.target.value)} aria-describedby={describedBy} aria-invalid={Boolean(error)} className={inputClass} />
      ) : (
        <input id={id} type="text" value={value} onChange={(event) => onChange(event.target.value)} aria-describedby={describedBy} aria-invalid={Boolean(error)} className={inputClass} />
      )}
      {field.hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {field.hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}

export default function OwnerToolbar({ fields, editor, onEditorChange }) {
  const t = ownerText();
  const { websiteId, content, refetch } = useStorefrontWebsite();
  const original = useMemo(() => Object.fromEntries(fields.map((field) => [field.label, valueFor(content, field)])), [fields, content]);
  const [draft, setDraft] = useState(original);
  const [status, setStatus] = useState({ state: 'idle', errors: {} });
  const sectionRefs = useRef({});

  const sections = useMemo(() => {
    const grouped = new Map();
    for (const field of fields) {
      if (!grouped.has(field.category)) grouped.set(field.category, []);
      grouped.get(field.category).push(field);
    }
    return [...grouped.entries()];
  }, [fields]);

  // Start from what is live each time the panel opens (not when a save
  // refreshes the content, which would also clear the "Saved" message).
  const latestOriginal = useRef(original);
  latestOriginal.current = original;
  useEffect(() => {
    if (editor.open) {
      setDraft(latestOriginal.current);
      setStatus({ state: 'idle', errors: {} });
    }
  }, [editor.open]);

  // Jump to the section whose Edit button was pressed.
  useEffect(() => {
    if (!editor.open || !editor.section) return undefined;
    const timer = window.setTimeout(() => sectionRefs.current[editor.section]?.scrollIntoView?.({ block: 'start' }), 50);
    return () => window.clearTimeout(timer);
  }, [editor.open, editor.section]);

  const changed = Object.fromEntries(
    Object.entries(draft).filter(([label, value]) => !sameValue(value, original[label]))
  );
  const hasChanges = Object.keys(changed).length > 0;

  const save = async () => {
    if (!hasChanges) return;
    setStatus({ state: 'saving', errors: {} });
    try {
      await saveStorefrontContent(websiteId, changed);
      await refetch?.();
      setStatus({ state: 'saved', errors: {} });
    } catch (error) {
      const errors = Object.fromEntries((error.body?.fields || []).map((item) => [item.label, item.message]));
      setStatus({ state: 'error', errors });
    }
  };

  const setOpen = (open) => onEditorChange({ ...editor, open, ...(open ? {} : { section: null }) });
  // The panel shows the section editor, or one of the quick "add" forms.
  const mode = editor.section === ADD_PRODUCT ? 'product' : editor.section === ADD_CATEGORY ? 'category' : 'content';
  const heading = { product: t.newProduct, category: t.newCategory, content: t.title }[mode];
  const quickButton = 'inline-flex min-h-9 items-center rounded-full px-3 font-medium text-foreground hover:bg-muted';

  return (
    <>
      <div className="fixed bottom-24 left-4 z-40 flex items-center gap-1 rounded-full border border-border bg-card/95 p-1 pl-3 text-sm shadow-[0_12px_32px_-12px_oklch(var(--foreground)/0.45)] backdrop-blur md:bottom-5">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.yourStore}</span>
        <button
          type="button"
          onClick={() => onEditorChange({ open: true, section: null })}
          className="inline-flex min-h-9 items-center rounded-full bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {t.editStore}
        </button>
        <button type="button" onClick={() => onEditorChange({ open: true, section: ADD_PRODUCT })} className={quickButton}>
          + {t.addProduct}
        </button>
        <button type="button" onClick={() => onEditorChange({ open: true, section: ADD_CATEGORY })} className={`${quickButton} hidden sm:inline-flex`}>
          + {t.addCategory}
        </button>
        {DASHBOARD_URL && (
          <a
            href={DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-9 items-center rounded-full px-3 font-medium text-foreground hover:bg-muted"
          >
            {t.dashboard}
          </a>
        )}
      </div>

      <Dialog.Root open={editor.open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30" />
          <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-card text-card-foreground shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <Dialog.Title className="text-lg font-semibold">{heading}</Dialog.Title>
                <Dialog.Description className={mode === 'content' ? 'text-sm text-muted-foreground' : 'sr-only'}>
                  {mode === 'product' ? t.productHelp : mode === 'category' ? t.categoryHelp : t.subtitle}
                </Dialog.Description>
              </div>
              <Dialog.Close className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">{t.close}</Dialog.Close>
            </div>

            {mode === 'product' && (
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <AddProductForm initialCategoryId={editor.categoryId || ''} onDone={() => setOpen(false)} />
              </div>
            )}
            {mode === 'category' && (
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <AddCategoryForm />
              </div>
            )}
            {mode === 'content' && (
            <>
            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              {sections.map(([section, sectionFields]) => (
                <section
                  key={section}
                  ref={(node) => {
                    sectionRefs.current[section] = node;
                  }}
                  aria-labelledby={`owner-section-${section}`}
                  className={`space-y-4 rounded-xl border p-4 ${editor.section === section ? 'border-primary' : 'border-border'}`}
                >
                  <h3 id={`owner-section-${section}`} className="text-sm font-semibold uppercase tracking-wide text-primary">
                    {t.sectionName(section)}
                  </h3>
                  {sectionFields.map((field) => (
                    <Field
                      key={field.label}
                      field={field}
                      value={draft[field.label] ?? (field.multiple ? [] : '')}
                      onChange={(value) => setDraft((current) => ({ ...current, [field.label]: value }))}
                      error={status.errors[field.label]}
                      websiteId={websiteId}
                      t={t}
                    />
                  ))}
                </section>
              ))}
            </div>

            <div className="space-y-2 border-t border-border px-5 py-4">
              <p role="status" className="min-h-5 text-sm">
                {status.state === 'saved' && <span className="text-success">{t.saved}</span>}
                {status.state === 'error' && <span className="text-error">{t.saveFailed}</span>}
                {status.state === 'idle' && !hasChanges && <span className="text-muted-foreground">{t.noChanges}</span>}
              </p>
              <button
                type="button"
                onClick={save}
                disabled={!hasChanges || status.state === 'saving'}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status.state === 'saving' ? t.saving : t.save}
              </button>
            </div>
            </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
