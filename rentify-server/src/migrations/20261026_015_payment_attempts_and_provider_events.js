'use strict';

// rentify-server/src/migrations/20261026_015_payment_attempts_and_provider_events.js
// Migration 015: P3-PAY-002 Provider-neutral CutLuy payment foundation.
// Creates PaymentAttempts and ProviderEvents tables.

const { DataTypes } = require('sequelize');

exports.up = async (contextOrQueryInterface, maybeSequelize) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;
  const existingTables = (await queryInterface.showAllTables()).map((t) => String(t).toLowerCase());

  // 1. Create PaymentAttempts table
  if (!existingTables.includes('paymentattempts')) {
    await queryInterface.createTable('PaymentAttempts', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      businessType: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: 'subscription',
      },
      businessReference: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      accountType: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: 'subscription',
      },
      accountRef: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      provider: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: 'cutluy',
      },
      providerPaymentId: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: 'pending',
      },
      providerStatus: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      idempotencyKey: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true,
      },
      checkoutUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      rawResponse: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      paidAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      failedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      failureReason: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('PaymentAttempts', ['businessReference'], {
      name: 'idx_payment_attempts_business_ref',
    });
    await queryInterface.addIndex('PaymentAttempts', ['providerPaymentId'], {
      name: 'idx_payment_attempts_provider_payment_id',
    });
    await queryInterface.addIndex('PaymentAttempts', ['status', 'createdAt'], {
      name: 'idx_payment_attempts_status_created',
    });
    await queryInterface.addIndex('PaymentAttempts', ['accountType', 'accountRef'], {
      name: 'idx_payment_attempts_account_scope',
    });
  }

  // 2. Create ProviderEvents table
  if (!existingTables.includes('providerevents')) {
    await queryInterface.createTable('ProviderEvents', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      provider: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: 'cutluy',
      },
      providerEventId: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      eventType: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      paymentAttemptId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      providerPaymentId: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      accountRef: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: true,
        defaultValue: 'USD',
      },
      payload: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      signature: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      processed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      processedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      processingError: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      replayCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      replayedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      replayedBy: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('ProviderEvents', ['provider', 'providerEventId'], {
      unique: true,
      name: 'idx_provider_events_provider_event_id',
    });
    await queryInterface.addIndex('ProviderEvents', ['paymentAttemptId'], {
      name: 'idx_provider_events_payment_attempt_id',
    });
    await queryInterface.addIndex('ProviderEvents', ['processed', 'createdAt'], {
      name: 'idx_provider_events_processed_created',
    });
  }
};

exports.down = async (contextOrQueryInterface) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;
  const existingTables = (await queryInterface.showAllTables()).map((t) => String(t).toLowerCase());

  if (existingTables.includes('providerevents')) {
    await queryInterface.dropTable('ProviderEvents');
  }
  if (existingTables.includes('paymentattempts')) {
    await queryInterface.dropTable('PaymentAttempts');
  }
};
