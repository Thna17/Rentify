import { describe, expect, test } from 'vitest';
import { TEMPLATE_2_FIELDS, getTemplateContent, parseHighlight, resolveLink } from '../storeContent';
import { highlightIcon } from '../components/Highlights';
import { FlaskConical, Leaf, Sparkles, Truck, Wallet } from 'lucide-react';

const item = (label, value) => ({ label, value });
const categories = [
  { id: 'c1', name: 'Serums & Treatments' },
  { id: 'c2', name: 'Sun Protection' },
];

describe('Template 2 content', () => {
  test('every editable field has a category, a label and an editor type', () => {
    const labels = TEMPLATE_2_FIELDS.map((field) => field.label);
    expect(new Set(labels).size).toBe(labels.length);
    for (const field of TEMPLATE_2_FIELDS) {
      expect(field.category).toBeTruthy();
      // The merchant design editor renders inputs for these types only.
      expect(['text', 'image']).toContain(field.type);
    }
  });

  test('empty content hides every optional section', () => {
    const page = getTemplateContent([], categories);
    expect(page.highlights).toEqual([]);
    expect(page.feature.title).toBe('');
    expect(page.featured.category).toBeNull();
    expect(page.needs.items).toEqual([]);
    expect(page.story.title).toBe('');
  });

  test('reads the merchant fields in their stored shapes', () => {
    const page = getTemplateContent(
      [
        item('Hero Eyebrow', { text: 'Pure botanical skincare' }),
        item('Highlight 1', 'Fast delivery | Across Cambodia'),
        item('Highlight 2', { text: 'Clean formulas — No harsh chemicals' }),
        item('Highlight 3', '   '),
        item('Feature Title', 'Your daily ritual'),
        item('Feature Image', [{ url: 'https://cdn.example.com/ritual.jpg' }, { url: 'javascript:alert(1)' }]),
        item('Featured Title', 'Best sellers'),
        item('Featured Category', 'sun protection'),
        item('Shop by Need', 'Hydration, Brightening,  ,Hydration\nSensitive skin'),
        item('Story Title', 'Modern skincare. Timeless roots.'),
        item('Story Image', 'https://cdn.example.com/story.jpg'),
      ],
      categories
    );
    expect(page.hero.eyebrow).toBe('Pure botanical skincare');
    expect(page.highlights).toEqual([
      { title: 'Fast delivery', detail: 'Across Cambodia' },
      { title: 'Clean formulas', detail: 'No harsh chemicals' },
    ]);
    expect(page.feature.image).toBe('https://cdn.example.com/ritual.jpg');
    expect(page.feature.link).toEqual({ to: '/products', external: false });
    expect(page.featured).toEqual({ title: 'Best sellers', category: categories[1] });
    expect(page.needs.items).toEqual(['Hydration', 'Brightening', 'Sensitive skin']);
    expect(page.story.image).toBe('https://cdn.example.com/story.jpg');
  });

  test('ignores a featured category that does not exist', () => {
    expect(getTemplateContent([item('Featured Category', 'Gadgets')], categories).featured.category).toBeNull();
  });

  test('keeps store links in the app, opens web links externally and rejects unsafe links', () => {
    expect(resolveLink('/products?category=c1', '/products')).toEqual({ to: '/products?category=c1', external: false });
    expect(resolveLink('https://t.me/aura', '/products')).toEqual({ to: 'https://t.me/aura', external: true });
    expect(resolveLink('javascript:alert(1)', '/products')).toEqual({ to: '/products', external: false });
    expect(resolveLink('//evil.example.com', '/products')).toEqual({ to: '/products', external: false });
  });

  test('parses highlight text with or without a detail', () => {
    expect(parseHighlight('Cruelty-free')).toEqual({ title: 'Cruelty-free', detail: '' });
    expect(parseHighlight('Cruelty-free | Kind to your skin')).toEqual({ title: 'Cruelty-free', detail: 'Kind to your skin' });
  });

  test('picks an icon from the highlight wording', () => {
    expect(highlightIcon('Fast & reliable delivery')).toBe(Truck);
    expect(highlightIcon('Natural & safe ingredients')).toBe(Leaf);
    expect(highlightIcon('Clean & transparent')).toBe(FlaskConical);
    expect(highlightIcon('ដឹកជញ្ជូនរហ័ស')).toBe(Truck);
    expect(highlightIcon('Cash on delivery', 'Pay when your order arrives')).toBe(Wallet);
    expect(highlightIcon('Something else')).toBe(Sparkles);
  });
});
