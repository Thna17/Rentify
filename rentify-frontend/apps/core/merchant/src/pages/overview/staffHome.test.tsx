// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import en from '../../../../../../libs/utils/src/locales/en.json';

const translate = (key: string, params: Record<string, unknown> = {}) => {
  const value = key.split('.').reduce<any>((node, part) => node?.[part], en);
  return typeof value === 'string' ? value.replace(/\{\{(\w+)\}\}/g, (_, name) => String(params[name] ?? '')) : key;
};
let auth: any = {};
vi.mock('@rentify/utils', () => ({ useTranslation: () => ({ t: translate }), useAuth: () => auth }));
vi.mock('../../context/ChannelContext', () => ({ useChannels: () => ({ store: { name: 'Mekong Brew' } }) }));
vi.mock('../../utils/storeLinks', () => ({ openPosApp: vi.fn() }));

import { StaffHome } from './StaffHome';

afterEach(() => cleanup());

describe('Staff home (redesign M29)', () => {
  it('gives a cashier the register first and nothing they cannot open', () => {
    auth = { role: 'staff', profile: { name: 'Sok Dara', permissions: ['manage_pos'] } };
    render(<MemoryRouter><StaffHome /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'Hello, Sok' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open register' })).toBeTruthy();
    expect(screen.queryByText('You can also open')).toBeNull();
  });

  it('lists only the places the staff member has permission for', () => {
    auth = { role: 'staff', profile: { name: 'Sok', permissions: ['manage_pos', 'manage_products'] } };
    render(<MemoryRouter><StaffHome /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Products/ }).getAttribute('href')).toBe('/products');
    expect(screen.queryByRole('link', { name: /Settings/ })).toBeNull();
  });
});
