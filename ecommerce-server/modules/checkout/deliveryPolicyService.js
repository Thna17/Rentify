// A Store's flat delivery fee, which marketplace and storefront checkout add to every order.
const { sequelize } = require('../../config/db');
const { StoreAccess, StoreDeliveryPolicy } = require('../../models');
const { fail, uuid, dollars, deliveryFeeCents } = require('./marketplaceRules');

async function getDeliveryPolicy(storeId) {
  uuid(storeId, 'Store');
  const policy = await StoreDeliveryPolicy.findByPk(storeId);
  return policy ? { storeId, flatFee: policy.flatFee, currency: policy.currency,
    version: policy.version } : null;
}

async function setDeliveryPolicy(storeId, { flatFee, expectedVersion } = {}) {
  uuid(storeId, 'Store');
  const fee = dollars(deliveryFeeCents(flatFee));
  return sequelize.transaction(async (transaction) => {
    const store = await StoreAccess.findByPk(storeId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!store || store.status !== 'active') fail('Store is not active', 403);
    const policy = await StoreDeliveryPolicy.findByPk(storeId, {
      transaction, lock: transaction.LOCK.UPDATE,
    });
    if (!policy) {
      if (expectedVersion !== undefined && expectedVersion !== null) fail('Delivery policy version has changed', 409);
      const created = await StoreDeliveryPolicy.create({ storeId, flatFee: fee, currency: 'USD', version: 1 },
        { transaction });
      return { storeId, flatFee: created.flatFee, currency: created.currency, version: created.version };
    }
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion !== policy.version) {
      fail('Delivery policy version has changed; refresh and retry', 409);
    }
    await policy.update({ flatFee: fee, version: policy.version + 1 }, { transaction });
    return { storeId, flatFee: policy.flatFee, currency: policy.currency, version: policy.version };
  });
}

module.exports = { getDeliveryPolicy, setDeliveryPolicy };
