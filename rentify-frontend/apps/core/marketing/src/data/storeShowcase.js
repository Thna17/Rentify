import thriftYellowPolo from '../assets/stores/thrift-yellow-polo.jpg';
import thriftRugbyShirt from '../assets/stores/thrift-rugby-shirt.jpg';
import thriftSwimShorts from '../assets/stores/thrift-swim-shorts.jpg';
import thriftStripedPolo from '../assets/stores/thrift-striped-polo.jpg';
import snackMomo from '../assets/stores/snack-momo.jpg';
import snackSpicyCrab from '../assets/stores/snack-spicy-crab.jpg';
import snackCornHat from '../assets/stores/snack-corn-hat.jpg';
import snackKissWafer from '../assets/stores/snack-kiss-wafer.jpg';
import munchieLogo from '../assets/stores/munchie-logo.png';

// Real seeded marketplace stores (ecommerce-server/seed-images), shown on the
// Solutions switcher instead of illustrated placeholders.
export const STORE_SHOWCASE = {
  fashion: {
    storeName: 'Second Life Thrift',
    links: ['New in', 'Shirts', 'Shorts'],
    aspect: 'aspect-[4/5]',
    items: [
      { name: 'Yellow Polo Shirt', price: '$13.90', was: '$17.38', image: thriftYellowPolo },
      { name: 'Striped Rugby Shirt', price: '$13.87', image: thriftRugbyShirt },
      { name: 'Printed Swim Shorts', price: '$4.21', was: '$5.26', image: thriftSwimShorts },
      { name: 'Striped Polo', price: '$13.84', image: thriftStripedPolo },
    ],
  },
  snack: {
    storeName: 'Munchie Snack House',
    logo: munchieLogo,
    links: ['Chips', 'Wafers', 'Best sellers'],
    aspect: 'aspect-square',
    items: [
      { name: 'LyLy MOMO Corn Puffs', price: '$1.00', was: '$1.25', image: snackMomo },
      { name: 'LyLy Spicy Crab Chips', price: '$1.25', was: '$1.60', image: snackSpicyCrab },
      { name: 'LyLy Corn Hat Snack', price: '$1.50', was: '$1.90', image: snackCornHat },
      { name: 'LyLy Kiss Wafer Box', price: '$1.25', was: '$1.50', image: snackKissWafer },
    ],
  },
};

STORE_SHOWCASE.cafe = STORE_SHOWCASE.snack;
