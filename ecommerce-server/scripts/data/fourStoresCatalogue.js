// ecommerce-server/scripts/data/fourStoresCatalogue.js
// Product catalogue for the four marketplace-only demo stores, built from each
// store's own product photos (hosted on Cloudinary under rentify/demo-stores).
// `legacyNames` lists earlier names of the same product row, so re-seeding
// renames that row in place and keeps its id, stock and order history.

const CLOUDINARY_BASE = 'https://res.cloudinary.com/druevh9no/image/upload/f_auto,q_auto,c_limit,w_1200/rentify/demo-stores';

/** Gallery images for a product: `keys` are the uploaded photo names, first one is the cover. */
const photos = (name, ...keys) =>
  keys.map((key, index) => ({ url: `${CLOUDINARY_BASE}/${key}.jpg`, alt: index === 0 ? name : `${name} - view ${index + 1}` }));

const product = ({ name, price, compareAtPrice = null, keys, shortDescription, legacyNames = [], ...rest }) => ({
  name,
  price,
  compareAtPrice,
  shortDescription,
  description: shortDescription,
  images: photos(name, ...keys),
  legacyNames,
  ...rest,
});

// ─── Cloth Store: streetwear tees ─────────────────────────────────────────────
const tee = (name, price, keys, shortDescription, extra = {}) =>
  product({
    name,
    price,
    keys,
    shortDescription,
    marketplaceCategory: 'Unisex Clothing',
    websiteNiche: 'fashion',
    productType: 'clothing',
    ...extra,
  });

const CLOTH_PRODUCTS = [
  tee('Knit Short-Sleeve Tee – Black', 14.99, ['cloth-00'], 'Ribbed knit tee with a relaxed fit. Dresses up or down.', { compareAtPrice: 18.99, legacyNames: ['Casual Summer Dress'], marketplaceCategory: "Men's Clothing" }),
  tee('Linen Band-Collar Shirt – White', 15.99, ['cloth-08'], 'Breathable linen-blend shirt with a band collar and half placket.', { compareAtPrice: 19.99, legacyNames: ['Classic White Button-Up Shirt'], marketplaceCategory: "Men's Clothing" }),
  tee('Essential Boxy Tee – Navy', 9.99, ['cloth-02'], 'Heavyweight cotton tee with a boxy, modern cut.', { legacyNames: ['Slim Fit Jeans'] }),
  tee('Bravery Daisy Print Tee', 12.99, ['cloth-12'], 'Soft cotton tee with a blue daisy print and hand-lettered back.', { legacyNames: ['Floral Midi Skirt'] }),
  tee('Oversized Heavyweight Tee – White', 9.99, ['cloth-03', 'cloth-10'], 'Our best-selling blank: 240gsm cotton, dropped shoulders.', { compareAtPrice: 12.99, legacyNames: ['Oversized Hoodie'] }),
  tee('Crowd Silhouette Long-Sleeve Tee', 15.99, ['cloth-21'], 'Long-sleeve cotton tee with a screen-printed crowd graphic.', { legacyNames: ['Linen Co-ord Set'] }),
  tee('Raglan Boxy Tee – Heather Grey', 10.99, ['cloth-04'], 'Raglan-sleeve tee in heather grey with a clean boxy shape.', { legacyNames: ['Athletic Shorts'] }),
  tee('Script Collar Tee – Navy', 12.99, ['cloth-29'], 'Washed navy tee with script lettering along the collar.', { legacyNames: ['Polo Shirt'] }),
  tee('Shark Script Graphic Tee', 12.99, ['cloth-01'], 'Off-white tee with a hand-drawn shark script print.'),
  tee('Varsity Print Tee – Grey', 12.99, ['cloth-05'], 'Grey marl tee with a cracked varsity-style chest print.'),
  tee('Wassup Cartoon Tee', 11.99, ['cloth-06'], 'Playful cartoon graphic on a heavyweight off-white tee.'),
  tee('Vintage Theatre Poster Tee', 13.99, ['cloth-07'], 'Vintage theatre-poster graphic with a worn-in look.'),
  tee('Bold Type Graphic Tee', 12.99, ['cloth-09'], 'Oversized typography print on a cream cotton tee.'),
  tee('Abs Sketch Tee – Charcoal', 12.99, ['cloth-11'], 'Charcoal tee with a tongue-in-cheek abs line drawing.'),
  tee('Sleepy Cat Washed Tee', 14.99, ['cloth-13'], 'Acid-washed black tee with a photo cat print.', { compareAtPrice: 17.99 }),
  tee('Frog Headphones Mini Tee', 10.99, ['cloth-14'], 'Minimal tee with a small frog-in-headphones chest print.'),
  tee('Script Logo Tee – Cream', 12.99, ['cloth-15'], 'Cream tee with a sweeping black script logo.'),
  tee('Silhouette Duo Graphic Tee', 12.99, ['cloth-16'], 'Two-figure silhouette print on a heavyweight cream tee.'),
  tee('Eye Collage Graphic Tee', 13.99, ['cloth-17'], 'Grey tee with an eye-and-text collage print.'),
  tee('Blue Flower Embroidered Tee', 11.99, ['cloth-18'], 'Scattered blue flower embroidery on a clean white tee.'),
  tee('Spider Line Graphic Tee', 12.99, ['cloth-19'], 'Red spider line-art print on an off-white tee.'),
  tee('Starfish Doodle Tee', 11.99, ['cloth-20'], 'Hand-drawn starfish doodle with a blue wave line.'),
  tee('Red Star Portrait Tee – Black', 13.99, ['cloth-22'], 'Black tee with a grainy portrait and red star print.'),
  tee('Ribcage Print Tee – Navy', 13.99, ['cloth-23'], 'Navy tee with an all-over ribcage and heart print.'),
  tee('Whale Species Tee', 12.99, ['cloth-24'], 'Illustrated whale species chart on a white tee.'),
  tee('Zipper Puppy Tee', 11.99, ['cloth-25'], 'A puppy peeking out of a printed zipper — a crowd favourite.'),
  tee('End Question Typography Tee', 12.99, ['cloth-26'], 'Wrap-around typography print on a cream tee.'),
  tee('Angel Sketch Tee – Navy', 14.99, ['cloth-27'], 'Washed navy tee with a fine-line angel sketch.'),
  tee('Reaper Print Tee – Black', 14.99, ['cloth-28'], 'Black tee with a detailed reaper and red ink print.'),
  tee('Orb Drip Print Tee – Black', 14.99, ['cloth-30'], 'Black tee with a dripping orb graphic.'),
];

// ─── Phone Store: iPhones ─────────────────────────────────────────────────────
const phone = (name, price, compareAtPrice, keys, shortDescription, legacyNames = []) =>
  product({
    name,
    price,
    compareAtPrice,
    keys,
    shortDescription,
    legacyNames,
    marketplaceCategory: 'Phones & Devices',
    websiteNiche: 'electronics',
    productType: 'device',
  });

const PHONE_PRODUCTS = [
  phone('iPhone 11', 329, 379, ['phone-28', 'phone-22', 'phone-24', 'phone-25', 'phone-27', 'phone-21', 'phone-26', 'phone-23'], '6.1-inch Liquid Retina display, dual camera and all-day battery. Six colours.'),
  phone('iPhone 12', 429, 479, ['phone-15', 'phone-12', 'phone-13', 'phone-14', 'phone-16', 'phone-10', 'phone-11'], '6.1-inch Super Retina XDR display, A14 Bionic and 5G. Six colours.'),
  phone('iPhone 12 Pro Max', 499, 559, ['phone-00'], '6.7-inch display, LiDAR scanner and a triple camera in graphite.'),
  phone('iPhone 13', 379, 429, ['phone-05'], 'A15 Bionic, cinematic mode and a brighter display. Blue.'),
  phone('iPhone 14', 549, 599, ['phone-20', 'phone-17', 'phone-18', 'phone-19'], 'Crash detection, great low-light photos and all-day battery.'),
  phone('iPhone 14 Pro Max', 699, 779, ['phone-06'], 'Dynamic Island, 48MP main camera and Always-On display.'),
  phone('iPhone 15', 649, 699, ['phone-01'], 'Dynamic Island, 48MP camera and USB-C. Green.'),
  phone('iPhone 15 Pro Max', 799, 899, ['phone-02'], 'Titanium design, 5x telephoto and the A17 Pro chip.'),
  phone('iPhone 16', 899, 949, ['phone-29', 'phone-07', 'phone-30', 'phone-31', 'phone-32', 'phone-33'], 'Camera Control, A18 chip and vibrant new colours.'),
  phone('iPhone 16e', 599, 649, ['phone-04'], 'The essentials of iPhone 16 with the A18 chip, in white.'),
  phone('iPhone 17 Air', 1099, 1199, ['phone-03'], 'The thinnest iPhone yet, in sky blue.'),
];

// ─── School Supply Store ──────────────────────────────────────────────────────
const supply = (name, price, keys, shortDescription, marketplaceCategory, extra = {}) =>
  product({
    name,
    price,
    keys,
    shortDescription,
    marketplaceCategory,
    websiteNiche: 'ecommerce',
    productType: 'physical',
    ...extra,
  });

const SCHOOL_PRODUCTS = [
  supply('Pilot FriXion Erasable Gel Pen Set (10-Pack)', 12.99, ['school-08'], 'Erasable, refillable clicker gel pens in ten colours.', 'Stationery', { compareAtPrice: 15.99 }),
  supply('Uni-Ball Jetstream Lite Touch Pen', 3.5, ['school-24'], 'Smooth, quick-drying ink in soft pastel barrels.', 'Stationery'),
  supply('A4 Grid Paper Pack', 5.99, ['school-09'], '5mm grid paper for maths, sketches and planning.', 'Paper & Notebooks'),
  supply('Colour A4 Origami Paper (100 Sheets)', 4.99, ['school-01'], 'Bright coloured A4 sheets for crafts and projects.', 'Paper & Notebooks', { legacyNames: ['A4 Grid Paper Pack (250 sheets)'] }),
  supply('Faber-Castell Graphite Pencil Set', 9.99, ['school-07'], 'Artist-grade graphite pencils from 5H to 8B in a tin.', 'Art Supplies', { compareAtPrice: 12.5 }),
  supply('Professional Sketch Pencil Set', 7.99, ['school-17'], 'Graded sketching pencils for shading and fine detail.', 'Art Supplies'),
  supply('Japanese Stationery Pen (Blue)', 4.5, ['school-23'], 'Wave-print retractable gel pen with fine 0.5mm ink.', 'Stationery'),
  supply('Mildliner Double-Ended Highlighters (10-Pack)', 11.99, ['school-05', 'school-12'], 'Soft pastel highlighters with chisel and bullet tips.', 'Stationery', { legacyNames: ['Multi-Pen 4-in-1 (Black, Blue, Red, Pencil)'] }),
  supply('Sharpie Chisel Highlighters (12-Pack)', 8.99, ['school-14'], 'Smear-safe highlighters in twelve bright colours.', 'Stationery', { legacyNames: ['Deco Mini Sticker Tape Set'] }),
  supply('Sharpie Gel Highlighters (5-Pack)', 6.99, ['school-13'], "Gel highlighters that glide on and won't bleed through.", 'Stationery', { legacyNames: ['Notebook Spiral Hardcover A5'] }),
  supply('Kawaii Mini Highlighters (6-Pack)', 3.99, ['school-10'], 'Cute pastel mini highlighters in a clear pouch.', 'Stationery', { legacyNames: ['Spiral Hardcover Notebook A5'] }),
  supply('Nykkola Gel Ink Pens (12-Pack)', 7.49, ['school-03'], 'Twelve fine-tip gel pens for notes and journaling.', 'Stationery'),
  supply('Quick-Dry Gel Pens 0.5mm (Black, Red, Blue)', 5.99, ['school-04'], 'Three boxes of quick-dry gel pens for daily writing.', 'Stationery'),
  supply('Pastel Minimalist Gel Pens (6-Pack)', 6.49, ['school-06'], 'Matte pastel barrels with smooth black ink.', 'Stationery'),
  supply('Stabilo Exam Grade Pencils (Box of 10)', 4.99, ['school-15'], 'Reliable 2B pencils made for exams.', 'Stationery'),
  supply('Stabilo Easy HB Pencils (10-Pack)', 3.99, ['school-26'], 'Colourful HB pencils with an easy grip.', 'Stationery'),
  supply('Pentonic Precision Mechanical Pencil 0.7mm', 2.99, ['school-16'], 'Mechanical pencil with a built-in eraser.', 'Stationery'),
  supply('Essentials Canvas Backpack – Cream', 24.99, ['school-00'], 'Minimal cream canvas backpack with a front pocket.', 'Bags & Luggage', { compareAtPrice: 29.99 }),
  supply('Everyday Laptop Backpack – Black', 22.99, ['school-02'], 'Padded laptop sleeve and bottle pocket for daily carry.', 'Bags & Luggage'),
  supply('Travel Backpack with Leather Straps', 27.99, ['school-19'], 'Cream and black travel backpack with leather-look straps.', 'Bags & Luggage'),
  supply('Charm School Backpack – Black', 19.99, ['school-18'], 'Roomy school backpack with a clear pocket and charms.', 'Bags & Luggage'),
  supply('Headphone Print Kids Backpack', 18.99, ['school-11'], 'Blue graphic backpack for kids, with padded straps.', 'Bags & Luggage'),
  supply('Camo Kids Backpack', 17.99, ['school-20'], 'Durable camo backpack sized for primary school.', 'Bags & Luggage'),
  supply('Galaxy Organiser Backpack', 21.99, ['school-21'], 'Galaxy-print backpack with organiser pockets inside.', 'Bags & Luggage'),
  supply('Classic Navy Student Backpack', 19.99, ['school-22'], 'Classic navy backpack with a large front pocket.', 'Bags & Luggage'),
  supply('Circuit Print Backpack – Black', 20.99, ['school-27'], 'Black backpack with a white circuit-board print.', 'Bags & Luggage'),
];

// ─── Skincare Store ───────────────────────────────────────────────────────────
const care = (name, price, keys, shortDescription, marketplaceCategory, productType, extra = {}) =>
  product({
    name,
    price,
    keys,
    shortDescription,
    marketplaceCategory,
    websiteNiche: 'skincare',
    productType,
    ...extra,
  });
const face = (name, price, keys, text, extra) => care(name, price, keys, text, 'Face Care', 'cleanser', extra);
const sun = (name, price, keys, text, extra) => care(name, price, keys, text, 'Sun Care', 'sunscreen', extra);
const body = (name, price, keys, text, extra) => care(name, price, keys, text, 'Body Care', 'cleanser', extra);
const hair = (name, price, keys, text, extra) => care(name, price, keys, text, 'Hair Care', 'cleanser', extra);

const SKINCARE_PRODUCTS = [
  // Body care
  body('Lux Botanicals Magical Orchid Body Wash', 6.99, ['skincare-01'], 'Black orchid and juniper oil body wash with a long-lasting scent.'),
  body('Lux Botanicals Soft Rose Body Wash 250ml', 5.5, ['skincare-02'], 'French rose and almond oil body wash for soft skin.'),
  body('Plum Body Lovin’ Body Wash Duo', 12.99, ['skincare-03'], 'Vanilla vibes and caramel body washes in a gift-ready duo.', { compareAtPrice: 15.99 }),
  body('Aveeno Daily Moisturising Body Wash 500ml', 11.99, ['skincare-46'], 'Oat-enriched body wash for normal to dry skin.'),
  body('Gulab & Glycolic Acid Body Wash', 9.99, ['skincare-47'], 'Rose and glycolic acid body wash for smoother skin.'),
  body('The Body Shop Lotus Shower Gel 250ml', 8.99, ['skincare-53'], 'Floral lotus shower gel, vegan formula.'),
  body('Whipped Shea Butter Body Wash', 10.99, ['skincare-43'], 'Whipped shea body wash for 72-hour moisture.', { legacyNames: ['Shea Butter Nourishing Shampoo'] }),
  // Face care
  face('Cetaphil Daily Facial Cleanser 16oz', 11.99, ['skincare-31'], 'Gentle daily cleanser for normal to oily skin.'),
  face('Activated Charcoal Face Wash', 8.99, ['skincare-33'], 'Charcoal face wash that draws out dirt and excess oil.'),
  face('Charcoal & Niacinamide Face Wash', 7.99, ['skincare-32'], 'Deep-cleansing charcoal wash with niacinamide.'),
  face('Rose Face Wash Gentle Foam', 7.5, ['skincare-24', 'skincare-40'], 'Sulphate-free rose water face wash for daily use.'),
  face('Garnier Vitamin C Face Wash', 5.99, ['skincare-13'], 'Brightening face wash with vitamin C and lemon.'),
  face('Revival Ultra Lightening Face Wash', 6.99, ['skincare-23'], 'Gentle foaming face wash for an even, bright tone.'),
  face('Aqualogica Radiance Face Wash', 7.49, ['skincare-26'], 'Watermelon and hyaluronic face wash for dewy skin.'),
  face('Dot & Key Strawberry Face Wash', 7.99, ['skincare-27'], 'Strawberry and niacinamide gel face wash.'),
  face('Ghar Magic Face Wash', 8.49, ['skincare-28'], 'Saffron and lactic acid face wash that helps reduce tan.'),
  face('Vincé Acne & Oil Clear Face Wash', 6.49, ['skincare-29'], 'Sulphate-free face wash for acne-prone and oily skin.'),
  face('Simple Refreshing Facial Wash 150ml', 5.99, ['skincare-30'], 'Soap-free facial wash with pro-vitamin B5.'),
  face('Natio Clear Oil Control Foam Cleanser', 9.49, ['skincare-34'], 'Airy foam cleanser that controls shine.'),
  face('Dola Foaming Facial Cleanser', 8.99, ['skincare-35'], 'Gentle pump foam cleanser for sensitive skin.'),
  face('Mamaearth Vitamin C Daily Glow Face Wash', 6.49, ['skincare-36'], 'Vitamin C and turmeric face wash for daily glow.'),
  face('Foxtale Super Glow Face Wash', 7.49, ['skincare-37'], 'Papaya and vitamin C face wash that boosts glow.'),
  face('Vibrant Beauty Lemon Purifying Face Wash', 6.99, ['skincare-38'], 'Lemon face wash that purifies and refreshes.'),
  face('Nat Habit Ubtan Face Wash', 7.99, ['skincare-41'], 'Fresh ubtan face wash for brightening and de-tan.'),
  // Sun care
  sun('Plum Hybrid SPF 50 Sunscreen', 12.99, ['skincare-08'], 'Lightweight SPF 50 PA++++ sunscreen formulated for daily wear.', { legacyNames: ['SPF 80 Mineral Sunscreen 80g'] }),
  sun('Vitamin C Brightening Sunscreen', 14.99, ['skincare-12'], 'SPF 50 sunscreen with vitamin C and new-age UV filters.', { compareAtPrice: 17.99 }),
  sun('Peach Glow Sunscreen SPF 50', 10.99, ['skincare-09'], 'Hybrid, non-greasy SPF 50 PA++++ sunscreen.'),
  sun('Invisible Instant Glow Sunscreen', 11.5, ['skincare-25'], 'Invisible SPF 50 PA+++ sunscreen with an instant glow.'),
  sun('Sun Downer SPF 50+ Sunscreen Gel', 9.99, ['skincare-04'], 'Clear SPF 50+ gel sunscreen for oily skin.'),
  sun('Sun Guard SPF 50+ Beach Sunscreen', 13.99, ['skincare-05'], 'Water-resistant SPF 50+ PA++++ for beach days.'),
  sun('Daily SPF Lotion Collection', 24.99, ['skincare-06'], 'A trio of everyday SPF lotions for face and body.', { compareAtPrice: 29.99 }),
  sun('Tinted Fluid Sunscreen SPF 50', 12.49, ['skincare-07'], 'Tinted SPF 50 fluid for an even, protected look.'),
  sun('Cellcense SPF 50 Sun Screen', 10.49, ['skincare-10'], 'Broad-spectrum SPF 50 sunscreen, oil-free.'),
  sun('Sunslay SPF 50 Sunscreen', 11.99, ['skincare-11'], 'Lightweight SPF 50 that blends in with no white cast.'),
  sun('Natural Sun Screen Lotion SPF 15', 7.99, ['skincare-15'], 'Everyday natural sunscreen lotion, SPF 15.'),
  sun('Sun Screen Face Cream SPF 50', 9.49, ['skincare-16'], 'High-protection face cream with photo-age defence.'),
  sun('Sun & Fun Sunscreen Lotion', 8.99, ['skincare-17'], 'Family sunscreen lotion for outdoor fun.'),
  sun('Purely Yours Sun Screen SPF 50', 8.49, ['skincare-18'], 'Matte-finish SPF 50 sunscreen, 100g.'),
  sun('Yuthika Sunscreen Cream SPF 50', 9.99, ['skincare-19'], 'SPF 50 PA++++ cream for daily outdoor protection.'),
  sun('Laikou Japan Sakura Sunscreen SPF 50', 6.99, ['skincare-20'], 'Sakura whitening sunscreen, SPF 50 PA++.'),
  sun('Odylique Natural Sun Screen SPF 30', 16.99, ['skincare-21'], 'Organic, vegan and cruelty-free mineral sunscreen.'),
  sun('Beach Day Sunscreen Set', 19.99, ['skincare-22'], 'Three sunscreens for face and body on sunny days.'),
  // Hair care
  hair('Passion Flower Moisturizing Shampoo 400ml', 9.99, ['skincare-42'], 'Sulphate-free shampoo for full, thick hair.'),
  hair('Amla & Shikakai Herbal Shampoo 400ml', 8.5, ['skincare-45'], 'Amla and shikakai herbal shampoo for strong hair.'),
  hair('Nat Habit Navona Shampoo', 9.49, ['skincare-44'], 'Fresh navona shampoo for 5x softness.'),
  hair('Yellow Smoothing Shampoo 1L', 13.99, ['skincare-48'], 'Salon-size smoothing shampoo for frizz control.'),
  hair('Nisha Smooth & Silky Shampoo', 6.99, ['skincare-49'], 'Almond and olive shampoo for silky hair.'),
  hair('Vibrant Beauty Anti-Frizz Shampoo', 9.99, ['skincare-50'], 'Silk protein and keratin shampoo that tames frizz.'),
  hair('Juicy Chemistry Anti-Dandruff Shampoo', 11.49, ['skincare-51'], 'Organic rosemary and tea tree shampoo.'),
  hair('Kumarika Herbal Shampoo Collection', 14.99, ['skincare-52'], 'Four herbal shampoos for every hair need.', { compareAtPrice: 17.99 }),
];

module.exports = { CLOTH_PRODUCTS, PHONE_PRODUCTS, SCHOOL_PRODUCTS, SKINCARE_PRODUCTS };
