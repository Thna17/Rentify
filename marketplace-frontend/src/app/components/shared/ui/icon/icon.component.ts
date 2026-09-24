import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Lightweight line-icon system (Lucide-style, 24x24, stroke-based).
 * Replaces every emoji used across the app with a crisp, theme-colored SVG symbol.
 * Usage: <ui-icon name="search"></ui-icon>  or  <ui-icon name="cart" [size]="20"></ui-icon>
 */
const ICONS: Record<string, string> = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/>',
  cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M3 4h2l2.3 11.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 8H6"/>',
  bag: '<path d="M6 8h12l1 12.2A2 2 0 0 1 17 22H7a2 2 0 0 1-2-1.8L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20.5c1.3-3.6 4-5.5 7-5.5s5.7 1.9 7 5.5"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M2.5 20c1-3.2 3.4-5 6.5-5s5.5 1.8 6.5 5"/><circle cx="17.5" cy="9" r="2.4"/><path d="M16 12.2c2 .3 3.6 1.7 4.5 4.3"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-up': '<path d="m18 15-6-6-6 6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'arrow-right': '<path d="M4 12h16"/><path d="m13 5 7 7-7 7"/>',
  'arrow-left': '<path d="M20 12H4"/><path d="m11 19-7-7 7-7"/>',
  star: '<path d="m12 3 2.6 5.9 6.4.6-4.8 4.3 1.4 6.2-5.6-3.4-5.6 3.4 1.4-6.2-4.8-4.3 6.4-.6Z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.3 2.3 4.7-5"/>',
  shield: '<path d="M12 3 4.5 5.8v5.4c0 5 3.2 8.3 7.5 9.8 4.3-1.5 7.5-4.8 7.5-9.8V5.8Z"/><path d="m9 12 2 2 4-4.2"/>',
  truck: '<path d="M2 7h11v9H2z"/><path d="M13 10h4l3.5 3.5V16H13z"/><circle cx="6.5" cy="18.5" r="1.7"/><circle cx="17" cy="18.5" r="1.7"/>',
  'credit-card': '<rect x="2.5" y="5.5" width="19" height="13" rx="2.2"/><path d="M2.5 10h19"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.2a4 4 0 0 1 8 0v3.3"/>',
  mail: '<rect x="2.5" y="4.8" width="19" height="14.4" rx="2.2"/><path d="m3 6 9 7 9-7"/>',
  phone: '<path d="M6.5 3.5 9 6l-1.7 3.2A13 13 0 0 0 14.8 16l3.2-1.7 2.5 2.5-1.1 2.6a2 2 0 0 1-2.2 1.2A17.5 17.5 0 0 1 3.9 6.8a2 2 0 0 1 1.2-2.2Z"/>',
  'map-pin': '<path d="M12 21s7-6.3 7-11.5A7 7 0 0 0 5 9.5C5 14.7 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.4"/>',
  x: '<path d="m18 6-12 12"/><path d="m6 6 12 12"/>',
  menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
  plus: '<path d="M12 4v16"/><path d="M4 12h16"/>',
  minus: '<path d="M4 12h16"/>',
  trash: '<path d="M4.5 7h15"/><path d="M9.5 7V4.8c0-.7.5-1.2 1.2-1.2h2.6c.7 0 1.2.5 1.2 1.2V7"/><path d="M6.5 7 7.3 20a2 2 0 0 0 2 1.8h5.4a2 2 0 0 0 2-1.8L17.5 7"/>',
  edit: '<path d="M4 20h4.2L19.6 8.6a2.2 2.2 0 0 0-3.1-3.1L5.5 16.9 4 20Z"/>',
  filter: '<path d="M3.5 5h17L14 12.7v5.6l-4 2v-7.6Z"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.2"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.2"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.2"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.2"/>',
  list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
  share: '<circle cx="18" cy="5.5" r="2.3"/><circle cx="6" cy="12" r="2.3"/><circle cx="18" cy="18.5" r="2.3"/><path d="m8.1 10.8 7.8-4.4"/><path d="m8.1 13.2 7.8 4.4"/>',
  facebook: '<path d="M14.5 21v-7.2h2.4l.4-2.8h-2.8V9.2c0-.8.2-1.4 1.4-1.4h1.5V5.3C17 5.2 16 5 14.9 5c-2.3 0-3.9 1.4-3.9 4v2h-2.6v2.8h2.6V21Z"/>',
  google: '<path fill="#4285F4" stroke="none" d="M23.64 12.27c0-.82-.07-1.6-.2-2.36H12v4.51h6.53c-.28 1.48-1.14 2.73-2.42 3.57v2.96h3.92c2.3-2.12 3.61-5.24 3.61-8.68z"/><path fill="#34A853" stroke="none" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.92-2.96c-1.09.73-2.48 1.16-4.03 1.16-3.1 0-5.72-2.09-6.66-4.9H1.28v3.05C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" stroke="none" d="M5.34 14.4c-.24-.73-.38-1.5-.38-2.4s.14-1.67.38-2.4V6.55H1.28C.47 8.24 0 10.06 0 12s.47 3.76 1.28 5.45l4.06-3.05z"/><path fill="#EA4335" stroke="none" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.28 6.55l4.06 3.05C6.28 6.79 8.9 4.75 12 4.75z"/>',
  'facebook-color': '<path fill="#1877F2" stroke="none" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z"/>',
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1"/>',
  twitter: '<path d="M21 5.5c-.7.4-1.6.7-2.4.8a3.5 3.5 0 0 0-6 3.2A9.9 9.9 0 0 1 5.3 5.9a3.5 3.5 0 0 0 1.1 4.7c-.6 0-1.2-.2-1.7-.5 0 1.7 1.2 3.2 2.9 3.5-.5.1-1.1.2-1.7.1a3.5 3.5 0 0 0 3.3 2.4A7 7 0 0 1 3.5 18a10 10 0 0 0 5.4 1.6c6.5 0 10-5.4 10-10.1v-.5c.7-.5 1.3-1.1 1.8-1.8Z"/>',
  linkedin: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><circle cx="8" cy="8.2" r="1.3"/><path d="M8 11.5v6"/><path d="M12 17.5v-3.7c0-1.4 1-2.3 2.3-2.3 1.3 0 2.2.9 2.2 2.3v3.7"/><path d="M12 11.5v6"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>',
  'eye-off': '<path d="m3 3 18 18"/><path d="M10.6 5.7c.5-.1.9-.2 1.4-.2 6 0 9.5 6.5 9.5 6.5a15 15 0 0 1-3.2 4"/><path d="M6.2 6.9A15.4 15.4 0 0 0 2.5 12S6 18.5 12 18.5c1.3 0 2.4-.3 3.4-.8"/><path d="M9.8 10a2.8 2.8 0 0 0 4 4"/>',
  upload: '<path d="M12 15V4"/><path d="m7 8.5 5-5 5 5"/><path d="M4.5 15v3.8c0 1 .8 1.7 1.7 1.7h11.6c1 0 1.7-.8 1.7-1.7V15"/>',
  gift: '<rect x="3" y="9" width="18" height="4.2" rx="1"/><rect x="4.3" y="13.2" width="15.4" height="7.3" rx="1"/><path d="M12 9v11.5"/><path d="M12 9c-1-2.8-2.7-4.5-4.3-4.5A2 2 0 0 0 5.8 6.6C5.8 8 8 9 12 9Z"/><path d="M12 9c1-2.8 2.7-4.5 4.3-4.5a2 2 0 0 1 1.9 2.1C18.2 8 16 9 12 9Z"/>',
  tag: '<path d="M12.6 3.5H6.2a1.8 1.8 0 0 0-1.8 1.8v6.4c0 .5.2 1 .5 1.3l8.9 8.9c.7.7 1.8.7 2.5 0l6.4-6.4c.7-.7.7-1.8 0-2.5l-8.9-8.9c-.4-.4-.8-.6-1.2-.6Z"/><circle cx="9" cy="9" r="1.4"/>',
  package: '<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
  home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1Z"/>',
  store: '<path d="M4 10v9.5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V10"/><path d="M3 4h18l1.4 4.6a1.8 1.8 0 0 1-1.8 2.3H3.4A1.8 1.8 0 0 1 1.6 8.6Z"/><path d="M9.5 20.5v-5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v5"/>',
  sparkles: '<path d="M12 3v3.4"/><path d="M12 17.6V21"/><path d="M3 12h3.4"/><path d="M17.6 12H21"/><path d="m5.6 5.6 2.4 2.4"/><path d="m16 16 2.4 2.4"/><path d="m18.4 5.6-2.4 2.4"/><path d="m8 16-2.4 2.4"/>',
  award: '<circle cx="12" cy="8.5" r="5.3"/><path d="m8.3 13 -1.6 7.5 5.3-2.7 5.3 2.7L15.7 13"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.3l3.6 2"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M3.5 9.8h17"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 2.4 4 5.6 4 9s-1.4 6.6-4 9c-2.6-2.4-4-5.6-4-9s1.4-6.6 4-9Z"/>',
  camera: '<path d="M4 8.3A1.8 1.8 0 0 1 5.8 6.5H8l1-1.8h6l1 1.8h2.2A1.8 1.8 0 0 1 20 8.3v9.4a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 17.7Z"/><circle cx="12" cy="12.3" r="3.4"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m4 17 4.6-4.7a2 2 0 0 1 2.8 0L14 15"/><path d="m14.5 14 1.7-1.7a2 2 0 0 1 2.8 0L21 14.3"/>',
  download: '<path d="M12 4v11.3"/><path d="m7.5 11 4.5 4.5 4.5-4.5"/><path d="M4.5 16v3.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V16"/>',
  'external-link': '<path d="M10 6H6.5A2.5 2.5 0 0 0 4 8.5v9A2.5 2.5 0 0 0 6.5 20h9a2.5 2.5 0 0 0 2.5-2.5V14"/><path d="M14 4h6v6"/><path d="M20 4 11 13"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="8" r="0.2"/>',
  'alert-circle': '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><circle cx="12" cy="16.3" r="0.2"/>',
  'trending-up': '<path d="m3 16 6-6.5 4 4L21 5"/><path d="M15 5h6v6"/>',
  'dollar-sign': '<path d="M12 2.5v19"/><path d="M17 6.8c0-1.8-2-3-5-3-3.2 0-5.3 1.5-5.3 3.6 0 2 1.8 2.8 5.3 3.5 3.6.7 5.3 1.7 5.3 3.7 0 2.1-2.2 3.7-5.3 3.7-3 0-5-1.2-5-3"/>',
  percent: '<path d="M5 19 19 5"/><circle cx="7" cy="7" r="2.3"/><circle cx="17" cy="17" r="2.3"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
  wallet: '<path d="M3.5 6.5h13.8a2.2 2.2 0 0 1 2.2 2.2v9a2.2 2.2 0 0 1-2.2 2.2H5.7a2.2 2.2 0 0 1-2.2-2.2Z"/><path d="M3.5 6.5c0-1 .8-2 2-2h9.8"/><circle cx="16.3" cy="13" r="1.4"/>',
  'refresh-cw': '<path d="M20 8a8 8 0 0 0-14.5-3.5"/><path d="M4 4v5h5"/><path d="M4 16a8 8 0 0 0 14.5 3.5"/><path d="M20 20v-5h-5"/>',
  smartphone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.2"/><path d="M11 18.2h2"/>',
  banknote: '<rect x="2.5" y="6.5" width="19" height="11" rx="1.8"/><circle cx="12" cy="12" r="2.6"/><path d="M6 8.5v0"/><path d="M18 15.5v0"/>',
  leaf: '<path d="M6 20c9 0 13-6 13-14C10 6 6 10.5 6 18Z"/><path d="M6 20c1-4 3-7 8-9"/>',
  scissors: '<circle cx="7" cy="6.5" r="2.2"/><circle cx="7" cy="17.5" r="2.2"/><path d="m20 5-11.5 7"/><path d="m8.5 12 11.5 7"/>',
  moon: '<path d="M20 13.5A8.5 8.5 0 1 1 10.5 4a7 7 0 0 0 9.5 9.5Z"/>',
  key: '<circle cx="8" cy="15" r="4.2"/><path d="m11 12 8.5-8.5"/><path d="m16 6 2.5 2.5"/><path d="m18.5 3.5 2 2"/>',
  send: '<path d="m3 11 18-8-8 18-2.5-7.5L3 11Z"/>',
  loader: '<path d="M12 3v3.5"/><path d="M12 17.5V21"/><path d="m5.6 5.6 2.4 2.4"/><path d="m16 16 2.4 2.4"/><path d="M3 12h3.5"/><path d="M17.5 12H21"/><path d="m5.6 18.4 2.4-2.4"/><path d="m16 8 2.4-2.4"/>',
};

@Component({
  selector: 'ui-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      [attr.fill]="filled ? (color || 'currentColor') : 'none'"
      [attr.stroke]="color || 'currentColor'"
      [attr.stroke-width]="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="ui-icon"
      [innerHTML]="path"
    ></svg>
  `,
  styles: [`
    :host { display: inline-flex; line-height: 0; flex-shrink: 0; }
    .ui-icon { display: block; }
  `]
})
export class IconComponent {
  @Input() name: string = 'info';
  @Input() size: number = 20;
  @Input() strokeWidth: number = 1.8;
  @Input() color?: string;
  @Input() filled: boolean = false;

  constructor(private sanitizer: DomSanitizer) {}

  get path(): SafeHtml {
    // These SVG fragments are all static, hardcoded strings from the ICONS
    // map above — never user input — so trusting them here is safe and is
    // what actually lets the <path>/<circle> markup render instead of
    // being stripped by Angular's default HTML sanitizer.
    const raw = ICONS[this.name] || ICONS['info'];
    return this.sanitizer.bypassSecurityTrustHtml(raw);
  }
}
