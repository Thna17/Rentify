'use strict';

// A stable catalog record lets existing template selection APIs expose Atelier.
// Never replace an existing ID: website records may already refer to it.
const ID = 'e4a71004-836b-44a5-9a49-0a9e4b12f004';
exports.up = async ({ queryInterface }) => {
  const [rows] = await queryInterface.sequelize.query(
    'SELECT id, websiteTemplateId FROM WebsiteTemplates WHERE websiteTemplateId = 4 OR id = :id',
    { replacements: { id: ID } }
  );
  if (rows.length) {
    if (rows.length === 1 && rows[0].id === ID && Number(rows[0].websiteTemplateId) === 4) return;
    throw new Error('Template 4 is already assigned; resolve the conflict before adding Atelier');
  }
  const now = new Date();
  await queryInterface.bulkInsert('WebsiteTemplates', [{
    id: ID, websiteTemplateId: 4, name: 'Atelier', category: 'ecommerce', framework: 'vite',
    description: 'An editorial storefront for modern independent brands.',
    baseUrl: null, features: JSON.stringify(['Responsive design', 'English and Khmer', 'Product catalog', 'Hosted checkout']),
    pages: JSON.stringify([{ id: 1, page: 'Homepage', route: '/' }, { id: 2, page: 'Products', route: '/products' }]),
    colorPalette: JSON.stringify({ primary: '#493e36', secondary: '#27231f', background: '#f8f5ef' }),
    createdAt: now, updatedAt: now,
  }]);
};
// Retain the catalog row on rollback: existing websites may reference it.
exports.down = async () => {};
