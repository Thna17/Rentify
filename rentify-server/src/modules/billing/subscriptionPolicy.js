// DEC-014..020 remain proposed. This policy calculator performs no writes,
// charges, notices or entitlement transitions by itself.
const DAY_MS = 86400000;
const { ApiError } = require('../../utils/errors');

function configuredPolicy(env = process.env) {
  if (env.P5_SUBSCRIPTION_POLICY_ENABLED !== 'true') {
    throw new ApiError(503, 'Subscription lifecycle policy is not configured', 'SUBSCRIPTION_POLICY_UNAVAILABLE');
  }
  const version = String(env.P5_SUBSCRIPTION_POLICY_VERSION || '').trim();
  if (!version || version.length > 64) throw new ApiError(503, 'Subscription policy version is required', 'SUBSCRIPTION_POLICY_UNAVAILABLE');
  return Object.freeze({ version, trialDays: 14, renewalNoticeDays: [7, 3, 0], graceDays: 7,
    graceNoticeDays: [1, 3, 6], suspensionNoticeDay: 8, historicalReadDays: 90 });
}
function addDays(date, days) { return new Date(new Date(date).getTime() + days * DAY_MS); }
function deadlinePlan({ dueAt, suspendedAt }, policy) {
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) throw ApiError.validation([], 'A valid renewal date is required');
  const graceEndsAt = addDays(due, policy.graceDays);
  const noticeSchedule = [
    ...policy.renewalNoticeDays.map((days) => ({ key: `renewal_t_minus_${days}`, at: addDays(due, -days) })),
    ...policy.graceNoticeDays.map((days) => ({ key: `grace_day_${days}`, at: addDays(due, days) })),
    { key: `suspension_day_${policy.suspensionNoticeDay}`, at: addDays(due, policy.suspensionNoticeDay) },
  ];
  const suspended = suspendedAt ? new Date(suspendedAt) : null;
  if (suspended && Number.isNaN(suspended.getTime())) throw ApiError.validation([], 'Invalid suspension date');
  return { graceEndsAt, historicalAccessEndsAt: suspended ? addDays(suspended, policy.historicalReadDays) : null, noticeSchedule };
}
function dueNotices(schedule, now, alreadySent = []) {
  const time = new Date(now).getTime();
  if (Number.isNaN(time)) throw ApiError.validation([], 'Invalid evaluation time');
  const sent = new Set(alreadySent);
  return schedule.filter((notice) => notice.at.getTime() <= time && !sent.has(notice.key));
}
module.exports = { DAY_MS, configuredPolicy, addDays, deadlinePlan, dueNotices };
