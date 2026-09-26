/**
 * One promotional card (ad, collection, campaign). Every promo on the
 * marketplace uses this shape so an admin tool can later create and edit them
 * without touching page code: only the data changes, never the layout.
 */
export interface Promo {
  id: string;
  /** Small label above the title, e.g. "Just launched". Optional. */
  eyebrow?: string;
  /** Language of the eyebrow when it is not English (e.g. 'km'). */
  eyebrowLang?: string;
  title: string;
  text?: string;
  cta: string;
  /** Router path, e.g. '/products' or '/categories/electronics'. */
  link: string;
  params?: Record<string, string>;
  image: string;
  alt?: string;
  /**
   * 'photo' (default): image fills the card.
   * 'illustration': transparent artwork shown on the right over `background`.
   */
  imageMode?: 'photo' | 'illustration';
  /** CSS background behind an illustration. */
  background?: string;
  badge?: string;
  perks?: string[];
  kicker?: string;
}

/**
 * The fixed formats a promo can be shown in. Sizes live in PromoCardComponent,
 * so every card of the same format is always the same size.
 *
 * - 'card':     300px tall  (collections, section banners)
 * - 'compact':  124px tall  (stacked side cards next to the hero)
 * - 'featured': stretches to 100% equal height of adjacent cards with rich content
 */
export type PromoFormat = 'card' | 'compact' | 'featured';
