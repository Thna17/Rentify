import * as React from 'react';
import { AlertCircle, Check, ChevronDown, Clock3, Copy, ExternalLink, Minus, Plus, Store, Globe2, ShoppingBag, FileText } from 'lucide-react';
import cambodiaAddresses from '../data/cambodia-addresses.json';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from './drawer';
import { qrcode } from 'qrcode-generator';

/** Consumer-facing primitives use only semantic design tokens. */
const colors = {
  ink: 'var(--rentify-color-text-primary)', muted: 'var(--rentify-color-text-muted)',
  brand: 'var(--rentify-color-brand-primary)', border: 'var(--rentify-color-border-input)',
  surface: 'var(--rentify-color-surface-base)', danger: 'var(--rentify-color-danger-text)',
} as const;
const fieldStyle: React.CSSProperties = { minHeight: 44, width: '100%', border: `1px solid ${colors.border}`, borderRadius: 'var(--rentify-radius-sm)', background: colors.surface, color: colors.ink, padding: '0.5rem 0.75rem' };
const tokenButton: React.CSSProperties = { minHeight: 44, borderRadius: 'var(--rentify-radius-sm)', border: '1px solid var(--rentify-color-brand-primary)', background: colors.brand, color: 'var(--rentify-color-text-inverse)', padding: '0.5rem 1rem', cursor: 'pointer' };

export function ExperienceButton({ variant = 'primary', size = 'md', loading = false, iconLeft, iconRight, children, style, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary'|'secondary'|'ghost'|'accent'|'danger'|'link'; size?: 'sm'|'md'|'lg'; loading?: boolean; iconLeft?: React.ReactNode; iconRight?: React.ReactNode }) {
  const variants: Record<string, React.CSSProperties> = {
    primary: {}, secondary: { background: colors.surface, color: colors.brand }, ghost: { background: 'transparent', borderColor: 'transparent', color: colors.brand },
    accent: { background: 'var(--rentify-color-brand-accent)', color: 'var(--rentify-color-text-on-accent)', borderColor: 'var(--rentify-color-brand-accent)' },
    danger: { background: 'var(--rentify-color-danger-base)', borderColor: 'var(--rentify-color-danger-base)' }, link: { background: 'transparent', borderColor: 'transparent', color: colors.brand, textDecoration: 'underline' },
  };
  return <button type="button" {...props} disabled={disabled || loading} aria-busy={loading} style={{ ...tokenButton, ...variants[variant], minHeight: { sm: 36, md: 44, lg: 52 }[size], display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...style }}>
    {loading ? <span role="status" aria-label="Loading" style={{ width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }} /> : iconLeft}{children}{iconRight}
  </button>;
}
export function IconButton({ label, children, ...props }: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & { label: string }) {
  return <ExperienceButton {...props} aria-label={label} style={{ width: 44, padding: 0, ...props.style }}>{children}</ExperienceButton>;
}

export type FieldProps = { label: string; helper?: string; error?: string; id: string };
function FieldFrame({ label, helper, error, id, children }: FieldProps & { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gap: 4, minWidth: 0 }}><label htmlFor={id} style={{ fontWeight: 600, color: colors.ink }}>{label}</label>{children}
    {helper && <small id={`${id}-helper`} style={{ color: colors.muted }}>{helper}</small>}{error && <small id={`${id}-error`} role="alert" style={{ color: colors.danger, display: 'flex', gap: 4, alignItems: 'center' }}><AlertCircle size={16} />{error}</small>}</div>;
}
export function TextField({ label, helper, error, id, style, ...input }: FieldProps & React.InputHTMLAttributes<HTMLInputElement>) {
  return <FieldFrame {...{ label, helper, error, id }}><input {...input} id={id} aria-invalid={!!error} aria-describedby={[helper && `${id}-helper`, error && `${id}-error`].filter(Boolean).join(' ') || undefined} style={{ ...fieldStyle, ...style }} /></FieldFrame>;
}
export function TextArea({ label, helper, error, id, style, ...input }: FieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <FieldFrame {...{ label, helper, error, id }}><textarea {...input} id={id} aria-invalid={!!error} aria-describedby={[helper && `${id}-helper`, error && `${id}-error`].filter(Boolean).join(' ') || undefined} style={{ ...fieldStyle, minHeight: 96, ...style }} /></FieldFrame>;
}
export function NativeSelect({ label, helper, error, id, children, ...input }: FieldProps & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <FieldFrame {...{ label, helper, error, id }}><select {...input} id={id} aria-invalid={!!error} aria-describedby={[helper && `${id}-helper`, error && `${id}-error`].filter(Boolean).join(' ') || undefined} style={fieldStyle}>{children}</select></FieldFrame>;
}
export function NumberField(props: FieldProps & React.InputHTMLAttributes<HTMLInputElement>) { return <TextField {...props} type="number" inputMode="decimal" />; }
export function MoneyField({ valueMinor, onValueMinorChange, ...props }: Omit<FieldProps & React.InputHTMLAttributes<HTMLInputElement>, 'value'|'onChange'> & { valueMinor: number; onValueMinorChange: (minor: number) => void }) {
  return <TextField {...props} type="text" inputMode="decimal" value={(valueMinor / 100).toFixed(2)} onChange={(event) => { const value = event.target.value.trim(); if (/^\d{0,8}(\.\d{0,2})?$/.test(value)) onValueMinorChange(Math.round(Number(value) * 100)); }} />;
}
export function Combobox({ id, label, options, value, onChange, error }: FieldProps & { options: string[]; value: string; onChange: (value: string) => void }) {
  return <div><TextField id={id} label={label} list={`${id}-options`} value={value} onChange={event => onChange(event.target.value)} error={error} /><datalist id={`${id}-options`}>{options.map(option => <option key={option} value={option} />)}</datalist></div>;
}
export function normalizeCambodiaPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, ''); const local = digits.startsWith('855') ? `0${digits.slice(3)}` : digits.startsWith('0') ? digits : `0${digits}`;
  return /^0\d{8,9}$/.test(local) ? `+855${local.slice(1)}` : null;
}
export function PhoneField({ id, label, value, onChange, error }: FieldProps & { value: string; onChange: (e164: string | null) => void }) {
  const [display, setDisplay] = React.useState(value);
  React.useEffect(() => setDisplay(value), [value]);
  return <TextField id={id} label={label} error={error} type="tel" inputMode="tel" autoComplete="tel" value={display} onChange={e => { setDisplay(e.target.value); onChange(normalizeCambodiaPhone(e.target.value)); }} helper="+855 · 012 345 678" />;
}
export type AddressValue = { province: string; district: string; commune: string; street: string; landmark: string };
export function AddressFields({ value, onChange, locale = 'en', labels }: { value: AddressValue; onChange: (value: AddressValue) => void; locale?: 'en'|'km'; labels?: Record<keyof AddressValue, string> }) {
  const update = (patch: Partial<AddressValue>) => onChange({ ...value, ...patch });
  const defaultLabels = locale === 'km' ? { province: 'រាជធានី / ខេត្ត', district: 'ស្រុក / ខណ្ឌ', commune: 'ឃុំ / សង្កាត់', street: 'ផ្លូវ និង ផ្ទះ', landmark: 'ទីតាំងសម្គាល់' } : { province: 'Province', district: 'District / Khan', commune: 'Commune / Sangkat', street: 'Street and house', landmark: 'Landmark' };
  const captions = labels || defaultLabels;
  const districts = cambodiaAddresses.find(p => p.en === value.province)?.districts || [];
  const communes = districts.find(d => d.en === value.district)?.communes || [];
  return <div style={{ display: 'grid', gap: 12 }}>
    <NativeSelect id="address-province" label={captions.province} value={value.province} onChange={e => update({ province: e.target.value, district: '', commune: '' })}><option value="">—</option>{cambodiaAddresses.map(p => <option key={p.id} value={p.en}>{p[locale]}</option>)}</NativeSelect>
    <NativeSelect id="address-district" label={captions.district} value={value.district} disabled={!value.province} onChange={e => update({ district: e.target.value, commune: '' })}><option value="">—</option>{districts.map(d => <option key={d.id} value={d.en}>{d[locale]}</option>)}</NativeSelect>
    <NativeSelect id="address-commune" label={captions.commune} value={value.commune} disabled={!value.district} onChange={e => update({ commune: e.target.value })}><option value="">—</option>{communes.map(c => <option key={c.id} value={c.en}>{c[locale]}</option>)}</NativeSelect>
    <TextField id="address-street" label={captions.street} value={value.street} onChange={e => update({ street: e.target.value })} />
    <TextField id="address-landmark" label={captions.landmark} value={value.landmark} onChange={e => update({ landmark: e.target.value })} />
  </div>;
}
export function ResponsiveDialog({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: React.ReactNode }) {
  const [mobile, setMobile] = React.useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches);
  React.useEffect(() => { const media = window.matchMedia('(max-width: 767px)'); const update = () => setMobile(media.matches); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  return mobile ? <Drawer open={open} onOpenChange={onOpenChange}><DrawerContent><div style={{ padding: 20 }}><DrawerTitle>{title}</DrawerTitle>{description && <DrawerDescription>{description}</DrawerDescription>}{children}</div></DrawerContent></Drawer> : <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogTitle>{title}</DialogTitle>{description && <DialogDescription>{description}</DialogDescription>}{children}</DialogContent></Dialog>;
}
export type ChecklistStep = { id: string; title: string; done: boolean; detail?: string; action?: React.ReactNode };
export function Checklist({ steps, title = 'Setup guide', dismissLabel = 'Dismiss', restoreLabel = 'Restore' }: { steps: ChecklistStep[]; title?: string; dismissLabel?: string; restoreLabel?: string }) {
  const [dismissed, setDismissed] = React.useState(false); const done = steps.filter(step => step.done).length;
  if (dismissed) return <button type="button" onClick={() => setDismissed(false)}>{restoreLabel}</button>;
  return <section aria-label={title} style={{ border: '1px solid var(--rentify-color-border-default)', borderRadius: 'var(--rentify-radius-md)', padding: 16 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><strong>{title}</strong><button type="button" onClick={() => setDismissed(true)}>{dismissLabel}</button></div><p aria-live="polite">{done} of {steps.length}</p><progress value={done} max={steps.length} aria-label={title} style={{ width: '100%' }} />{steps.map(step => <details key={step.id}><summary style={{ minHeight: 44, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>{step.done ? <Check size={18} /> : <ChevronDown size={18} />}{step.title}</summary>{step.detail && <p>{step.detail}</p>}{step.action}</details>)}</section>;
}
export function CountdownChip({ deadline, now = new Date(), labels = { reply: 'Reply within', overdue: 'Overdue' } }: { deadline: Date | string; now?: Date; labels?: { reply: string; overdue: string } }) {
  const hours = Math.ceil((new Date(deadline).getTime() - now.getTime()) / 3600000); const tone = hours <= 0 ? 'danger' : hours < 12 ? 'warning' : 'info';
  return <span role="status" data-tone={tone} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', border: `1px solid var(--rentify-color-${tone}-border)`, borderRadius: 'var(--rentify-radius-full)', background: `var(--rentify-color-${tone}-subtle)`, color: `var(--rentify-color-${tone}-text)` }}><Clock3 size={16} />{hours <= 0 ? labels.overdue : `${labels.reply} ${hours}h`}</span>;
}
export function Price({ amountMinor, compareAtMinor, currency = 'USD', khrRate }: { amountMinor: number; compareAtMinor?: number; currency?: string; khrRate?: number }) {
  const format = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100);
  return <span style={{ display: 'inline-flex', flexDirection: 'column', fontFamily: 'var(--rentify-font-family-mono)' }}><span>{format(amountMinor)}{compareAtMinor && compareAtMinor > amountMinor ? <del style={{ marginLeft: 8, color: colors.muted }}>{format(compareAtMinor)}</del> : null}</span>{khrRate && currency === 'USD' && <small style={{ color: colors.muted }}>≈ ៛{(Math.round((amountMinor / 100 * khrRate) / 100) * 100).toLocaleString('en-US')}</small>}</span>;
}
export function QuantityStepper({ value, min = 1, max, onChange, labels = { decrease: 'Decrease quantity', increase: 'Increase quantity' } }: { value: number; min?: number; max: number; onChange: (value: number) => void; labels?: { decrease: string; increase: string } }) {
  return <div role="group" aria-label="Quantity" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><IconButton label={labels.decrease} disabled={value <= min} onClick={() => onChange(value - 1)}><Minus size={18} /></IconButton><output aria-live="polite">{value}</output><IconButton label={labels.increase} disabled={value >= max} onClick={() => onChange(value + 1)}><Plus size={18} /></IconButton></div>;
}
export function ChannelChip({ channel }: { channel: 'marketplace'|'website'|'pos'|'invoice' }) {
  const meta = { marketplace: ['Marketplace', <ShoppingBag size={16} />], website: ['Website', <Globe2 size={16} />], pos: ['POS', <Store size={16} />], invoice: ['Invoice', <FileText size={16} />] } as const;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid var(--rentify-color-border-default)', padding: '4px 8px', borderRadius: 'var(--rentify-radius-full)' }}>{meta[channel][1]}{meta[channel][0]}</span>;
}
export function ShareSheet({ url, labels = { title: 'Share', copy: 'Copy link', telegram: 'Telegram', facebook: 'Facebook', qr: 'Download QR' } }: { url: string; labels?: { title: string; copy: string; telegram: string; facebook: string; qr: string } }) {
  const [copied, setCopied] = React.useState(false); const encoded = encodeURIComponent(url);
  const downloadQr = () => { const qr = qrcode(0, 'M'); qr.addData(url); qr.make(); const link = document.createElement('a'); link.href = qr.createDataURL(5, 2); link.download = 'rentify-share-qr.gif'; link.click(); };
  return <section aria-label={labels.title} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}><ExperienceButton variant="secondary" iconLeft={<Copy size={16} />} onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); }}>{copied ? '✓' : labels.copy}</ExperienceButton><a href={`https://t.me/share/url?url=${encoded}`} target="_blank" rel="noopener noreferrer">{labels.telegram}<ExternalLink size={14} /></a><a href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`} target="_blank" rel="noopener noreferrer">{labels.facebook}<ExternalLink size={14} /></a><ExperienceButton variant="secondary" onClick={downloadQr}>{labels.qr}</ExperienceButton></section>;
}
