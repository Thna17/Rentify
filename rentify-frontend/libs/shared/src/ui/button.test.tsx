import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('renders an accessible button and applies its variant class', () => {
    render(<Button variant="destructive">Delete store</Button>);
    const button = screen.getByRole('button', { name: 'Delete store' });
    expect(button.className).toContain('bg-destructive');
  });
});
