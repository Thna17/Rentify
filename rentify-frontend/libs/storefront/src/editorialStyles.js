import preview5 from './assets/editorial/previews/5-desktop.webp';
import mobile5 from './assets/editorial/previews/5-mobile.webp';
import preview6 from './assets/editorial/previews/6-desktop.webp';
import mobile6 from './assets/editorial/previews/6-mobile.webp';
import preview7 from './assets/editorial/previews/7-desktop.webp';
import mobile7 from './assets/editorial/previews/7-mobile.webp';
import preview8 from './assets/editorial/previews/8-desktop.webp';
import mobile8 from './assets/editorial/previews/8-mobile.webp';
import preview9 from './assets/editorial/previews/9-desktop.webp';
import mobile9 from './assets/editorial/previews/9-mobile.webp';
import preview10 from './assets/editorial/previews/10-desktop.webp';
import mobile10 from './assets/editorial/previews/10-mobile.webp';
import home from './assets/editorial/home.webp';
import electronics from './assets/editorial/electronics.webp';
import beauty from './assets/editorial/beauty.webp';
import grocery from './assets/editorial/grocery.webp';
import fashion from './assets/editorial/fashion.webp';
import crafts from './assets/editorial/crafts.webp';

/** Three coordinated brand colors; merchant-saved colors still take precedence. */
export const EDITORIAL_STYLES = {
  5: {
    key: 'home',
    name: 'Editorial Minimal',
    industry: 'Home & Living',
    industryKh: 'ផ្ទះ និងការរស់នៅ',
    image: home,
    palette: {
      primary: '#164b2b',
      secondary: '#f3f1eb',
      background: '#ffffff',
    },
    heroBase: '#f4efe6',
    heroText: '#153821',
    headline: 'A softer kind of everyday.',
    headlineKh: 'ស្វែងរកភាពកក់ក្ដៅសម្រាប់រាល់ថ្ងៃ។',
    subtitle: 'Thoughtful essentials for a more comfortable space.',
    subtitleKh: 'ផលិតផលសម្រាប់ទីកន្លែងដ៏មានផាសុកភាព។',
    productsTitle: 'Featured products',
  },
  6: {
    key: 'electronics',
    name: 'Midnight Tech',
    industry: 'Electronics',
    industryKh: 'អេឡិចត្រូនិក',
    image: electronics,
    palette: {
      primary: '#2563eb',
      secondary: '#0b1728',
      background: '#ffffff',
    },
    heroBase: '#0b1728',
    heroText: '#ffffff',
    headline: 'Next-gen tech. Everyday possibilities.',
    headlineKh: 'បច្ចេកវិទ្យាថ្មីសម្រាប់រាល់ថ្ងៃ។',
    subtitle: 'Discover a smarter way to connect, create and play.',
    subtitleKh: 'ស្វែងរកវិធីថ្មីដើម្បីភ្ជាប់ បង្កើត និងកម្សាន្ត។',
    productsTitle: 'Discover the latest',
  },
  7: {
    key: 'beauty',
    name: 'Petal Beauty',
    industry: 'Beauty & Wellness',
    industryKh: 'សម្រស់ និងសុខុមាលភាព',
    image: beauty,
    palette: {
      primary: '#ad2145',
      secondary: '#fce9ef',
      background: '#ffffff',
    },
    heroBase: '#fce9ef',
    heroText: '#75142d',
    headline: 'Your everyday glow, beautifully simple.',
    headlineKh: 'សម្រស់ប្រចាំថ្ងៃយ៉ាងសាមញ្ញ។',
    subtitle: 'Make a little room for your daily self-care ritual.',
    subtitleKh: 'ផ្ដល់ពេលវេលាសម្រាប់ការថែរក្សាខ្លួនឯង។',
    productsTitle: 'The beauty edit',
  },
  8: {
    key: 'grocery',
    name: 'Fresh Market',
    industry: 'Food & Groceries',
    industryKh: 'អាហារ និងគ្រឿងទេស',
    image: grocery,
    palette: {
      primary: '#236127',
      secondary: '#eef5df',
      background: '#ffffff',
    },
    heroBase: '#eef5df',
    heroText: '#183c1c',
    headline: 'Fresh picks for everyday living.',
    headlineKh: 'ជម្រើសស្រស់ៗសម្រាប់រាល់ថ្ងៃ។',
    subtitle: 'Find your daily essentials, all in one place.',
    subtitleKh: 'ស្វែងរកផលិតផលប្រចាំថ្ងៃនៅកន្លែងតែមួយ។',
    productsTitle: 'Fresh from our store',
  },
  9: {
    key: 'fashion',
    name: 'Studio Wear',
    industry: 'Fashion & Apparel',
    industryKh: 'ម៉ូដ និងសម្លៀកបំពាក់',
    image: fashion,
    palette: {
      primary: '#ad3325',
      secondary: '#f5e9e2',
      background: '#ffffff',
    },
    heroBase: '#f5e9e2',
    heroText: '#35211d',
    headline: 'A new season. Your own style.',
    headlineKh: 'រដូវកាលថ្មី។ រចនាប័ទ្មរបស់អ្នក។',
    subtitle: 'Discover everyday pieces that feel like you.',
    subtitleKh: 'ស្វែងរកសម្លៀកបំពាក់ដែលស័ក្ដិសមនឹងអ្នក។',
    productsTitle: 'The latest collection',
  },
  10: {
    key: 'crafts',
    name: 'Khmer Atelier',
    industry: 'Handmade & Crafts',
    industryKh: 'សិប្បកម្ម និងផលិតផលធ្វើដោយដៃ',
    image: crafts,
    palette: {
      primary: '#805020',
      secondary: '#f3eade',
      background: '#ffffff',
    },
    heroBase: '#f3eade',
    heroText: '#452d1b',
    headline: 'Every piece has a story.',
    headlineKh: 'ផលិតផលនីមួយៗមានរឿងរ៉ាវ។',
    subtitle: 'Discover thoughtful crafts and everyday treasures.',
    subtitleKh: 'ស្វែងរកសិប្បកម្ម និងផលិតផលពិសេសសម្រាប់រាល់ថ្ងៃ។',
    productsTitle: 'The craft collection',
  },
};

// Layout descriptions are also used by onboarding and the merchant template picker.
const layoutDescriptions = {
  5: 'Wide banner slider, collection tiles and a balanced four-column product grid.',
  6: 'Department sidebar, technical launch banner and square product cards.',
  7: 'Image-first split hero, rounded ritual links and generous three-column product cards.',
  8: 'Aisle navigation beside a compact banner and a dense, quick-shopping catalog.',
  9: 'Oversized brand masthead, full-width campaign, horizontal product edit and staggered collections.',
  10: 'Journal-style introduction, arched portrait imagery and a numbered collection index.',
};
for (const [id, description] of Object.entries(layoutDescriptions))
  EDITORIAL_STYLES[id].layoutDescription = description;

const previews = {
  5: [preview5, mobile5],
  6: [preview6, mobile6],
  7: [preview7, mobile7],
  8: [preview8, mobile8],
  9: [preview9, mobile9],
  10: [preview10, mobile10],
};
for (const [id, [desktop, mobile]] of Object.entries(previews)) {
  EDITORIAL_STYLES[id].preview = desktop;
  EDITORIAL_STYLES[id].mobilePreview = mobile;
}

export const editorialTheme = (id) => {
  const style = EDITORIAL_STYLES[id] || EDITORIAL_STYLES[5];
  return {
    colors: {
      ...style.palette,
      accent: style.palette.primary,
      surface: '#ffffff',
      text: '#1d1d1f',
      textSecondary: '#646469',
      border: '#e7e7e5',
    },
    typography: {
      fontFamily: {
        primary: 'Inter, Noto Sans Khmer, sans-serif',
        secondary: 'Inter, Noto Sans Khmer, sans-serif',
      },
    },
  };
};
