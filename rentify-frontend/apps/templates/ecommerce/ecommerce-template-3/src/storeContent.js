import { contentImages, contentText, getContentValue, safeUrl } from '@rentify/storefront/content';

/**
 * Everything a merchant can edit on this café template, in the order the
 * design editor and the storefront's owner tools list it. Labels are the
 * `WebsiteContents` labels; the same list is seeded as Template 3's
 * `TemplateContents` in rentify-server so new websites start with these
 * fields. Owner edits from the storefront are saved by Core's
 * PUT /api/websites/:websiteId/storefront-content, which allowlists the same
 * labels in rentify-server/src/config/storefrontContentFields.js.
 *
 * Every field is optional. A section is shown only when the merchant has
 * filled in what it needs, so the store never displays placeholder claims.
 * Store name, logo, contact details, address, social links and palette are
 * the shared fields read by `getStoreIdentity`.
 */
export const TEMPLATE_3_FIELDS = [
  { category: 'Header', label: 'Announcement', type: 'text', hint: 'Short message shown in a bar above the header' },
  { category: 'Hero', label: 'Hero Eyebrow', type: 'text', hint: 'Short line above the headline, e.g. "Specialty coffee · Phnom Penh"' },
  { category: 'Hero', label: 'Hero Headline', type: 'text', hint: 'Main headline; the café name is used when empty' },
  { category: 'Hero', label: 'Hero Subtitle', type: 'text', multiline: true, hint: 'One or two sentences about the café' },
  { category: 'Hero', label: 'Hero Image', type: 'image', multiple: true, max: 6, hint: 'Photos of your drinks or café; several images rotate' },
  { category: 'Hero', label: 'Hero Button Text', type: 'text', hint: 'Defaults to "Order now"' },
  { category: 'Hero', label: 'Hero Note', type: 'text', hint: 'A few chalkboard-style words beside the photo' },
  { category: 'Highlights', label: 'Highlight 1', type: 'text', hint: 'Title | short detail, e.g. "Freshly roasted | Every week"' },
  { category: 'Highlights', label: 'Highlight 2', type: 'text', hint: 'Title | short detail' },
  { category: 'Highlights', label: 'Highlight 3', type: 'text', hint: 'Title | short detail' },
  { category: 'Highlights', label: 'Highlight 4', type: 'text', hint: 'Title | short detail' },
  { category: 'Signature Drinks', label: 'Featured Title', type: 'text', hint: 'Heading for your signature row, e.g. "House favourites"' },
  { category: 'Signature Drinks', label: 'Featured Category', type: 'text', hint: 'Name of the category whose items fill that row; newest items are used when empty' },
  { category: 'Menu', label: 'Menu Title', type: 'text', hint: 'Defaults to "Our menu"' },
  { category: 'Menu', label: 'Menu Note', type: 'text', multiline: true, hint: 'Small print under the menu, e.g. "Oat milk +$0.50 · Extra shot +$0.50"' },
  { category: 'Feature Banner', label: 'Feature Eyebrow', type: 'text', hint: 'Small line above the banner title' },
  { category: 'Feature Banner', label: 'Feature Title', type: 'text', hint: 'The banner appears once this is filled in, e.g. "Beans to brew at home"' },
  { category: 'Feature Banner', label: 'Feature Text', type: 'text', multiline: true },
  { category: 'Feature Banner', label: 'Feature Image', type: 'image' },
  { category: 'Feature Banner', label: 'Feature Button Text', type: 'text' },
  { category: 'Feature Banner', label: 'Feature Button Link', type: 'text', hint: 'A page of this store (/products) or a full https:// link' },
  { category: 'Feature Banner', label: 'Feature Note', type: 'text', hint: 'A few chalkboard-style words' },
  { category: 'Our Story', label: 'Story Title', type: 'text', hint: 'The story section appears once this is filled in' },
  { category: 'Our Story', label: 'Story Text', type: 'text', multiline: true },
  { category: 'Our Story', label: 'Story Image', type: 'image' },
  { category: 'Visit Us', label: 'Visit Title', type: 'text', hint: 'Defaults to "Visit us"' },
  {
    category: 'Visit Us',
    label: 'Opening Hours',
    type: 'text',
    multiline: true,
    hint: 'One line per day or range, e.g. "Mon–Fri | 7:00–18:00" and "Sun | Closed"',
  },
  { category: 'Visit Us', label: 'Map Link', type: 'text', hint: 'A https:// link to your café on Google Maps' },
];

export const MAX_HIGHLIGHTS = 4;
export const MAX_HOURS_LINES = 7;

/** "Title | detail" (or "Title — detail") into its two parts. */
export const parseHighlight = (value) => {
  const [title, ...rest] = value.split(/\s*(?:\||—|–)\s*/);
  return { title: title.trim(), detail: rest.join(' ').trim() };
};

/**
 * A merchant button link: store paths stay in the app, http(s) links open in
 * a new tab, anything else falls back to the menu.
 */
export const resolveLink = (value, fallback) => {
  const url = safeUrl(value);
  if (!url) return { to: fallback, external: false };
  return url.startsWith('/') ? { to: url, external: false } : { to: url, external: true };
};

/** Only an https:// address is used for "Get directions". */
export const mapLink = (value) => {
  const url = safeUrl(value);
  return url && url.startsWith('https://') ? url : null;
};

// Monday is 0 so ranges such as Mon–Fri read naturally.
const DAY_NAMES = [
  ['mon', 'monday', 'ច័ន្ទ'],
  ['tue', 'tues', 'tuesday', 'អង្គារ'],
  ['wed', 'wednesday', 'ពុធ'],
  ['thu', 'thur', 'thurs', 'thursday', 'ព្រហស្បតិ៍'],
  ['fri', 'friday', 'សុក្រ'],
  ['sat', 'saturday', 'សៅរ៍'],
  ['sun', 'sunday', 'អាទិត្យ'],
];
const EVERY_DAY = /^(daily|every ?day|everyday|all week|mon\w*\s*[-–—]\s*sun\w*|រៀងរាល់ថ្ងៃ|ជារៀងរាល់ថ្ងៃ)$/i;
const CLOSED = /^(closed|close|off|បិទ)$/i;

const dayIndex = (word) => {
  const clean = word.trim().toLowerCase().replace(/\.$/, '').replace(/^ថ្ងៃ/, '');
  return DAY_NAMES.findIndex((names) => names.includes(clean));
};

/** "Mon–Fri", "Sat, Sun", "Daily" into Monday-first day indexes; null when unreadable. */
export const parseDays = (label) => {
  const text = label.trim();
  if (!text) return null;
  if (EVERY_DAY.test(text)) return [0, 1, 2, 3, 4, 5, 6];
  const days = new Set();
  for (const part of text.split(/\s*[,&/]\s*|\s+and\s+/i)) {
    const range = part.split(/\s*[-–—]\s*|\s+to\s+/i);
    if (range.length === 2) {
      const start = dayIndex(range[0]);
      const end = dayIndex(range[1]);
      if (start < 0 || end < 0) return null;
      for (let day = start; ; day = (day + 1) % 7) {
        days.add(day);
        if (day === end) break;
      }
    } else {
      const day = dayIndex(part);
      if (day < 0) return null;
      days.add(day);
    }
  }
  return days.size ? [...days].sort((a, b) => a - b) : null;
};

/** "7:00", "7am", "6:30 pm", "18.00" into minutes after midnight; null when unreadable. */
export const parseTime = (value) => {
  const match = value.trim().toLowerCase().match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const meridiem = match[3]?.[0];
  if (minutes > 59 || hours > 24 || (meridiem && (hours < 1 || hours > 12))) return null;
  if (meridiem === 'p' && hours !== 12) hours += 12;
  if (meridiem === 'a' && hours === 12) hours = 0;
  const total = hours * 60 + minutes;
  return total <= 24 * 60 ? total : null;
};

/**
 * One "Opening Hours" line: "Mon–Fri | 7:00–18:00". The text is always shown
 * as written; `days`, `opens` and `closes` are filled in only when the line
 * can be read, and drive the "Open now" badge.
 */
const splitHoursLine = (line) => {
  const bar = line.indexOf('|');
  if (bar >= 0) return [line.slice(0, bar), line.slice(bar + 1)];
  // "Mon–Fri: 7:00–18:00", or "Mon–Fri 7:00–18:00" where the time starts at the first digit.
  const match = line.match(/^(.+?)(?::\s+|\s+(?=\d)|\s+(?=closed\b|បិទ))(.*)$/i);
  return match ? [match[1], match[2]] : [line, ''];
};

export const parseHoursLine = (line) => {
  const [rawLabel, rawTime] = splitHoursLine(line);
  const label = rawLabel.trim();
  const time = rawTime.trim();
  const entry = { label, time, days: parseDays(label), closed: false, opens: null, closes: null };
  if (!time) return entry;
  if (CLOSED.test(time)) return { ...entry, closed: true };
  const [from, to] = time.split(/\s*[-–—]\s*|\s+to\s+/i);
  const opens = from ? parseTime(from) : null;
  const closes = to ? parseTime(to) : null;
  if (opens === null || closes === null || opens === closes) return entry;
  return { ...entry, opens, closes };
};

export const parseOpeningHours = (value) =>
  String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_HOURS_LINES)
    .map(parseHoursLine)
    .filter((entry) => entry.label);

/**
 * Whether the café is open at `date` (its local clock): `true` or `false`
 * when today's line can be read, `null` when the hours don't say. Handles
 * late closes past midnight such as "18:00–01:00".
 */
export const openStatus = (hours, date = new Date()) => {
  const today = (date.getDay() + 6) % 7;
  const yesterday = (today + 6) % 7;
  const minutes = date.getHours() * 60 + date.getMinutes();
  let known = false;

  for (const entry of hours) {
    if (!entry.days) continue;
    const overnight = entry.opens !== null && entry.closes !== null && entry.closes < entry.opens;
    if (entry.days.includes(today)) {
      if (entry.closed) {
        known = true;
        continue;
      }
      if (entry.opens === null || entry.closes === null) continue;
      known = true;
      if (overnight ? minutes >= entry.opens : minutes >= entry.opens && minutes < entry.closes) return true;
    }
    if (overnight && entry.days.includes(yesterday) && minutes < entry.closes) return true;
  }
  return known ? false : null;
};

/** Normalized, render-safe Template 3 content. */
export const getTemplateContent = (content, categories = []) => {
  const text = (label) => contentText(getContentValue(content, label));
  const images = (label) => contentImages(getContentValue(content, label));

  const highlights = Array.from({ length: MAX_HIGHLIGHTS }, (_, index) => text(`Highlight ${index + 1}`))
    .filter(Boolean)
    .map(parseHighlight)
    .filter((item) => item.title);

  const featuredName = text('Featured Category').toLowerCase();
  const featuredCategory = featuredName
    ? categories.find((category) => String(category.name || '').trim().toLowerCase() === featuredName) || null
    : null;

  return {
    hero: {
      eyebrow: text('Hero Eyebrow'),
      buttonText: text('Hero Button Text'),
      note: text('Hero Note'),
    },
    highlights,
    signature: {
      title: text('Featured Title'),
      category: featuredCategory,
    },
    menu: {
      title: text('Menu Title'),
      note: text('Menu Note'),
    },
    feature: {
      eyebrow: text('Feature Eyebrow'),
      title: text('Feature Title'),
      text: text('Feature Text'),
      image: images('Feature Image')[0] || null,
      buttonText: text('Feature Button Text'),
      link: resolveLink(text('Feature Button Link'), '/products'),
      note: text('Feature Note'),
    },
    story: {
      title: text('Story Title'),
      text: text('Story Text'),
      image: images('Story Image')[0] || null,
    },
    visit: {
      title: text('Visit Title'),
      hours: parseOpeningHours(text('Opening Hours')),
      mapUrl: mapLink(text('Map Link')),
    },
  };
};
