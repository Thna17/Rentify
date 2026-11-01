const crypto = require('crypto');
const fail = (message, statusCode = 400) => { const e = new Error(message); e.statusCode = statusCode; throw e; };
const cents = (value) => {
  const s = String(value ?? '');
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(s)) return null;
  const [whole, decimals = ''] = s.split('.');
  return Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
};
function qualifies(product, minimum) {
  const variants = product.ProductVariants || product.productVariants || [];
  if (product.hasVariants && !variants.some(v => v.status === 'active')) return false;
  return [product, ...variants.filter(v => v.status === 'active')].every(p => {
    const price = cents(p.price), original = cents(p.compareAtPrice);
    if (price === null || price < 0) return false;
    return minimum === 0 || (original !== null && original > 0 && original > price && (original - price) * 100 >= original * minimum);
  });
}
const fingerprint = (p) => crypto.createHash('sha256').update(JSON.stringify({
  price: String(p.price), original: String(p.compareAtPrice),
  variants: (p.ProductVariants || []).filter(v => v.status === 'active').map(v => [v.id, String(v.price), String(v.compareAtPrice)]).sort((a,b) => a[0].localeCompare(b[0])),
})).digest('hex');
const active = (c, now = new Date()) => c.status === 'published' && new Date(c.startsAt) <= now && new Date(c.endsAt) > now;
const accepting = (c, now = new Date()) => c.status === 'published' && new Date(c.submissionEndsAt) > now && new Date(c.endsAt) > now;
function validate(input) {
  const text = (key, max) => { if (typeof input[key] !== 'string' || !input[key].trim() || input[key].length > max) fail(`Invalid ${key}`); return input[key].trim(); };
  const slug = text('slug', 100);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail('Use a lowercase, hyphenated slug');
  const bannerUrl = text('bannerUrl', 1000);
  if (!/^\/assets\/[a-zA-Z0-9/_.,-]+$/.test(bannerUrl)) {
    let url; try { url = new URL(bannerUrl); } catch { fail('Use an HTTPS banner URL or a bundled /assets/ image'); }
    if (url.protocol !== 'https:' || url.username || url.password) fail('Use an HTTPS banner URL');
  }
  const startsAt = new Date(input.startsAt), endsAt = new Date(input.endsAt), submissionEndsAt = new Date(input.submissionEndsAt);
  if (![startsAt, endsAt, submissionEndsAt].every(d => Number.isFinite(d.getTime())) || startsAt >= endsAt || submissionEndsAt > endsAt) fail('Check campaign and submission dates');
  const minimumDiscount = input.minimumDiscount;
  if (!Number.isInteger(minimumDiscount) || minimumDiscount < 0 || minimumDiscount > 100) fail('Discount requirement must be 0–100');
  if (!['draft', 'published', 'closed'].includes(input.status)) fail('Invalid campaign status');
  if (typeof input.homepage !== 'boolean') fail('Invalid homepage placement');
  const priority = input.priority ?? 0;
  if (!Number.isInteger(priority) || priority < 0 || priority > 999) fail('Priority must be 0–999');
  return { slug, title: text('title', 160), description: text('description', 5000), bannerUrl, startsAt, endsAt, submissionEndsAt, minimumDiscount, status: input.status, homepage: input.homepage, priority };
}
module.exports = { fail, cents, qualifies, fingerprint, active, accepting, validate };
