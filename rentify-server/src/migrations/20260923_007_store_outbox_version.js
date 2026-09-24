const { DataTypes } = require('sequelize');

exports.up = async ({ sequelize, queryInterface }) => {
  const columns = await queryInterface.describeTable('StoreSyncOutboxes');
  if (!columns.version) {
    await queryInterface.addColumn('StoreSyncOutboxes', 'version', {
      type: DataTypes.INTEGER, allowNull: true,
    });
  }
  await sequelize.query(`
    UPDATE StoreSyncOutboxes
    SET version = CAST(JSON_UNQUOTE(JSON_EXTRACT(payload, '$.version')) AS UNSIGNED)
    WHERE version IS NULL
  `);
  const [missing] = await sequelize.query('SELECT COUNT(*) AS count FROM StoreSyncOutboxes WHERE version IS NULL');
  if (Number(missing[0].count)) throw new Error('Store outbox payload without version');
  await queryInterface.changeColumn('StoreSyncOutboxes', 'version', {
    type: DataTypes.INTEGER, allowNull: false,
  });
};
