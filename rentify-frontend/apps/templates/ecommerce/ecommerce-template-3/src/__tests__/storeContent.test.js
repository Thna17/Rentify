import { describe, expect, test } from 'vitest';
import {
  TEMPLATE_3_FIELDS,
  getTemplateContent,
  mapLink,
  openStatus,
  parseDays,
  parseHighlight,
  parseHoursLine,
  parseOpeningHours,
  parseTime,
  resolveLink,
} from '../storeContent';
import { highlightIcon } from '../components/Highlights';
import { Bean, Coffee, Croissant, Milk, Sparkles, Truck, Wallet, Wifi } from 'lucide-react';

const item = (label, value) => ({ label, value });
const categories = [
  { id: 'c1', name: 'Espresso Bar' },
  { id: 'c2', name: 'Pastries' },
];

// 2026-09-28 is a Monday.
const at = (day, hours, minutes = 0) => new Date(2026, 8, 28 + day, hours, minutes);

describe('Template 3 content', () => {
  test('every editable field has a category, a label and an editor type', () => {
    const labels = TEMPLATE_3_FIELDS.map((field) => field.label);
    expect(new Set(labels).size).toBe(labels.length);
    for (const field of TEMPLATE_3_FIELDS) {
      expect(field.category).toBeTruthy();
      // The merchant design editor renders inputs for these types only.
      expect(['text', 'image']).toContain(field.type);
    }
  });

  test('empty content hides every optional section', () => {
    const page = getTemplateContent([], categories);
    expect(page.highlights).toEqual([]);
    expect(page.signature.category).toBeNull();
    expect(page.menu).toEqual({ title: '', note: '' });
    expect(page.feature.title).toBe('');
    expect(page.story.title).toBe('');
    expect(page.visit).toEqual({ title: '', hours: [], mapUrl: null });
  });

  test('reads the merchant fields in their stored shapes', () => {
    const page = getTemplateContent(
      [
        item('Hero Eyebrow', { text: 'Specialty coffee · Phnom Penh' }),
        item('Highlight 1', 'Freshly roasted | Every week'),
        item('Highlight 2', { text: 'Oat milk — At no extra cost' }),
        item('Highlight 3', '   '),
        item('Featured Title', 'House favourites'),
        item('Featured Category', 'espresso bar'),
        item('Menu Note', 'Extra shot +$0.50'),
        item('Feature Title', 'Beans to brew at home'),
        item('Feature Image', [{ url: 'https://cdn.example.com/beans.jpg' }, { url: 'javascript:alert(1)' }]),
        item('Story Title', 'From Mondulkiri to your cup'),
        item('Opening Hours', { text: 'Mon–Fri | 7:00–18:00\nSat–Sun | 8:00–20:00' }),
        item('Map Link', 'https://maps.google.com/?q=cafe'),
      ],
      categories
    );
    expect(page.hero.eyebrow).toBe('Specialty coffee · Phnom Penh');
    expect(page.highlights).toEqual([
      { title: 'Freshly roasted', detail: 'Every week' },
      { title: 'Oat milk', detail: 'At no extra cost' },
    ]);
    expect(page.signature).toEqual({ title: 'House favourites', category: categories[0] });
    expect(page.menu.note).toBe('Extra shot +$0.50');
    expect(page.feature.image).toBe('https://cdn.example.com/beans.jpg');
    expect(page.feature.link).toEqual({ to: '/products', external: false });
    expect(page.visit.hours.map((entry) => entry.label)).toEqual(['Mon–Fri', 'Sat–Sun']);
    expect(page.visit.mapUrl).toBe('https://maps.google.com/?q=cafe');
  });

  test('ignores a signature category that does not exist', () => {
    expect(getTemplateContent([item('Featured Category', 'Gadgets')], categories).signature.category).toBeNull();
  });

  test('keeps store links in the app, opens web links externally and rejects unsafe links', () => {
    expect(resolveLink('/products?category=c1', '/products')).toEqual({ to: '/products?category=c1', external: false });
    expect(resolveLink('https://t.me/cafe', '/products')).toEqual({ to: 'https://t.me/cafe', external: true });
    expect(resolveLink('javascript:alert(1)', '/products')).toEqual({ to: '/products', external: false });
    expect(resolveLink('//evil.example.com', '/products')).toEqual({ to: '/products', external: false });
  });

  test('uses only https map links for directions', () => {
    expect(mapLink('https://maps.app.goo.gl/abc')).toBe('https://maps.app.goo.gl/abc');
    expect(mapLink('http://maps.example.com')).toBeNull();
    expect(mapLink('/visit')).toBeNull();
    expect(mapLink('javascript:alert(1)')).toBeNull();
  });

  test('parses highlight text with or without a detail', () => {
    expect(parseHighlight('Free Wi-Fi')).toEqual({ title: 'Free Wi-Fi', detail: '' });
    expect(parseHighlight('Free Wi-Fi | Stay and work')).toEqual({ title: 'Free Wi-Fi', detail: 'Stay and work' });
  });

  test('picks a café icon from the highlight wording', () => {
    expect(highlightIcon('Freshly roasted', 'Every week')).toBe(Bean);
    expect(highlightIcon('Oat milk available')).toBe(Milk);
    expect(highlightIcon('Fresh pastries daily')).toBe(Croissant);
    expect(highlightIcon('Free Wi-Fi')).toBe(Wifi);
    expect(highlightIcon('Handcrafted espresso')).toBe(Coffee);
    expect(highlightIcon('កាហ្វេខ្មែរ')).toBe(Coffee);
    expect(highlightIcon('Fast delivery')).toBe(Truck);
    expect(highlightIcon('Cash on delivery', 'Pay when your order arrives')).toBe(Wallet);
    expect(highlightIcon('Something else')).toBe(Sparkles);
  });
});

describe('opening hours', () => {
  test('reads day ranges, lists and every-day wording, in English and Khmer', () => {
    expect(parseDays('Mon–Fri')).toEqual([0, 1, 2, 3, 4]);
    expect(parseDays('Sat, Sun')).toEqual([5, 6]);
    expect(parseDays('Fri - Mon')).toEqual([0, 4, 5, 6]);
    expect(parseDays('Daily')).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(parseDays('Monday to Wednesday')).toEqual([0, 1, 2]);
    expect(parseDays('ថ្ងៃច័ន្ទ-សុក្រ')).toEqual([0, 1, 2, 3, 4]);
    expect(parseDays('Public holidays')).toBeNull();
  });

  test('reads 24-hour and am/pm times', () => {
    expect(parseTime('7:00')).toBe(420);
    expect(parseTime('18.30')).toBe(1110);
    expect(parseTime('7am')).toBe(420);
    expect(parseTime('6:30 pm')).toBe(1110);
    expect(parseTime('12am')).toBe(0);
    expect(parseTime('12pm')).toBe(720);
    expect(parseTime('25:00')).toBeNull();
    expect(parseTime('noon')).toBeNull();
  });

  test('splits a line on a bar, a colon or where the time starts', () => {
    expect(parseHoursLine('Mon–Fri | 7:00–18:00')).toMatchObject({ label: 'Mon–Fri', time: '7:00–18:00', opens: 420, closes: 1080 });
    expect(parseHoursLine('Sat: 8am - 8pm')).toMatchObject({ label: 'Sat', opens: 480, closes: 1200 });
    expect(parseHoursLine('Sun 9:00-17:00')).toMatchObject({ label: 'Sun', opens: 540, closes: 1020 });
    expect(parseHoursLine('Sun | Closed')).toMatchObject({ label: 'Sun', closed: true });
  });

  test('keeps lines it cannot read as plain text, without a status', () => {
    const [entry] = parseOpeningHours('Public holidays | Ask us');
    expect(entry).toMatchObject({ label: 'Public holidays', time: 'Ask us', days: null, opens: null });
    expect(openStatus([entry], at(0, 10))).toBeNull();
  });

  test('ignores blank lines and keeps at most a week of lines', () => {
    const hours = parseOpeningHours(`Mon | 7-18\n\n${'Tue | 7-18\n'.repeat(10)}`);
    expect(hours).toHaveLength(7);
  });

  test('says whether the café is open at a given time', () => {
    const hours = parseOpeningHours('Mon–Fri | 7:00–18:00\nSat | 8:00–20:00\nSun | Closed');
    expect(openStatus(hours, at(0, 7, 0))).toBe(true);
    expect(openStatus(hours, at(0, 6, 59))).toBe(false);
    expect(openStatus(hours, at(0, 18, 0))).toBe(false);
    expect(openStatus(hours, at(5, 19, 30))).toBe(true);
    expect(openStatus(hours, at(6, 12))).toBe(false);
  });

  test('handles closing after midnight', () => {
    const hours = parseOpeningHours('Fri–Sat | 18:00–01:00');
    expect(openStatus(hours, at(4, 23, 30))).toBe(true);
    // Saturday 00:30 is still Friday night.
    expect(openStatus(hours, at(5, 0, 30))).toBe(true);
    expect(openStatus(hours, at(6, 0, 30))).toBe(true);
    // Saturday night has ended and Sunday is not listed, so there is nothing to say.
    expect(openStatus(hours, at(6, 2, 0))).toBeNull();
    expect(openStatus(hours, at(4, 12, 0))).toBe(false);
  });

  test('does not guess when today is not listed', () => {
    expect(openStatus(parseOpeningHours('Mon–Fri | 7:00–18:00'), at(6, 12))).toBeNull();
  });
});
