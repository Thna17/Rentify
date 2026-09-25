import {
  FlaskConical,
  Gift,
  Headphones,
  Heart,
  Leaf,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Truck,
  Wallet,
} from 'lucide-react';
import { OwnerEditButton } from '@rentify/storefront/owner/StorefrontOwner';
import { useI18n } from '../i18n';

// First match wins, so more specific words come first. Merchants only write
// the text; the icon follows from it, and anything unmatched gets a sparkle.
const ICON_RULES = [
  // Payment before delivery, so "Cash on delivery" gets a wallet rather than a truck.
  [/pay|cash|cod\b|khqr|bakong|ទូទាត់|សាច់ប្រាក់/i, Wallet],
  [/deliver|shipping|ship\b|courier|ដឹក/i, Truck],
  [/return|exchange|refund|ប្តូរ|សង/i, RotateCcw],
  [/natural|organic|plant|botanical|herb|eco|ធម្មជាតិ|រុក្ខជាតិ/i, Leaf],
  [/clean|transparent|lab|tested|formula|ingredient|science|គ្រឿងផ្សំ/i, FlaskConical],
  [/cruelty|kind|love|care|handmade|ស្រឡាញ់|ថែ/i, Heart],
  [/authentic|genuine|original|secure|safe|trusted|warranty|quality|ធានា|សុវត្ថិភាព|គុណភាព/i, ShieldCheck],
  [/gift|wrap|កាដូ/i, Gift],
  [/support|help|chat|call|contact|ជំនួយ/i, Headphones],
];

export const highlightIcon = (title, detail = '') => {
  const text = `${title} ${detail}`;
  return ICON_RULES.find(([pattern]) => pattern.test(text))?.[1] || Sparkles;
};

/** The merchant's up-to-four store promises, in a strip under the hero. */
export function Highlights({ items }) {
  const { t } = useI18n();
  if (!items?.length) return null;
  const columns = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-2 sm:grid-cols-3', 4: 'grid-cols-2 lg:grid-cols-4' }[items.length];

  return (
    <section aria-label={t('home.highlights')} className="store-container relative z-10 -mt-6 sm:-mt-8">
      <OwnerEditButton section="Highlights" className="absolute -top-11 right-4 sm:right-6 lg:right-8" />
      {/* The 1px gaps over a border-coloured list draw the dividers at every column count. */}
      <ul
        className={`grid gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/70 shadow-[0_18px_40px_-28px_oklch(var(--foreground)/0.4)] ${columns}`}
      >
        {items.map(({ title, detail }, index) => {
          const Icon = highlightIcon(title, detail);
          // An odd last item spans both phone columns instead of leaving an empty cell.
          return (
            <li
              key={`${title}-${index}`}
              className={`flex flex-col gap-2 bg-card px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-5 ${
                items.length % 2 === 1 && index === items.length - 1 ? 'col-span-2 sm:col-span-1' : ''
              }`}
            >
              <Icon className="h-6 w-6 shrink-0 text-primary sm:h-7 sm:w-7" strokeWidth={1.5} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
