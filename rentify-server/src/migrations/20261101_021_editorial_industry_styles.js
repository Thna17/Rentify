'use strict';

const STYLES = [
  [6, 'Midnight Tech', 'Electronics', '#2563eb', '#0b1728'],
  [7, 'Petal Beauty', 'Beauty and wellness', '#ad2145', '#fce9ef'],
  [8, 'Fresh Market', 'Food and groceries', '#236127', '#eef5df'],
  [9, 'Studio Wear', 'Fashion and apparel', '#ad3325', '#f5e9e2'],
  [10, 'Khmer Atelier', 'Handmade and crafts', '#805020', '#f3eade'],
];
const stableId = (id) => `ed170000-836b-44a5-9a49-${String(id).padStart(12, '0')}`;

exports.up = async ({ queryInterface }) => {
  // All registrations commit together; conflicting IDs must be resolved explicitly.
  await queryInterface.sequelize.transaction(async (transaction) => {
    const pending = [];
    for (const [number, name, industry, primary, secondary] of STYLES) {
      const id = stableId(number);
      const [rows] = await queryInterface.sequelize.query(
        'SELECT id, websiteTemplateId FROM WebsiteTemplates WHERE websiteTemplateId = :number OR id = :id',
        { replacements: { id, number }, transaction }
      );
      if (rows.length) {
        if (rows.length === 1 && rows[0].id === id && Number(rows[0].websiteTemplateId) === number) continue;
        throw new Error(`Template ${number} is already assigned; resolve the conflict before adding ${name}`);
      }
      const now = new Date();
      pending.push({ id, websiteTemplateId: number, name, category: 'ecommerce', framework: 'vite',
        description: `${industry} storefront with coordinated brand colors, a premium banner and shared shopping flows.`,
        baseUrl: null,
        features: JSON.stringify(['Responsive design', 'English and Khmer', 'Three-color branding', 'Custom merchant images', 'Product catalog', 'Hosted checkout']),
        pages: JSON.stringify([{ id: 1, page: 'Homepage', route: '/' }, { id: 2, page: 'Products', route: '/products' }]),
        colorPalette: JSON.stringify({ primary, secondary, background: '#ffffff' }), createdAt: now, updatedAt: now });
    }
    if (pending.length) await queryInterface.bulkInsert('WebsiteTemplates', pending, { transaction });
  });
};
// Keep records referenced by existing websites; rollback the application deployment instead.
exports.down = async () => {};
