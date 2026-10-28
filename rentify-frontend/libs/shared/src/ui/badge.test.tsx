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
    expect(badge.className).toContain('text-[var(--rentify-color-success-text)]');
    expect(badge.className).toContain('bg-[var(--rentify-color-success-subtle)]');

    rerender(<Badge variant="warning">Pending</Badge>);
    badge = screen.getByText('Pending');
    expect(badge.className).toContain('text-[var(--rentify-color-warning-text)]');
    expect(badge.className).toContain('bg-[var(--rentify-color-warning-subtle)]');

    rerender(<Badge variant="danger">Failed</Badge>);
    badge = screen.getByText('Failed');
    expect(badge.className).toContain('text-[var(--rentify-color-danger-text)]');
    expect(badge.className).toContain('bg-[var(--rentify-color-danger-subtle)]');

    rerender(<Badge variant="info">Processing</Badge>);
    badge = screen.getByText('Processing');
    expect(badge.className).toContain('text-[var(--rentify-color-info-text)]');
    expect(badge.className).toContain('bg-[var(--rentify-color-info-subtle)]');
  });

  it('includes visible keyboard focus ring tokens for accessible navigation', () => {
    render(<Badge asChild tabIndex={0}><a href="#test">Interactive Badge</a></Badge>);
    const link = screen.getByRole('link', { name: 'Interactive Badge' });
    expect(link.className).toContain('focus-visible:ring-[var(--rentify-focus-ring-color)]');
  });
});
