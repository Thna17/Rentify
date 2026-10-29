'use strict';

const { createPlatformMetricsService } = require('./platformMetricsService');

exports.dashboard = async (req, res) => {
  res.json({ data: await createPlatformMetricsService().getDashboard(req.query) });
};
