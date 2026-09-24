import { Store } from '../catalog/catalog.models';

/** Replace with `GET /api/sellers` when the endpoint exists. */
export const STORES: Store[] = [
  {
    id: 's006',
    name: 'Sovann Style Studio',
    location: 'Phnom Penh',
    rating: 4.9,
    reviewCount: 184,
    categoryName: 'Contemporary Khmer Fashion',
    description:
      'Modern Cambodian clothing shaped by silk, krama weaving and clean everyday tailoring. Designed in Phnom Penh and made in small workshop runs.',
  },
  {
    id: 's007',
    name: 'Mekong Fresh Market',
    location: 'Kandal',
    rating: 4.8,
    reviewCount: 267,
    categoryName: 'Fresh Cambodian Fruit',
    description:
      'Seasonal tropical fruit sourced each morning from family farms around the Mekong and packed for same-day freshness.',
  },
  {
    id: 's001',
    name: 'Srey Khmer Handmade Store',
    location: 'Siem Reap',
    rating: 4.8,
    reviewCount: 312,
    categoryName: 'Weaving & Crafts',
    description:
      'A family workshop weaving silk krama and cotton scarves on wooden looms, using patterns passed down four generations.',
  },
  {
    id: 's002',
    name: 'Kampong Speu Palm Sugar',
    location: 'Kampong Speu',
    rating: 4.9,
    reviewCount: 208,
    categoryName: 'Palm Sugar & Local Food',
    description:
      'Sugar palm cooperative producing GI-certified palm sugar, harvested at dawn and boiled the same morning.',
  },
  {
    id: 's003',
    name: 'Battambang Rice Farm',
    location: 'Battambang',
    rating: 4.7,
    reviewCount: 176,
    categoryName: 'Rice Products',
    description:
      'Smallholder collective growing jasmine and organic red rice on the Sangke river plain.',
  },
  {
    id: 's004',
    name: 'Phnom Penh Pottery House',
    location: 'Phnom Penh',
    rating: 4.6,
    reviewCount: 143,
    categoryName: 'Pottery',
    description:
      'Studio pottery in glazes drawn from Angkorian ceramics, thrown and fired in Tuol Kork.',
  },
  {
    id: 's005',
    name: 'Takeo Bamboo Craft',
    location: 'Takeo',
    rating: 4.7,
    reviewCount: 98,
    categoryName: 'Bamboo Products',
    description:
      'Bamboo baskets, trays and steamers woven by artisans in Takeo province from locally cut culms.',
  },
];

export const findStore = (id: string): Store | undefined =>
  STORES.find((store) => store.id === id);
