// Public entry point of the payments module. Other modules must require this file,
// not the files inside the module. Members load lazily when first read.
module.exports = {
  get paymentConfigEncryption() { return require('./paymentConfigEncryption'); },
  get PaymentProcessor() { return require('./PaymentProcessor'); },
  get codStateMachineService() { return require('./codStateMachineService'); },
  get codErrors() { return require('./codErrors'); },
  get CodStateError() { return require('./codErrors').CodStateError; },
  get COD_ERROR_CODES() { return require('./codErrors').COD_ERROR_CODES; },
};

