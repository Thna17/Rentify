const { DataTypes: D } = require('sequelize');
exports.up = async ({ queryInterface: q }) => {
  const tables = (await q.showAllTables()).map(t => typeof t === 'string' ? t : t.tableName);
  const id = () => ({ type: D.UUID, allowNull: false, primaryKey: true });
  const timestamps = () => ({ createdAt: { type: D.DATE, allowNull: false }, updatedAt: { type: D.DATE, allowNull: false } });
  if (!tables.includes('MarketplaceCampaigns')) await q.createTable('MarketplaceCampaigns', {
    id: id(), slug: { type: D.STRING(100), allowNull: false, unique: true },
    title: { type: D.STRING(160), allowNull: false }, description: { type: D.TEXT, allowNull: false },
    bannerUrl: { type: D.STRING(1000), allowNull: false }, status: { type: D.STRING(20), allowNull: false, defaultValue: 'draft' },
    startsAt: { type: D.DATE, allowNull: false }, endsAt: { type: D.DATE, allowNull: false }, submissionEndsAt: { type: D.DATE, allowNull: false },
    minimumDiscount: { type: D.INTEGER, allowNull: false, defaultValue: 0 }, homepage: { type: D.BOOLEAN, allowNull: false, defaultValue: true },
    priority: { type: D.INTEGER, allowNull: false, defaultValue: 0 }, revision: { type: D.INTEGER, allowNull: false, defaultValue: 1 },
    createdBy: { type: D.STRING(64), allowNull: false }, ...timestamps(),
  });
  if (!tables.includes('CampaignSubmissions')) {
    await q.createTable('CampaignSubmissions', {
      id: id(), campaignId: { type: D.UUID, allowNull: false, references: { model: 'MarketplaceCampaigns', key: 'id' }, onDelete: 'RESTRICT' },
      storeId: { type: D.UUID, allowNull: false }, productId: { type: D.UUID, allowNull: false },
      status: { type: D.STRING(20), allowNull: false, defaultValue: 'pending' },
      merchantNote: { type: D.STRING(1000), allowNull: false, defaultValue: '' }, reviewNote: { type: D.STRING(1000), allowNull: false, defaultValue: '' },
      reviewedBy: { type: D.STRING(64), allowNull: true }, approvedFingerprint: { type: D.STRING(64), allowNull: true },
      revision: { type: D.INTEGER, allowNull: false, defaultValue: 1 }, ...timestamps(),
    });
    await q.addIndex('CampaignSubmissions', ['campaignId', 'productId'], { unique: true, name: 'campaign_product_unique' });
    await q.addIndex('CampaignSubmissions', ['storeId'], { name: 'campaign_submission_store' });
  }
  if (!tables.includes('CampaignAudits')) await q.createTable('CampaignAudits', {
    id: id(), campaignId: { type: D.UUID, allowNull: false }, submissionId: { type: D.UUID, allowNull: true },
    actorId: { type: D.STRING(64), allowNull: false }, action: { type: D.STRING(40), allowNull: false },
    details: { type: D.JSON, allowNull: false }, createdAt: { type: D.DATE, allowNull: false },
  });
};
exports.down = async ({ queryInterface: q }) => {
  await q.dropTable('CampaignAudits'); await q.dropTable('CampaignSubmissions'); await q.dropTable('MarketplaceCampaigns');
};
