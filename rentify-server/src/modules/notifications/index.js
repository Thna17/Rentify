// Public entry point of the notifications module. Other modules must require this file,
// not the files inside the module. Members load lazily when first read.
module.exports = {
  get emailService() { return require('./emailService'); },
  get notificationService() { return require('./notificationService'); },
  get telegramService() { return require('./telegramService'); },
  get durableNotificationService() { return require('./durableNotificationService'); },
  get startDurableNotificationJob() { return require('./durableNotificationJob').startDurableNotificationJob; },
};
