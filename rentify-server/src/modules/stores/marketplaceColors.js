// Curated dark accents keep white button labels legible. No layout/theme settings.
const MARKETPLACE_COLORS = ['#4f46e5', '#275643', '#963827', '#9a691b', '#263750'];
const marketplaceColor = value => typeof value === 'string' && MARKETPLACE_COLORS.includes(value.toLowerCase()) ? value.toLowerCase() : null;
module.exports = { MARKETPLACE_COLORS, marketplaceColor };
