// ecommerce-server/migrations/20261028_026_buyer_reports_and_case_linkage.js
// Migration 026: P5-SUP-001 Buyer Report Intake and Authoritative Core Support-Case Linkage.
// Creates BuyerReports table for storing intake facts, evidence, and Core linkage state.

const { DataTypes } = require('sequelize');

exports.up = async (contextOrQueryInterface, maybeSequelize) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;

  const tableExists = await queryInterface.tableExists('BuyerReports');
  if (!tableExists) {
    await queryInterface.createTable('BuyerReports', {
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
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      storeId: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      productId: {
        type: DataTypes.STRING(64),
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
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('BuyerReports', ['buyerId', 'createdAt'], {
      name: 'idx_buyer_reports_buyer_created',
    });
    await queryInterface.addIndex('BuyerReports', ['subjectType', 'subjectId'], {
      name: 'idx_buyer_reports_subject',
    });
    await queryInterface.addIndex('BuyerReports', ['orderId'], {
      name: 'idx_buyer_reports_order_id',
    });
    await queryInterface.addIndex('BuyerReports', ['storeId'], {
      name: 'idx_buyer_reports_store_id',
    });
    await queryInterface.addIndex('BuyerReports', ['linkageStatus'], {
      name: 'idx_buyer_reports_linkage_status',
    });
  }
};

exports.down = async (contextOrQueryInterface) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;
  const tableExists = await queryInterface.tableExists('BuyerReports');
  if (tableExists) {
    await queryInterface.dropTable('BuyerReports');
  }
};
