import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Which auth screen this is. Each one gets its own colourway and its own
 * story copy, so /login, /register and the recovery screens are recognisably
 * different pages rather than one template with the heading swapped — while
 * still sharing the same weave, brand mark and layout.
 */
export type AuthVariant =
  | 'signin'
  | 'create'
  | 'recover'
  | 'verify'
  | 'seller'
  | 'admin';

interface Story {
  kicker: string;
  headline: string;
  body: string;
  /** Three short proof points along the bottom edge. */
  marks: string[];
}

const STORIES: Record<AuthVariant, Story> = {
  signin: {
    kicker: 'Cambodian stores, one marketplace',
    headline: 'Shop closer to home.',
    body: 'Everyday products, local food and meaningful craft from trusted stores across Cambodia.',
    marks: ['Local stores', 'Secure checkout', 'Delivery updates'],
  },
  create: {
    kicker: 'Every order reaches a real person',
    headline: 'Buy from the maker, not the middleman.',
    body: 'Your account follows your orders from the shop floor to your door — and lets you open a store of your own whenever you are ready.',
    marks: ['Free to join', 'Track every order', 'Become a seller anytime'],
  },
  recover: {
    kicker: 'Locked out? It happens',
    headline: 'Let us get you back in.',
    body: 'We will email you a single-use link. Your orders, saved addresses and store stay exactly where you left them.',
    marks: ['One-time link', 'Expires quickly', 'Nothing else changes'],
  },
  verify: {
    kicker: 'One last step',
    headline: 'Check your inbox.',
    body: 'A six-digit code is on its way. Confirming it keeps your account — and the orders you place with it — yours alone.',
    marks: ['Six digits', 'Valid 10 minutes', 'Then you are in'],
  },
  seller: {
    kicker: 'For the people behind the stalls',
    headline: 'Your storefront, your terms.',
    body: 'Manage incoming orders, keep your catalogue current, and get paid for what you make.',
    marks: ['Accept orders', 'Track payouts', 'Own your storefront'],
  },
  admin: {
    kicker: 'Restricted access',
    headline: 'Marketplace operations.',
    body: 'Authorised administrators only. Every action taken here is attributable.',
    marks: ['Authorised access', 'Audited', 'Least privilege'],
  },
};

@Component({
  selector: 'app-auth-layout',
  imports: [RouterLink],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css',
  host: { '[attr.data-variant]': 'resolvedVariant()' },
})
export class AuthLayout {
  /** Neutral default: sellers use several of these screens too. */
  readonly eyebrow = input('KhmerCraft account');
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly variant = input<AuthVariant | null>(null);
  /**
   * Predates `variant` and is still set by the seller and admin portals.
   * Honoured as a fallback so those screens keep their dark treatment
   * without having to be edited in the same change.
   */
  readonly admin = input(false);

  protected readonly resolvedVariant = computed<AuthVariant>(
    () => this.variant() ?? (this.admin() ? 'admin' : 'signin'),
  );
  protected readonly story = computed(() => STORIES[this.resolvedVariant()]);
}
