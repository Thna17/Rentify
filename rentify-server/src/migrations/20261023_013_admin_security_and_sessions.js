const { DataTypes } = require("sequelize");

// Production-grade administrator security: MFA, privileged sessions, and audit logging.
exports.up = async ({ queryInterface }) => {
  const models = require("../models");
  const usersTable = models.User.getTableName();
  const userColumns = await queryInterface.describeTable(usersTable);

  if (!userColumns.mfaEnabled) {
    await queryInterface.addColumn(usersTable, "mfaEnabled", {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });
  }
  if (!userColumns.mfaSecret) {
    await queryInterface.addColumn(usersTable, "mfaSecret", {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  }
  if (!userColumns.mfaRecoveryCodes) {
    await queryInterface.addColumn(usersTable, "mfaRecoveryCodes", {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  }
  if (!userColumns.mfaPendingSecret) {
    await queryInterface.addColumn(usersTable, "mfaPendingSecret", {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  }
  if (!userColumns.mfaFailedAttempts) {
    await queryInterface.addColumn(usersTable, "mfaFailedAttempts", {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    });
  }
  if (!userColumns.mfaLockUntil) {
    await queryInterface.addColumn(usersTable, "mfaLockUntil", {
      type: DataTypes.DATE,
      allowNull: true,
    });
  }
  if (!userColumns.mfaLastTimeStep) {
    await queryInterface.addColumn(usersTable, "mfaLastTimeStep", {
      type: DataTypes.BIGINT,
      allowNull: true,
    });
  }
  if (!userColumns.pendingContact) {
    await queryInterface.addColumn(usersTable, "pendingContact", {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  }

  // Create UserSessions table if it does not exist
  const tables = await queryInterface.showAllTables();
  const normalizedTables = tables.map((t) => String(t).toLowerCase());

  if (!normalizedTables.includes("usersessions")) {
    await queryInterface.createTable("UserSessions", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      tokenHash: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      userAgent: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      clientType: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      lastActiveAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      revokedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      recentAuthAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      mfaVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
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
  }

  // Create AuditLogs table if it does not exist
  if (!normalizedTables.includes("auditlogs")) {
    await queryInterface.createTable("AuditLogs", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      correlationId: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      actorUserId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      actorRole: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      action: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      resource: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      resourceId: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      userAgent: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(16),
        defaultValue: "SUCCESS",
        allowNull: false,
      },
      details: {
        type: DataTypes.TEXT,
        allowNull: true,
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
  }
};
