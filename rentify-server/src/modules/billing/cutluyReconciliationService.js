'use strict';

// rentify-server/src/modules/billing/cutluyReconciliationService.js
// P3-PAY-002: Reconciliation Service.
// Mathematical and status auditing against provider source-of-truth.

const { PaymentAttempt, ProviderEvent } = require('../../models');
const { cutluyAdapter } = require('./cutluyAdapter');
const { CUTLUY_ERROR_CODES, CutLuyError, ATTEMPT_STATUS } = require('./cutluyErrors');

async function reconcilePaymentAttempt(
  attemptId,
  { dryRun = false, adapter = cutluyAdapter, fixtureState = null, simulatedError = null, transaction: tx } = {}
) {
  if (!attemptId) {
    throw new CutLuyError(CUTLUY_ERROR_CODES.CLIENT_ERROR, 'attemptId is required for reconciliation', 400);
  }

  const attempt = await PaymentAttempt.findByPk(attemptId, { transaction: tx });
  if (!attempt) {
    throw new CutLuyError(
      CUTLUY_ERROR_CODES.PAYMENT_ATTEMPT_NOT_FOUND,
      `PaymentAttempt not found: ${attemptId}`,
      404
    );
  }

  // 1. Read authoritative payment state from provider
  const providerData = await adapter.getPayment({
    accountRef: attempt.accountRef,
    accountType: attempt.accountType,
    providerPaymentId: attempt.providerPaymentId || `cutluy_pay_${attempt.id.slice(0, 8)}`,
    fixtureState,
    simulatedError,
  });

  const discrepancies = [];

  // 2. Amount verification
  if (providerData.amount && Number(providerData.amount) !== Number(attempt.amount)) {
    discrepancies.push({
      code: CUTLUY_ERROR_CODES.WRONG_AMOUNT,
      message: `Amount mismatch: Provider reported ${providerData.amount} USD but Attempt is ${attempt.amount} USD`,
      provider: providerData.amount,
      attempt: attempt.amount,
    });
  }

  // 3. Currency verification (USD only)
  if (providerData.currency && providerData.currency.toUpperCase() !== 'USD') {
    discrepancies.push({
      code: CUTLUY_ERROR_CODES.WRONG_CURRENCY,
      message: `Currency mismatch: Provider reported ${providerData.currency} but Attempt is USD`,
      provider: providerData.currency,
      attempt: attempt.currency,
    });
  }

  // 4. Business reference verification
  if (providerData.referenceId && providerData.referenceId !== attempt.businessReference) {
    discrepancies.push({
      code: CUTLUY_ERROR_CODES.WRONG_REFERENCE,
      message: `Reference mismatch: Provider reference "${providerData.referenceId}" does not match "${attempt.businessReference}"`,
      provider: providerData.referenceId,
      attempt: attempt.businessReference,
    });
  }

  // 5. Account verification
  if (providerData.accountRef && providerData.accountRef !== attempt.accountRef) {
    discrepancies.push({
      code: CUTLUY_ERROR_CODES.WRONG_ACCOUNT,
      message: `Account mismatch: Provider account "${providerData.accountRef}" does not match "${attempt.accountRef}"`,
      provider: providerData.accountRef,
      attempt: attempt.accountRef,
    });
  }

  // 6. Status reconciliation
  const providerStatus = providerData.status;
  const currentStatus = attempt.status;
  let repaired = false;
  let actionTaken = 'none';

  if (discrepancies.length === 0) {
    if (providerStatus === ATTEMPT_STATUS.PAID && currentStatus !== ATTEMPT_STATUS.PAID) {
      actionTaken = 'mark_paid';
      if (!dryRun) {
        await attempt.update(
          {
            status: ATTEMPT_STATUS.PAID,
            providerStatus: providerData.providerStatus || 'paid',
            paidAt: attempt.paidAt || new Date(),
            version: attempt.version + 1,
          },
          { transaction: tx }
        );
        repaired = true;
      }
    } else if (providerStatus === ATTEMPT_STATUS.EXPIRED && currentStatus === ATTEMPT_STATUS.PENDING) {
      actionTaken = 'mark_expired';
      if (!dryRun) {
        await attempt.update(
          {
            status: ATTEMPT_STATUS.EXPIRED,
            providerStatus: providerData.providerStatus || 'expired',
            expiresAt: attempt.expiresAt || new Date(),
            version: attempt.version + 1,
          },
          { transaction: tx }
        );
        repaired = true;
      }
    } else if (providerStatus === ATTEMPT_STATUS.FAILED && currentStatus === ATTEMPT_STATUS.PENDING) {
      actionTaken = 'mark_failed';
      if (!dryRun) {
        await attempt.update(
          {
            status: ATTEMPT_STATUS.FAILED,
            providerStatus: providerData.providerStatus || 'failed',
            failedAt: attempt.failedAt || new Date(),
            version: attempt.version + 1,
          },
          { transaction: tx }
        );
        repaired = true;
      }
    }
  }

  return {
    attemptId: attempt.id,
    businessReference: attempt.businessReference,
    accountRef: attempt.accountRef,
    reconciled: discrepancies.length === 0 && (actionTaken === 'none' || repaired),
    discrepancies,
    actionTaken,
    dryRun,
    attemptStatus: attempt.status,
    providerStatus,
    amount: attempt.amount,
    currency: attempt.currency,
  };
}

module.exports = {
  reconcilePaymentAttempt,
};
