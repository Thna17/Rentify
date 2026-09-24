export const money = (n: number) => '$' + (Number.isFinite(n) ? n : 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const dstr = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
export const initials = (n: string) => {
  if (!n) return 'AD';
  const parts = n.trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts.map((w) => w[0]).slice(0, 2).join('').toUpperCase() : 'AD';
};
export const ago = (days: number) => { const d = new Date(Date.now() - days * 864e5); d.setHours(10, 30, 0, 0); return d.toISOString(); };
