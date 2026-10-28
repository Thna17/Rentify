const test = require('node:test');
const assert = require('node:assert/strict');
const { configuredPolicy, deadlinePlan, dueNotices, addDays } = require('../../src/modules/billing/subscriptionPolicy');

test('proposed subscription schedule remains disabled without explicit versioned configuration', () => {
  assert.throws(() => configuredPolicy({}), (error) => error.code === 'SUBSCRIPTION_POLICY_UNAVAILABLE');
  assert.throws(() => configuredPolicy({ P5_SUBSCRIPTION_POLICY_ENABLED: 'true' }), (error) => error.code === 'SUBSCRIPTION_POLICY_UNAVAILABLE');
});
test('configured policy calculates trial, renewal, grace and retention milestones with an injected clock', () => {
  const policy = configuredPolicy({ P5_SUBSCRIPTION_POLICY_ENABLED: 'true', P5_SUBSCRIPTION_POLICY_VERSION: 'test-policy-v1' });
  const due = new Date('2026-01-20T12:00:00Z');
  assert.equal(addDays(new Date('2026-01-01T12:00:00Z'), policy.trialDays).toISOString(), '2026-01-15T12:00:00.000Z');
  const plan = deadlinePlan({ dueAt: due, suspendedAt: '2026-01-27T12:00:00Z' }, policy);
  assert.equal(plan.graceEndsAt.toISOString(), '2026-01-27T12:00:00.000Z');
  assert.equal(plan.historicalAccessEndsAt.toISOString(), '2026-04-27T12:00:00.000Z');
  assert.deepEqual(dueNotices(plan.noticeSchedule, new Date('2026-01-17T12:00:00Z')).map((n) => n.key),
    ['renewal_t_minus_7', 'renewal_t_minus_3']);
  assert.deepEqual(dueNotices(plan.noticeSchedule, new Date('2026-01-28T12:00:00Z'),
    ['renewal_t_minus_7', 'renewal_t_minus_3', 'renewal_t_minus_0']).map((n) => n.key),
  ['grace_day_1', 'grace_day_3', 'grace_day_6', 'suspension_day_8']);
});
