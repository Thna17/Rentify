import {
  Baby,
  Gift,
  Home,
  Laptop,
  Palette,
  Percent,
  Shirt,
  ShoppingBasket,
  Flower2 as Flower,
  Store,
} from 'lucide-react';

// Optimised copies of the seeded store photos and marketplace artwork
const FILES = import.meta.glob('../../assets/wall/**/*.webp', { eager: true, import: 'default' });
export const asset = (path) => FILES[`../../assets/wall/${path}.webp`];
const photo = (store, n) => asset(`${store}/${n}`);

export const money = (value) =>
  `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const make = (store, items) =>
  items.map(([n, name, price, was]) => ({ id: `${store.id}-${n}`, name, price, was, image: photo(store.id, n), store }));

// The five seeded stores, each dressed in its own storefront template
const PHONE = {
  id: 'phone-corner',
  name: 'Phone Corner',
  domain: 'phonecorner.rentify.shop',
  logo: asset('logos/phone-corner'),
  deliveryFee: 2,
  rating: 4.9,
  hero: 'phone',
  theme: {
    display: "font-['SF_Pro_Display',-apple-system,BlinkMacSystemFont,'Helvetica_Neue',sans-serif] font-semibold leading-[1.02] tracking-[-0.045em]",
    accentLine: 'bg-gradient-to-r from-[#7db4ff] via-[#a5b4fc] to-[#e9a8ff] bg-clip-text text-transparent',
    eyebrow: 'pill',
    bg: 'bg-[#0b1220]',
    surface: 'bg-[#111a2e]',
    ink: 'text-white',
    muted: 'text-white/60',
    accent: 'bg-[#2563eb] text-white',
    accentText: 'text-[#60a5fa]',
    line: 'border-white/10',
    font: 'font-sans',
    radius: 'rounded-[22px]',
  },
};
const GLOW = {
  id: 'glow-skincare-studio',
  name: 'Glow Skincare Studio',
  domain: 'glowskincare.rentify.shop',
  logo: asset('logos/glow-skincare-studio'),
  deliveryFee: 1.5,
  rating: 4.8,
  hero: 'glow',
  theme: {
    display: 'font-bold leading-[1.02] tracking-[-0.035em]',
    accentLine: '',
    eyebrow: 'plain',
    bg: 'bg-[#fff6f3]',
    surface: 'bg-white',
    ink: 'text-[#3b1d27]',
    muted: 'text-[#3b1d27]/60',
    accent: 'bg-[#be3d6a] text-white',
    accentText: 'text-[#be3d6a]',
    line: 'border-[#3b1d27]/10',
    font: 'font-[Georgia,serif]',
    radius: 'rounded-[28px]',
  },
};
const MUNCHIE = {
  id: 'munchie-snack-house',
  name: 'Munchie Snack House',
  domain: 'munchie.rentify.shop',
  logo: asset('logos/munchie-snack-house'),
  deliveryFee: 1.5,
  rating: 4.7,
  hero: 'munchie',
  theme: {
    display: "font-[ui-rounded,'SF_Pro_Rounded','Arial_Rounded_MT_Bold',system-ui,sans-serif] font-black leading-[0.98] tracking-[-0.025em]",
    accentLine: 'text-[#fde047]',
    eyebrow: 'sticker',
    bg: 'bg-[#fffaf2]',
    surface: 'bg-white',
    ink: 'text-[#7c2d12]',
    muted: 'text-[#7c2d12]/60',
    accent: 'bg-[#ea580c] text-white',
    accentText: 'text-[#ea580c]',
    line: 'border-[#7c2d12]/10',
    font: 'font-sans',
    radius: 'rounded-[26px]',
  },
};
const THRIFT = {
  id: 'second-life-thrift',
  name: 'Second Life Thrift',
  domain: 'secondlife.rentify.shop',
  logo: null,
  deliveryFee: 2,
  rating: 4.8,
  hero: 'thrift',
  theme: {
    display: "font-['Didot','Bodoni_72','Bodoni_MT',Georgia,serif] font-normal leading-[0.92] tracking-[-0.02em]",
    accentLine: 'italic',
    eyebrow: 'rule',
    bg: 'bg-[#f3eee5]',
    surface: 'bg-[#faf7f1]',
    ink: 'text-[#1c1917]',
    muted: 'text-[#1c1917]/55',
    accent: 'bg-[#1c1917] text-[#f3eee5]',
    accentText: 'text-[#1c1917]',
    line: 'border-[#1c1917]/15',
    font: 'font-sans',
    radius: 'rounded-none',
  },
};
const BRIGHT = {
  id: 'bright-minds-school-supply',
  name: 'Bright Minds',
  domain: 'brightminds.rentify.shop',
  logo: asset('logos/bright-minds-school-supply'),
  deliveryFee: 1.5,
  rating: 4.9,
  hero: 'bright',
  theme: {
    display: "font-['Avenir_Next','Avenir','Futura','Century_Gothic',system-ui,sans-serif] font-extrabold leading-[1.0] tracking-[-0.03em]",
    accentLine: 'text-[#1d4ed8]',
    eyebrow: 'pillBlue',
    bg: 'bg-white',
    surface: 'bg-[#f6f8ff]',
    ink: 'text-[#0f172a]',
    muted: 'text-[#0f172a]/55',
    accent: 'bg-[#1d4ed8] text-white',
    accentText: 'text-[#1d4ed8]',
    line: 'border-[#0f172a]/10',
    font: 'font-sans',
    radius: 'rounded-[20px]',
  },
};

PHONE.products = make(PHONE, [
  [10, 'iPhone 17 Pro · Cosmic Black', 1099],
  [12, 'iPhone 17 Pro Max · Silver', 1199],
  [11, 'iPhone 17 Pro · Burgundy', 1099],
  [4, 'iPhone Air · Sky', 949],
  [6, 'iPhone 16 Plus · Purple', 779, 829],
  [3, 'iPhone 15 Pro · Natural', 799, 899],
  [2, 'iPhone 15 · Green', 629],
  [8, 'iPhone 16 Pro · Black', 899],
]);
GLOW.products = make(GLOW, [
  [1, 'Watermelon Glow Cleanser', 8.9],
  [2, 'Strawberry Bright Face Wash', 6.5, 7.9],
  [11, 'Papaya Glow Face Wash', 7.4],
  [5, 'Simple Hydrating Cleanser', 6.9],
  [10, 'Turmeric Radiance Wash', 6.2, 7.5],
  [9, 'Cloud Foam Cleanser', 8.5],
  [6, 'Charcoal Deep Clean Wash', 5.5],
  [4, 'Vincé Gentle Gel Cleanser', 9.8],
]);
MUNCHIE.products = make(MUNCHIE, [
  [12, 'LyLy Kiss Wafer Box', 1.25, 1.5],
  [1, 'LyLy MOMO Corn Puffs', 1, 1.25],
  [9, 'LyLy Spicy Crab Chips', 1.25, 1.6],
  [4, 'Back to School Wheel Snack', 0.75, 1],
  [2, 'Spicy Prawn Crackers', 1.1],
  [6, 'Pineapple Cream Wafer', 1.25],
  [11, 'Crispy Rice Chips', 1.15],
  [5, 'Sweet Corn Sticks', 0.9],
]);
THRIFT.products = make(THRIFT, [
  [6, 'Yellow Polo Shirt', 13.9, 17.38],
  [7, 'Striped Rugby Shirt', 13.87],
  [9, 'Colour-Block Rugby', 14.2],
  [1, 'Navy Long-Sleeve Polo', 11.5],
  [3, 'Olive Pique Polo', 10.5],
  [12, 'Yellow Swim Shorts', 4.21, 5.26],
  [10, 'Lilac Print Swim Shorts', 4.21],
  [8, 'Black Everyday Shorts', 6.5],
]);
BRIGHT.products = make(BRIGHT, [
  [1, 'Canvas Day Backpack', 14.9],
  [12, 'Astronaut Kids Backpack', 16.5, 19],
  [6, 'Mildliner Highlighter Set', 5.9],
  [9, 'FriXion Erasable Pens · 10', 7.8],
  [4, 'Soft Gel Pens · 12 colours', 3.9],
  [8, 'Graphite Sketch Set', 9.5],
  [11, 'Pastel Highlighters', 3.2, 3.9],
  [2, 'A4 Origami Paper · 100', 2.5],
]);

export const STORES = [PHONE, GLOW, MUNCHIE, THRIFT, BRIGHT];
export const BY_ID = Object.fromEntries(STORES.map((store) => [store.id, store]));

// Marketplace categories, with the real artwork from the marketplace app
export const CATEGORIES = [
  { id: 'fashion', icon: Shirt, art: asset('categories/fashion'), poster: asset('posters/fashion'), tone: 'from-[#fde4d6] to-[#fbd0c0]' },
  { id: 'food', icon: ShoppingBasket, art: asset('categories/food-groceries'), poster: asset('posters/food-groceries'), tone: 'from-[#e3f3dc] to-[#cfe9c4]' },
  { id: 'home', icon: Home, art: asset('categories/home-living'), poster: asset('posters/home-living'), tone: 'from-[#fbecd9] to-[#f3dcc0]' },
  { id: 'beauty', icon: Flower, art: asset('categories/beauty-wellness'), poster: asset('posters/beauty-wellness'), tone: 'from-[#fde1ea] to-[#f8c9d8]' },
  { id: 'electronics', icon: Laptop, art: asset('categories/electronics'), poster: asset('posters/electronics'), tone: 'from-[#e3ecfb] to-[#d2e0f7]' },
  { id: 'kids', icon: Baby, art: asset('categories/kids-family'), poster: asset('posters/kids-family'), tone: 'from-[#efe6fb] to-[#e0d2f7]' },
  { id: 'arts', icon: Palette, art: asset('categories/arts-culture') },
  { id: 'stores', icon: Store, art: asset('categories/stores') },
  { id: 'gifts', icon: Gift, art: asset('categories/gifts') },
  { id: 'discount', icon: Percent, art: asset('categories/discount') },
];

export const PROMOS = {
  silk: asset('promos/silk-weaving'),
  produce: asset('promos/tropical-produce'),
  beauty: asset('promos/botanical-beauty'),
  fashion: asset('promos/khmer-fashion'),
  pantry: asset('promos/local-pantry'),
  homeware: asset('promos/artisan-homeware'),
};

// A cross-store feed for the marketplace
export const FLASH_DEALS = [MUNCHIE.products[3], GLOW.products[1], THRIFT.products[0], PHONE.products[4], BRIGHT.products[1], MUNCHIE.products[0]];
export const PICKS = [GLOW.products[0], THRIFT.products[1], PHONE.products[0], MUNCHIE.products[2], BRIGHT.products[2], GLOW.products[2], THRIFT.products[5], PHONE.products[3]];

export const discount = (item) => (item.was ? Math.round((1 - item.price / item.was) * 100) : 0);
export { PHONE, GLOW, MUNCHIE, THRIFT, BRIGHT };
