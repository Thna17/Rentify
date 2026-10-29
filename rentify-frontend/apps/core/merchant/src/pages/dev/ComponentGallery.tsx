import * as React from 'react';
import { AddressFields, Banner, ChannelChip, Checklist, CountdownChip, EmptyState, ExperienceButton, FilterChip, MoneyField, PhoneField, Price, QuantityStepper, ResponsiveDialog, ShareSheet, StatusBadge, TextField } from '@rentify/shared/ui';
import type { AddressValue } from '@rentify/shared/ui';

export default function ComponentGallery() {
  const [km, setKm] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [phone, setPhone] = React.useState('');
  const [address, setAddress] = React.useState<AddressValue>({ province: '', district: '', commune: '', street: '', landmark: '' });
  const [minor, setMinor] = React.useState(1250);
  const [quantity, setQuantity] = React.useState(1);
  const [filtered, setFiltered] = React.useState(false);
  const copy = km ? { title: 'បណ្ណាល័យសមាសភាគ', name: 'ឈ្មោះហាង', open: 'បើកផ្ទាំង', available: 'មានស្តុក', setup: 'ការរៀបចំ', share: 'ចែករំលែក' } : { title: 'Component gallery', name: 'Store name', open: 'Open dialog', available: 'Available', setup: 'Setup guide', share: 'Share' };
  return <main lang={km ? 'km' : 'en'} style={{ maxWidth: 640, minWidth: 0, margin: 'auto', padding: 16, display: 'grid', gap: 20, fontFamily: 'var(--rentify-font-family-body)', color: 'var(--rentify-color-text-primary)' }}>
    <header><h1>{copy.title}</h1><button type="button" onClick={() => setKm(!km)}>{km ? 'English' : 'ភាសាខ្មែរ'}</button></header>
    <section style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}><ExperienceButton onClick={() => setOpen(true)}>{copy.open}</ExperienceButton><ExperienceButton variant="secondary" loading>{copy.open}</ExperienceButton><ExperienceButton variant="accent">Deal</ExperienceButton><FilterChip label={copy.available} selected={filtered} onClick={() => setFiltered(!filtered)} /></section>
    <TextField id="gallery-name" label={copy.name} placeholder={copy.name} />
    <MoneyField id="gallery-price" label="USD" valueMinor={minor} onValueMinorChange={setMinor} />
    <PhoneField id="gallery-phone" label="Phone / ទូរស័ព្ទ" value={phone} onChange={value => setPhone(value || '')} />
    <AddressFields value={address} onChange={setAddress} locale={km ? 'km' : 'en'} />
    <section><Price amountMinor={minor} compareAtMinor={2000} khrRate={4100} /><QuantityStepper value={quantity} max={10} onChange={setQuantity} /></section>
    <section style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}><StatusBadge label={copy.available} tone="success" /><ChannelChip channel="marketplace" /><CountdownChip deadline={new Date(Date.now() + 10 * 3600000)} /></section>
    <Checklist title={copy.setup} steps={[{ id: 'first', title: copy.name, done: true }, { id: 'second', title: copy.available, done: false, action: <ExperienceButton>{copy.open}</ExperienceButton> }]} />
    <Banner title="Info" tone="info">{copy.available}</Banner>
    <EmptyState title={copy.name} body={copy.available} action={<ExperienceButton>{copy.open}</ExperienceButton>} />
    <ShareSheet url={window.location.href} labels={{ title: copy.share, copy: copy.share, telegram: 'Telegram', facebook: 'Facebook', qr: km ? 'ទាញយក QR' : 'Download QR' }} />
    <ResponsiveDialog open={open} onOpenChange={setOpen} title={copy.open} description={copy.available}><ExperienceButton onClick={() => setOpen(false)}>OK</ExperienceButton></ResponsiveDialog>
  </main>;
}
