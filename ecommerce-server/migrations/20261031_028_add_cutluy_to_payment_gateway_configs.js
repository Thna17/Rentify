'use strict';

const { DataTypes } = require('sequelize');

exports.up = async (contextOrQueryInterface, maybeSequelize) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;
  const sequelize = contextOrQueryInterface.sequelize || maybeSequelize || queryInterface.sequelize;

  try {
    await sequelize.query(`
      ALTER TABLE PaymentGatewayConfigs MODIFY COLUMN gateway ENUM('khqr','aba','stripe','cutluy') NOT NULL
    `);
  } catch (_err) {
    await queryInterface.changeColumn('PaymentGatewayConfigs', 'gateway', {
      type: DataTypes.ENUM('khqr', 'aba', 'stripe', 'cutluy'),
      allowNull: false,
    }).catch(() => {});
  }
};

exports.down = async (contextOrQueryInterface, maybeSequelize) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;
  const sequelize = contextOrQueryInterface.sequelize || maybeSequelize || queryInterface.sequelize;

  try {
    await sequelize.query(`
      ALTER TABLE PaymentGatewayConfigs MODIFY COLUMN gateway ENUM('khqr','aba','stripe') NOT NULL
    `);
  } catch (_err) {
    await queryInterface.changeColumn('PaymentGatewayConfigs', 'gateway', {
      type: DataTypes.ENUM('khqr', 'aba', 'stripe'),
      allowNull: false,
    }).catch(() => {});
  }
};
