'use strict';

const { createAnalyticsEventService } = require('./analyticsEventService');
const { createPlatformMetricsService } = require('./platformMetricsService');

const events = createAnalyticsEventService();
const metrics = createPlatformMetricsService();

exports.record = async (req, res) => {
  const result = await events.record(req.body);
  res.status(result.duplicate ? 200 : 202).json({ data: result });
};

exports.dashboard = async (req, res) => {
  res.json({ data: await metrics.getDashboard(req.query) });
};
