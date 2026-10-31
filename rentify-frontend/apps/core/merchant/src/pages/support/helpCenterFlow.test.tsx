// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SupportPage } from './SupportPage';

vi.mock('@rentify/utils', () => ({
  useTranslation: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('./SupportCases', () => ({
  default: () => <div data-testid="support-cases-mock">Support Cases Mock</div>,
}));

afterEach(() => {
  cleanup();
});

describe('wireframe M25 Help Center', () => {
  it('renders Help heading, contact buttons, and support cases', () => {
    render(<SupportPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Help' })).toBeTruthy();
    expect(screen.getByPlaceholderText('Search help articles and questions…')).toBeTruthy();
    expect(screen.getByText('Telegram')).toBeTruthy();
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByTestId('support-cases-mock')).toBeTruthy();
  });

  it('filters FAQ items according to search query', () => {
    render(<SupportPage />);
    const searchInput = screen.getByPlaceholderText('Search help articles and questions…');

    expect(screen.getByText('How do I take cash on delivery?')).toBeTruthy();
    expect(screen.getByText('How do buyers return an item?')).toBeTruthy();

    fireEvent.change(searchInput, { target: { value: 'cash on delivery' } });
    expect(screen.getByText('How do I take cash on delivery?')).toBeTruthy();
    expect(screen.queryByText('How do buyers return an item?')).toBeNull();
  });
});
