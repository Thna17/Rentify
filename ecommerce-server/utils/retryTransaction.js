// utils/retryTransaction.js
const { sequelize } = require("../config/db");

const retryTransaction = async (operationFn, maxRetries = 5) => {
  for (let i = 0; i < maxRetries; i++) {
    const t = await sequelize.transaction();
    try {
      const result = await operationFn(t);
      await t.commit();
      return result;
    } catch (err) {
      await t.rollback();
      
      // Add more specific conflict detection
      const isConflict = [
        'SequelizeOptimisticLockError',
        'SequelizeUniqueConstraintError'
      ].includes(err.name) || 
      err.message?.includes('version conflict') || 
      err.message?.includes('deadlock') ||
      err.message?.includes('stock');
      
      if (isConflict && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 100; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
};

module.exports = retryTransaction;


