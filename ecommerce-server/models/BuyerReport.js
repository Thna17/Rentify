'use strict';

// ecommerce-server/models/BuyerReport.js
// P5-SUP-001: Buyer report intake, evidence metadata, and authoritative Core support-case linkage.
// Preserves separation of concerns: Commerce owns report intake facts and linkage status;
// Core owns the durable SupportCase aggregate root.

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const BuyerReport = sequelize.define(
  'BuyerReport',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    reportNumber: {
      type: DataTypes.STRING(32),
      allowNull: false,
      unique: true,
      comment: 'Human-readable report identifier (e.g. RPT-20261028-A1B2C3)',
    },
    buyerId: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    subjectType: {
      type: DataTypes.STRING(32),
      allowNull: false,
      comment: 'order, return, product, merchant',
    },
    subjectId: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    storeId: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: 'damaged_item, defective, wrong_item, not_as_described, delivery_delay, courier_conduct, counterfeit_suspected, prohibited_listing, other',
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    evidence: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: 'Array of safe evidence items: { url, type, label, fileName, uploadedAt }',
    },
    eligibilitySnapshot: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: 'Server-side evaluation facts at time of intake: { withinPolicyWindow, deadline, reasonCodes }',
    },
    linkageStatus: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'pending_linkage',
      comment: 'pending_linkage, linked, linkage_failed',
    },
    coreCaseId: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: 'Authoritative SupportCase UUID in Core',
    },
    coreCaseNumber: {
      type: DataTypes.STRING(32),
      allowNull: true,
      comment: 'Human-readable Core case number (e.g. CAS-20261028-0042)',
    },
    linkageAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lastLinkageAttemptAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastLinkageError: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    idempotencyKey: {
      type: DataTypes.STRING(128),
      allowNull: true,
      unique: true,
    },
  },
  {
    tableName: 'BuyerReports',
    indexes: [
      { fields: ['buyerId', 'createdAt'] },
      { fields: ['subjectType', 'subjectId'] },
      { fields: ['orderId'] },
      { fields: ['storeId'] },
      { fields: ['linkageStatus'] },
    ],
  }
);

module.exports = BuyerReport;
