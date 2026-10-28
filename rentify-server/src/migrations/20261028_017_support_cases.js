'use strict';
const { DataTypes: T } = require('sequelize');
const id = () => ({ type: T.UUID, primaryKey: true, defaultValue: T.UUIDV4 });
const uuid = (allowNull = false) => ({ type: T.UUID, allowNull });
const str = (n, allowNull = false) => ({ type: T.STRING(n), allowNull });
const date = (allowNull = true) => ({ type: T.DATE, allowNull });
const timestamps = (updated = true) => ({ createdAt: date(false), ...(updated ? { updatedAt: date(false) } : {}) });
const caseId = () => ({ ...uuid(), references: { model: 'SupportCases', key: 'id' }, onDelete: 'RESTRICT' });
const definitions = [
  ['SupportCases', {
    id: id(), caseNumber: { ...str(32), unique: true }, caseType: str(64), priority: str(24),
    status: { ...str(32), defaultValue: 'open' }, queueKey: str(64, true), requesterSubjectId: str(128, true),
    requesterKind: str(32), storeId: uuid(true), assigneeSubjectId: uuid(true), sourceSystem: str(32, true),
    sourceType: str(64, true), sourceId: str(128, true), activeSourceKey: { ...str(64, true), unique: true },
    summary: str(500), descriptionClassification: str(64, true),
    language: str(16, true), policyVersion: str(64, true), openedAt: date(false), triagedAt: date(),
    serviceDeadlineAt: date(), deadlinePausedAt: date(), deadlinePauseReason: str(128, true), escalatedAt: date(),
    resolvedAt: date(), closedAt: date(), resolutionCode: str(64, true), resolutionSummary: str(1000, true),
    version: { type: T.INTEGER, allowNull: false, defaultValue: 1 }, ...timestamps(),
  }, [{ fields: ['storeId', 'createdAt', 'id'] }, { fields: ['status', 'queueKey'] }]],
  ['SupportCaseLinks', { id: id(), caseId: caseId(), subjectType: str(32), subjectId: str(128),
    ownerService: str(32), relationship: str(32), ...timestamps(false) },
  [{ fields: ['caseId', 'subjectType', 'subjectId', 'relationship'], unique: true }]],
  ['SupportCaseNotes', { id: id(), caseId: caseId(), authorId: uuid(), visibility: str(24),
    body: { type: T.TEXT, allowNull: false }, ...timestamps(false) }, [{ fields: ['caseId', 'createdAt', 'id'] }]],
  ['SupportCaseAttachments', { id: id(), caseId: caseId(), uploaderId: uuid(), mediaAssetId: uuid(), visibility: str(24),
    mediaType: str(100), sizeBytes: { type: T.INTEGER, allowNull: false }, sha256: str(64),
    scanStatus: { ...str(24), defaultValue: 'pending' }, retentionPolicyVersion: str(64, true), ...timestamps(false) },
  [{ fields: ['caseId', 'createdAt', 'id'] }]],
  ['SupportCaseEvents', { id: id(), caseId: caseId(), version: { type: T.INTEGER, allowNull: false },
    action: str(64), actorId: uuid(), actorRoles: { type: T.JSON, allowNull: false },
    permissions: { type: T.JSON, allowNull: false }, tenantScope: str(160), reason: str(500), before: { type: T.JSON, allowNull: true },
    after: { type: T.JSON, allowNull: true }, correlationId: str(128, true), idempotencyKeyHash: str(64, true),
    ...timestamps(false) }, [{ fields: ['caseId', 'version'], unique: true }]],
  ['SupportIdempotencies', { id: id(), actorId: uuid(), operation: str(96), tenantScope: str(160), keyHash: str(64),
    requestHash: str(64), caseId: caseId(), result: { type: T.JSON, allowNull: false }, ...timestamps(false) },
  [{ fields: ['actorId', 'operation', 'tenantScope', 'keyHash'], name: 'uq_support_idempotency_scope', unique: true }]],
];
exports.up = async ({ queryInterface }) => {
  const existing = (await queryInterface.showAllTables()).map((name) => String(name).toLowerCase());
  for (const [table, columns, indexes] of definitions) {
    if (existing.includes(table.toLowerCase())) continue;
    await queryInterface.createTable(table, columns);
    for (const index of indexes) await queryInterface.addIndex(table, index.fields, index);
  }
};
exports.down = async ({ queryInterface }) => {
  const existing = (await queryInterface.showAllTables()).map((name) => String(name).toLowerCase());
  for (const [table] of [...definitions].reverse()) if (existing.includes(table.toLowerCase())) await queryInterface.dropTable(table);
};
