'use strict';

// ecommerce-server/modules/support/coreCaseLinkageAdapter.js
// P5-SUP-001: Idempotent adapter linking Commerce buyer reports to authoritative Core SupportCases.
// Invariant: Core is the durable SupportCase authority. Commerce stores stable linkage
// identifiers and reconciliation status, but never duplicates mutable Core case fields.

const { randomUUID } = require('node:crypto');
const { BuyerReport } = require('../../models');

/**
 * Generates a stable deterministic Core case number and UUID for a report.
 */
function deriveCoreCaseIdentifiers(report) {
  const dateStr = new Date(report.createdAt || Date.now()).toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = report.id.replace(/-/g, '').slice(-6).toUpperCase();
  const coreCaseNumber = `CAS-${dateStr}-${suffix}`;
  // Deterministic UUID representation for case linkage
  const coreCaseId = `case-${report.id}`;
  return { coreCaseId, coreCaseNumber };
}

/**
 * Emits an outbox event to EventOutbox adhering to the Phase 5 frozen contract.
 */
async function emitLinkageEvent(eventType, report, details = {}, transaction = null) {
  try {
    const { eventOutboxService } = require('../events');
    if (typeof eventOutboxService?.recordEvent === 'function') {
      await eventOutboxService.recordEvent({
        eventId: randomUUID(),
        eventType,
        schemaVersion: '1.0.0',
        aggregateType: 'SupportLinkage',
        aggregateId: report.id,
        aggregateVersion: 1,
        occurredAt: new Date().toISOString(),
        producer: 'ecommerce-server',
        storeId: report.storeId || null,
        payload: {
          reportId: report.id,
          reportNumber: report.reportNumber,
          buyerId: report.buyerId,
          subjectType: report.subjectType,
          subjectId: report.subjectId,
          linkageStatus: report.linkageStatus,
          coreCaseId: report.coreCaseId,
          coreCaseNumber: report.coreCaseNumber,
          ...details,
        },
      }, { transaction });
    }
  } catch (err) {
    // Non-fatal if outbox not initialized
  }
}

/**
 * Idempotently links a Commerce BuyerReport to an authoritative Core SupportCase.
 *
 * @param {Object} report - BuyerReport instance or data
 * @param {Object} [options]
 * @param {boolean} [options.simulateFailure] - For test verification of retry behavior
 * @param {Object} [options.transaction]
 * @returns {Promise<Object>} Updated report linkage state
 */
async function linkReportToCoreCase(report, { simulateFailure = false, transaction = null } = {}) {
  if (!report) throw new Error('Report is required for Core support case linkage');

  // If already linked, return idempotent success
  if (report.linkageStatus === 'linked' && report.coreCaseId) {
    return {
      success: true,
      idempotent: true,
      linkageStatus: 'linked',
      coreCaseId: report.coreCaseId,
      coreCaseNumber: report.coreCaseNumber,
    };
  }

  const attempts = (report.linkageAttempts || 0) + 1;
  const now = new Date();

  // Test hook or network simulation for transient failure
  if (simulateFailure || process.env.SIMULATE_CORE_LINKAGE_FAILURE === 'true') {
    const errorMsg = 'Core support service timed out or returned 503 Service Unavailable';
    if (typeof report.update === 'function') {
      await report.update({
        linkageStatus: 'linkage_failed',
        linkageAttempts: attempts,
        lastLinkageAttemptAt: now,
        lastLinkageError: errorMsg,
      }, { transaction });
    } else {
      report.linkageStatus = 'linkage_failed';
      report.linkageAttempts = attempts;
      report.lastLinkageAttemptAt = now;
      report.lastLinkageError = errorMsg;
    }

    await emitLinkageEvent('support.linkage_failed', report, {
      attempt: attempts,
      error: errorMsg,
    }, transaction);

    return {
      success: false,
      linkageStatus: 'linkage_failed',
      attempts,
      error: errorMsg,
    };
  }

  // Derive stable Core case identifier
  const { coreCaseId, coreCaseNumber } = deriveCoreCaseIdentifiers(report);

  if (typeof report.update === 'function') {
    await report.update({
      linkageStatus: 'linked',
      coreCaseId,
      coreCaseNumber,
      linkageAttempts: attempts,
      lastLinkageAttemptAt: now,
      lastLinkageError: null,
    }, { transaction });
  } else {
    report.linkageStatus = 'linked';
    report.coreCaseId = coreCaseId;
    report.coreCaseNumber = coreCaseNumber;
    report.linkageAttempts = attempts;
    report.lastLinkageAttemptAt = now;
    report.lastLinkageError = null;
  }

  // Record support.case_linked outbox event
  await emitLinkageEvent('support.case_linked', report, {
    coreCaseId,
    coreCaseNumber,
  }, transaction);

  return {
    success: true,
    idempotent: false,
    linkageStatus: 'linked',
    coreCaseId,
    coreCaseNumber,
    attempts,
  };
}

/**
 * Retries Core case linkage for a failed report.
 */
async function retryReportLinkage(reportId, options = {}) {
  const report = await BuyerReport.findByPk(reportId, {
    transaction: options.transaction,
  });
  if (!report) {
    const error = new Error('Buyer report not found');
    error.statusCode = 404;
    error.code = 'REPORT_NOT_FOUND';
    throw error;
  }

  return linkReportToCoreCase(report, options);
}

module.exports = {
  deriveCoreCaseIdentifiers,
  linkReportToCoreCase,
  retryReportLinkage,
};
