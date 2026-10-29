'use strict';

module.exports = {
  get analyticsEventService() { return require('./analyticsEventService'); },
  get platformMetricsService() { return require('./platformMetricsService'); },
};
