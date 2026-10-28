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
      if (t && !t.finished) {
        try {
          await t.rollback();
        } catch (_rollbackErr) {
          // Transaction may have already been rolled back by the database (e.g. on deadlock)
        }
      }
      
      // Add more specific conflict detection
      const isConflict = [
        'SequelizeOptimisticLockError',
        'SequelizeUniqueConstraintError'
      ].includes(err.name) || 
      err.message?.includes('version conflict') || 
      err.message?.includes('deadlock') ||
      err.message?.includes('Deadlock') ||
      err.parent?.code === 'ER_LOCK_DEADLOCK' ||
      err.original?.code === 'ER_LOCK_DEADLOCK' ||
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


