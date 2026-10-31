// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import en from '../../../../../../libs/utils/src/locales/en.json';
import { SupportPage } from './SupportPage';

// English catalog lookup, so the test reads what a merchant reads
const translate = (key: string, params: Record<string, unknown> = {}) => {
  const value = key.split('.').reduce<any>((node, part) => node?.[part], en);
  return typeof value === 'string' ? value.replace(/\{\{(\w+)\}\}/g, (_, name) => String(params[name] ?? '')) : key;
};
vi.mock('@rentify/utils', () => ({ useTranslation: () => ({ t: translate, language: 'en' }) }));
vi.mock('./SupportCases', () => ({ default: () => <div data-testid="support-cases-mock">Support Cases Mock</div> }));

afterEach(() => cleanup());

describe('Help (redesign M25)', () => {
  it('renders the heading, contact buttons and support cases', () => {
    render(<SupportPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Help' })).toBeTruthy();
    expect(screen.getByText('Telegram')).toBeTruthy();
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByTestId('support-cases-mock')).toBeTruthy();
  });

  it('filters questions by the search text', () => {
    render(<SupportPage />);
    expect(screen.getByText('How do I take cash on delivery?')).toBeTruthy();
    expect(screen.getByText('How do buyers return an item?')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Search questions'), { target: { value: 'cash on delivery' } });
    expect(screen.getByText('How do I take cash on delivery?')).toBeTruthy();
    expect(screen.queryByText('How do buyers return an item?')).toBeNull();
  });

  it('states the return window from DEC-008 (7 days), not 48 hours', () => {
    render(<SupportPage />);
    fireEvent.click(screen.getByText('How do buyers return an item?'));
    expect(screen.getByText(/within 7 days of delivery/)).toBeTruthy();
  });
});
