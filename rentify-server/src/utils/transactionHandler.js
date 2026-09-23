// utils/transactionHandler.js
const  sequelize  = require("../config/db");
const { ApiError } = require("../utils/errors");

module.exports = (handler) => async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    await handler(req, res, transaction);
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    const status = err instanceof ApiError ? err.statusCode : 500;
    res.status(status).json({ 
      success: false,
      error: err.message 
    });
  }
};