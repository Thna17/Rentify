import snackMomo from '../../assets/stores/snack-momo.jpg';
import snackSpicyCrab from '../../assets/stores/snack-spicy-crab.jpg';
import snackCornHat from '../../assets/stores/snack-corn-hat.jpg';
import snackKissWafer from '../../assets/stores/snack-kiss-wafer.jpg';
import thriftYellowPolo from '../../assets/stores/thrift-yellow-polo.jpg';
import thriftRugbyShirt from '../../assets/stores/thrift-rugby-shirt.jpg';
import thriftSwimShorts from '../../assets/stores/thrift-swim-shorts.jpg';
import thriftStripedPolo from '../../assets/stores/thrift-striped-polo.jpg';
import munchieLogo from '../../assets/stores/munchie-logo.png';

// Real seeded marketplace stores. The film follows one product, the Kiss Wafer
// Box, as it sells on the marketplace, the storefront and the POS.
export const MUNCHIE = { name: 'Munchie Snack House', logo: munchieLogo, deliveryFee: 1.5 };
export const THRIFT = { name: 'Second Life Thrift', deliveryFee: 2 };

export const HERO = {
  id: 'wafer',
  name: 'LyLy Kiss Wafer Box',
  price: 1.25,
  image: snackKissWafer,
  store: MUNCHIE.name,
};

export const SNACKS = [
  HERO,
  { id: 'momo', name: 'LyLy MOMO Corn Puffs', price: 1, image: snackMomo, store: MUNCHIE.name },
  { id: 'crab', name: 'LyLy Spicy Crab Chips', price: 1.25, image: snackSpicyCrab, store: MUNCHIE.name },
  { id: 'corn', name: 'LyLy Corn Hat Snack', price: 1.5, image: snackCornHat, store: MUNCHIE.name },
];

export const THRIFT_ITEMS = [
  { id: 'yellow', name: 'Yellow Polo Shirt', price: 13.9, image: thriftYellowPolo, store: THRIFT.name },
  { id: 'rugby', name: 'Striped Rugby Shirt', price: 13.87, image: thriftRugbyShirt, store: THRIFT.name },
  { id: 'swim', name: 'Printed Swim Shorts', price: 4.21, image: thriftSwimShorts, store: THRIFT.name },
  { id: 'striped', name: 'Striped Polo', price: 13.84, image: thriftStripedPolo, store: THRIFT.name },
];

// Marketplace feed mixes stores; the hero card sits in the second row
export const MARKET_FEED = [
  THRIFT_ITEMS[0],
  SNACKS[1],
  THRIFT_ITEMS[2],
  THRIFT_ITEMS[1],
  HERO,
  SNACKS[2],
  SNACKS[3],
  THRIFT_ITEMS[3],
  SNACKS[1],
];

export const money = (value) => `$${value.toFixed(2)}`;

// Each scene is a list of step durations (ms). Scenes render from their step index.
export const SCENES = [
  { id: 'intro', channel: null, steps: [1400, 1600, 2400] },
  { id: 'marketplace', channel: 'marketplace', steps: [1500, 2200, 900, 1800, 800, 2200, 900, 2800] },
  { id: 'storefront', channel: 'storefront', steps: [1600, 2000, 900, 2000, 900, 2800] },
  { id: 'pos', channel: 'pos', steps: [1300, 1000, 1000, 900, 1400, 1100, 900, 2800] },
  { id: 'inventory', channel: 'inventory', steps: [1200, 2400, 4200] },
];

export const SCENE_LENGTHS = SCENES.map((scene) => scene.steps.reduce((sum, ms) => sum + ms, 0));
export const TOTAL_LENGTH = SCENE_LENGTHS.reduce((sum, ms) => sum + ms, 0);

// Works out which scene and step are on screen at a point in the loop
export const locate = (elapsed) => {
  let rest = elapsed % TOTAL_LENGTH;
  for (let scene = 0; scene < SCENES.length; scene += 1) {
    if (rest < SCENE_LENGTHS[scene]) {
      const steps = SCENES[scene].steps;
      for (let step = 0; step < steps.length; step += 1) {
        if (rest < steps[step]) return { scene, step };
        rest -= steps[step];
      }
    }
    rest -= SCENE_LENGTHS[scene];
  }
  return { scene: 0, step: 0 };
};

export const START_STOCK = 6;

// One stock count shared by every channel: each completed sale takes one
export const stockAt = (scene, step) => {
  const id = SCENES[scene].id;
  if (id === 'marketplace') return step >= 7 ? 5 : 6;
  if (id === 'storefront') return step >= 5 ? 4 : 5;
  if (id === 'pos') return step >= 7 ? 3 : 4;
  if (id === 'inventory') return 3;
  return START_STOCK;
};
