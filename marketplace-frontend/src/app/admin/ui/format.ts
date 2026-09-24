export const money = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
export const dstr = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
export const initials = (n: string) => n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
export const ago = (days: number) => { const d = new Date(Date.now() - days * 864e5); d.setHours(10, 30, 0, 0); return d.toISOString(); };