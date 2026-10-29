'use strict';

const { Op } = require('sequelize');
const models = require('../../models');
const supportService = require('./supportService');

const ESCALATABLE_STATUSES = ['in_progress', 'waiting_on_requester', 'waiting_on_merchant'];

function createSupportSlaJob(deps = {}) {
  const SupportCase = deps.SupportCase || models.SupportCase;
  const service = deps.supportService || supportService;
  return {
    async run({ enabled = process.env.P5_SUPPORT_SLA_AUTOMATION_ENABLED === 'true', now = new Date() } = {}) {
      if (!enabled) return { enabled: false, inspected: 0, escalated: 0, skipped: 0 };
      const candidates = await SupportCase.findAll({
        where: {
          status: { [Op.in]: ESCALATABLE_STATUSES },
          serviceDeadlineAt: { [Op.lt]: now },
          escalatedAt: null,
        },
        order: [['serviceDeadlineAt', 'ASC'], ['id', 'ASC']],
      });
      let escalated = 0;
      let skipped = 0;
      for (const item of candidates) {
        const deadline = new Date(item.serviceDeadlineAt).toISOString();
        try {
          await service.mutate(item, {
            expectedVersion: item.version,
            status: 'escalated',
            reason: 'Configured support deadline breached',
          }, {
            actorId: 'system:support-sla',
            roles: ['system'],
            permissions: ['support.case.escalate'],
            reason: 'Configured support deadline breached',
            correlationId: `support-sla:${item.id}:${deadline}`,
          }, `support-sla:${item.id}:${deadline}`, 'transition');
          escalated += 1;
        } catch (error) {
          if (['VERSION_CONFLICT', 'IDEMPOTENCY_CONFLICT'].includes(error.code)) skipped += 1;
          else throw error;
        }
      }
      return { enabled: true, inspected: candidates.length, escalated, skipped };
    },
  };
}

module.exports = { createSupportSlaJob, ESCALATABLE_STATUSES };
