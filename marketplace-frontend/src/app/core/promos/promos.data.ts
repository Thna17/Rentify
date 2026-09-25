import { Promo } from './promo.models';

/**
 * Every promo slot on the homepage, in one place. Static for now; when the
 * admin side manages promos, replace these with an API call returning the
 * same `Promo` shape per slot.
 */
export const PROMO_SLOTS: {
  heroSide: Promo[];
  flashDeals: Promo;
  collections: Promo[];
  smartphones: Promo;
} = {
  heroSide: [
    {
      id: 'free-delivery',
      eyebrow: 'Spend $50+',
      title: 'Free delivery',
      text: 'On orders over $50 in Phnom Penh.',
      cta: 'Start shopping',
      link: '/products',
      image: 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=600&q=80',
    },
    {
      id: 'pchum-ben',
      eyebrow: 'បុណ្យភ្ជុំបិណ្ឌ',
      eyebrowLang: 'km',
      title: 'Happy Pchum Ben',
      text: 'Offerings, gifts and traditional wear.',
      cta: 'Shop the festival',
      link: '/categories/arts-culture',
      image: '/categories/arts-culture.png',
      imageMode: 'illustration',
      background: 'radial-gradient(120% 140% at 85% 60%, #d99a3a 0%, #8a4b12 55%, #4a2308 100%)',
    },
    {
      id: 'all-offers',
      eyebrow: 'Deals',
      title: 'All offers',
      text: 'Every discount from every store.',
      cta: 'See all deals',
      link: '/products',
      params: { sale: '1' },
      image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&q=80',
    },
  ],
  flashDeals: {
    id: 'elevate-space',
    title: 'Elevate your space',
    text: 'Furniture, decor and more from local makers.',
    cta: 'Shop now',
    link: '/products',
    params: { category: 'home-living' },
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=900&q=80',
  },
  collections: [
    {
      id: 'made-in-cambodia',
      eyebrow: 'Local pride',
      title: 'Made in Cambodia',
      text: 'Support local makers and bring authentic craftsmanship home.',
      cta: 'Explore collection',
      link: '/products',
      params: { collection: 'handmade-crafts' },
      image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=900&q=80',
      alt: 'Handwoven basket, ceramics, and woodcarving on a wooden table',
    },
    {
      id: 'gifts-under-20',
      eyebrow: 'Great gifts',
      title: 'Gifts under $20',
      text: "Thoughtful finds that won't break the bank.",
      cta: 'Shop gifts',
      link: '/products',
      params: { search: 'gift' },
      image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=900&q=80',
      alt: 'Wrapped gift box with ribbon',
    },
    {
      id: 'new-this-week',
      eyebrow: 'Just in',
      title: 'New this week',
      text: 'Fresh arrivals from our talented sellers.',
      cta: 'Discover now',
      link: '/products',
      params: { sort: 'newest' },
      image: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=900&q=80',
      alt: 'Freshly arrived handmade ceramics',
    },
  ],
  smartphones: {
    id: 'new-iphone',
    eyebrow: 'Just launched',
    title: 'The new iPhone is here',
    text: 'Latest phones and accessories from trusted local stores.',
    cta: 'Shop smartphones',
    link: '/products',
    params: { category: 'electronics', subcategory: 'phones-tablets' },
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900&q=80',
    alt: 'Smartphone held in hand',
  },
};
