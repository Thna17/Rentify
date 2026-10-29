import * as React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AddressFields, Checklist, CountdownChip, ExperienceButton, PhoneField, Price, QuantityStepper, normalizeCambodiaPhone } from './experience';
import { Banner, FilterChip, Rating, StatusBadge } from './experience-extras';

afterEach(cleanup);

describe('shared experience controls', () => {
  it('preserves loading button label and stops a second action', () => {
    const action = vi.fn();
    render(<ExperienceButton loading onClick={action}>Save product</ExperienceButton>);
    const button = screen.getByRole('button', { name: /Save product/ });
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    fireEvent.click(button);
    expect(action).not.toHaveBeenCalled();
  });

  it('normalizes local and international Cambodia mobile numbers', () => {
    expect(normalizeCambodiaPhone('012 345 678')).toBe('+85512345678');
    expect(normalizeCambodiaPhone('+855 12 345 678')).toBe('+85512345678');
    expect(normalizeCambodiaPhone('12 345 678')).toBe('+85512345678');
    expect(normalizeCambodiaPhone('123')).toBeNull();
    const onChange = vi.fn();
    render(<PhoneField id="phone" label="Phone" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '012 345 678' } });
    expect(onChange).toHaveBeenCalledWith('+85512345678');
  });

  it('resets a dependent district when the province changes', () => {
    const onChange = vi.fn();
    render(<AddressFields value={{ province: 'Phnom Penh', district: 'Sen Sok', commune: 'Phnom Penh Thmei', street: '', landmark: '' }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Province'), { target: { value: 'Kandal' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ province: 'Kandal', district: '', commune: '' }));
  });

  it('announces setup progress, countdown urgency and quantity limits', () => {
    const onChange = vi.fn();
    render(<><Checklist steps={[{ id: 'a', title: 'Store', done: true }, { id: 'b', title: 'Product', done: false }]} /><CountdownChip deadline="2026-01-02T00:00:00Z" now={new Date('2026-01-01T14:00:00Z')} /><QuantityStepper value={2} max={2} onChange={onChange} /></>);
    expect(screen.getByText('1 of 2')).toBeDefined();
    expect(screen.getByText('Reply within 10h').getAttribute('data-tone')).toBe('warning');
    expect(screen.getByRole('button', { name: 'Increase quantity' }).hasAttribute('disabled')).toBe(true);
  });

  it('uses readable labels alongside colors, including money and rating', () => {
    render(<><StatusBadge label="Approved" tone="success" live /><FilterChip label="Marketplace" selected onClick={vi.fn()} /><Banner title="Attention" tone="warning">Payment pending</Banner><Price amountMinor={1250} compareAtMinor={2000} khrRate={4100} /><Rating value={4.8} count={126} /></>);
    expect(screen.getByRole('status', { name: 'Approved' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Marketplace' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('$12.50')).toBeDefined();
    expect(screen.getByLabelText('4.8 out of 5 stars, 126 reviews')).toBeDefined();
  });

  it('has no critical axe violations in the mixed EN/KM control surface', async () => {
    const { container } = render(<main lang="km"><h1>ការរៀបចំ</h1><ExperienceButton>បន្ត</ExperienceButton><PhoneField id="customer-phone" label="ទូរស័ព្ទ" value="" onChange={vi.fn()} /><StatusBadge label="រង់ចាំ" tone="warning" /></main>);
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations.filter(violation => violation.impact === 'critical')).toEqual([]);
  });
});
