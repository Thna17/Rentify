/**
 * Copy for the seller landing page.
 *
 * Lifted from site-data.ts on origin/prototype (Seypa47) — only the two
 * collections the seller pages actually read, rather than the whole file,
 * which also carried homepage and about-page content this tree already has.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

export interface SellerTool {
  icon: string;
  title: string;
  description: string;
}

export interface SellerStep {
  number: string;
  title: string;
  description: string;
  icon: string;
}

/**
 * The actual registration → first order path, worded to match what the
 * onboarding flow and seller workspace really do — shared between the
 * seller home page and the FAQ page.
 */
export const sellerSteps: SellerStep[] = [
  {
    number: '01',
    title: 'Use your KhmerCraft account',
    description: 'Sign in or create one marketplace account for shopping, orders, and every store you own.',
    icon: 'user',
  },
  {
    number: '02',
    title: 'Set up your store',
    description: 'Add your store information, location, category, and public shop details.',
    icon: 'store',
  },
  {
    number: '03',
    title: 'Add your products',
    description: 'Create listings with names, prices, descriptions, images, and stock.',
    icon: 'plus-square',
  },
  {
    number: '04',
    title: 'Review incoming orders',
    description: 'Use the seller workspace to accept orders and follow their status.',
    icon: 'clipboard',
  },
  {
    number: '05',
    title: 'Grow from there',
    description: 'Use buyer reviews and repeat orders to see what to add or improve next.',
    icon: 'chart',
  },
];

/**
 * The real capabilities of the seller workspace — shared across the seller
 * pages (home, explore, pricing) so "what you get" stays one honest list
 * instead of three copies that can drift apart.
 */
export const sellerTools: SellerTool[] = [
  {
    icon: 'box',
    title: 'Products and inventory',
    description: 'Create product listings, select marketplace categories, and update stock.',
  },
  {
    icon: 'cart',
    title: 'Order management',
    description: 'Review buyer orders and keep their fulfillment status clear.',
  },
  {
    icon: 'store',
    title: 'Store profile',
    description: 'Manage how your business information appears to customers.',
  },
  {
    icon: 'review',
    title: 'Reviews and settings',
    description: 'See buyer feedback and maintain your seller account in one workspace.',
  },
];

export const faqItems: FaqItem[] = [
  {
    question: 'How much does it cost to sell?',
    answer:
      'Starter is $0 per month, Growth is $12, and Professional is $29. Paid plan billing is confirmed separately before money is collected.',
  },
  {
    question: 'What shipping options are available?',
    answer:
      'Available delivery methods depend on your product, pickup location, and buyer destination. Confirm supported options during onboarding before promising delivery to customers.',
  },
  {
    question: 'How do I get paid?',
    answer:
      'Payout details are collected and confirmed during seller setup. Your seller workspace includes a sales and payout area for reviewing payment records.',
  },
  {
    question: 'Can I sell from any province?',
    answer:
      'The onboarding form accepts Cambodian seller locations. If your location or delivery coverage needs special handling, confirm it during store review.',
  },
];
