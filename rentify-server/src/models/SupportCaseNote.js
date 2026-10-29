const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
module.exports = sequelize.define('SupportCaseNote', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  caseId: { type: DataTypes.UUID, allowNull: false },
  authorId: { type: DataTypes.UUID, allowNull: false },
  visibility: { type: DataTypes.STRING(24), allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
}, { timestamps: true, updatedAt: false, indexes: [{ fields: ['caseId', 'createdAt', 'id'] }] });
