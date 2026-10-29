'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createSupportSlaJob } = require('../../src/modules/support/supportSlaJob');

test('overdue support escalation is disabled until policy enables it', async () => {
  const job = createSupportSlaJob({
    SupportCase: { findAll: async () => assert.fail('disabled job must not query cases') },
    supportService: {},
  });
  assert.deepEqual(await job.run({ enabled: false }), {
    enabled: false, inspected: 0, escalated: 0, skipped: 0,
  });
});

test('an enabled overdue-case scan escalates each configured deadline exactly once', async () => {
  const item = { id: 'case-overdue', status: 'in_progress', version: 4,
    serviceDeadlineAt: new Date('2026-10-28T10:00:00.000Z'), escalatedAt: null };
  let calls = 0;
  const SupportCase = { findAll: async () => item.escalatedAt ? [] : [item] };
  const supportService = { mutate: async (_item, input, context, key, kind) => {
    calls += 1;
    assert.equal(input.expectedVersion, 4);
    assert.equal(input.status, 'escalated');
    assert.equal(context.actorId, 'system:support-sla');
    assert.equal(key, 'support-sla:case-overdue:2026-10-28T10:00:00.000Z');
    assert.equal(kind, 'transition');
    item.status = 'escalated';
    item.escalatedAt = new Date('2026-10-29T12:00:00.000Z');
    item.version += 1;
  } };
  const job = createSupportSlaJob({ SupportCase, supportService });
  assert.deepEqual(await job.run({ enabled: true, now: new Date('2026-10-29T12:00:00.000Z') }),
    { enabled: true, inspected: 1, escalated: 1, skipped: 0 });
  assert.deepEqual(await job.run({ enabled: true, now: new Date('2026-10-29T12:05:00.000Z') }),
    { enabled: true, inspected: 0, escalated: 0, skipped: 0 });
  assert.equal(calls, 1);
});
