const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
module.exports = sequelize.define('SupportCaseLink', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  caseId: { type: DataTypes.UUID, allowNull: false },
  subjectType: { type: DataTypes.STRING(32), allowNull: false },
  subjectId: { type: DataTypes.STRING(128), allowNull: false },
  ownerService: { type: DataTypes.STRING(32), allowNull: false },
  relationship: { type: DataTypes.STRING(32), allowNull: false },
}, { timestamps: true, updatedAt: false, indexes: [{ unique: true, fields: ['caseId', 'subjectType', 'subjectId', 'relationship'] }] });
