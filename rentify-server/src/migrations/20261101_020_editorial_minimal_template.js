'use strict';

// A stable catalog record lets existing template selection APIs expose Editorial Minimal.
// Never replace an existing ID: website records may already refer to it.
const ID = 'e5a71005-836b-44a5-9a49-0a9e4b12f005';
exports.up = async ({ queryInterface }) => {
  const [rows] = await queryInterface.sequelize.query(
    'SELECT id, websiteTemplateId FROM WebsiteTemplates WHERE websiteTemplateId = 5 OR id = :id',
    { replacements: { id: ID } }
  );
  if (rows.length) {
    if (rows.length === 1 && rows[0].id === ID && Number(rows[0].websiteTemplateId) === 5) return;
    throw new Error('Template 5 is already assigned; resolve the conflict before adding Editorial Minimal');
  }
  const now = new Date();
  await queryInterface.bulkInsert('WebsiteTemplates', [{
    id: ID, websiteTemplateId: 5, name: 'Editorial Minimal', category: 'ecommerce', framework: 'vite',
    description: 'A minimal storefront with merchant branding, collections and shared checkout.',
    baseUrl: null, features: JSON.stringify(['Responsive design', 'English and Khmer', 'Product catalog', 'Hosted checkout']),
    pages: JSON.stringify([{ id: 1, page: 'Homepage', route: '/' }, { id: 2, page: 'Products', route: '/products' }]),
    colorPalette: JSON.stringify({ primary: '#163d27', secondary: '#f4f5f2', background: '#ffffff' }),
    createdAt: now, updatedAt: now,
  }]);
};
// Retain the catalog row on rollback: existing websites may reference it.
exports.down = async () => {};
