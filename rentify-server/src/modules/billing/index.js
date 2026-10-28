// Public entry point of the billing module. Other modules must require this file,
// not the files inside the module. Members load lazily when first read.
module.exports = {
  get subscriptionService() { return require('./subscriptionService'); },
  get entitlementService() { return require('./entitlements').entitlementService; },
  get capabilityConfig() { return require('./entitlements'); },
  get cutluyAdapter() { return require('./cutluyAdapter').cutluyAdapter; },
  get CutLuyAdapter() { return require('./cutluyAdapter').CutLuyAdapter; },
  get cutluyPaymentService() { return require('./cutluyPaymentService'); },
  get cutluyWebhookService() { return require('./cutluyWebhookService'); },
  get cutluyWebhookVerifier() { return require('./cutluyWebhookVerifier'); },
  get cutluyReconciliationService() { return require('./cutluyReconciliationService'); },
  get cutluyReplayService() { return require('./cutluyReplayService'); },
  get cutluyDiagnostics() { return require('./cutluyDiagnostics'); },
  get cutluyErrors() { return require('./cutluyErrors'); },
  get CutLuyError() { return require('./cutluyErrors').CutLuyError; },
  get CUTLUY_ERROR_CODES() { return require('./cutluyErrors').CUTLUY_ERROR_CODES; },
};
