import { render, screen } from '@testing-library/react';
import { Badge } from './badge';

describe('Badge', () => {
  it('renders a default badge', () => {
    render(<Badge>Default Status</Badge>);
    const badge = screen.getByText('Default Status');
    expect(badge).toBeDefined();
    expect(badge.className).toContain('bg-primary');
  });

  it('renders semantic status variants with design token classes', () => {
    const { rerender } = render(<Badge variant="success">Completed</Badge>);
    let badge = screen.getByText('Completed');
    expect(badge.className).toContain('text-[var(--rentify-color-success-text,#14532d)]');
    expect(badge.className).toContain('bg-[var(--rentify-color-success-subtle,#f0fdf4)]');

    rerender(<Badge variant="warning">Pending</Badge>);
    badge = screen.getByText('Pending');
    expect(badge.className).toContain('text-[var(--rentify-color-warning-text,#78350f)]');
    expect(badge.className).toContain('bg-[var(--rentify-color-warning-subtle,#fffbeb)]');

    rerender(<Badge variant="danger">Failed</Badge>);
    badge = screen.getByText('Failed');
    expect(badge.className).toContain('text-[var(--rentify-color-danger-text,#7f1d1d)]');
    expect(badge.className).toContain('bg-[var(--rentify-color-danger-subtle,#fef2f2)]');

    rerender(<Badge variant="info">Processing</Badge>);
    badge = screen.getByText('Processing');
    expect(badge.className).toContain('text-[var(--rentify-color-info-text,#1e3a8a)]');
    expect(badge.className).toContain('bg-[var(--rentify-color-info-subtle,#eff6ff)]');
  });

  it('includes visible keyboard focus ring tokens for accessible navigation', () => {
    render(<Badge asChild tabIndex={0}><a href="#test">Interactive Badge</a></Badge>);
    const link = screen.getByRole('link', { name: 'Interactive Badge' });
    expect(link.className).toContain('focus-visible:ring-[var(--rentify-focus-ring-color,#4f46e5)]');
  });
});
