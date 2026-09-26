const { applySnapshot } = require('./storeAccessService');

exports.syncStore = async (req, res) => {
  try {
    const result = await applySnapshot(req.body);
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.getStoreForMerchant = (req, res) => res.json({ success: true, data: req.store });
