const { applySnapshot } = require('./storeAccessService');
const launchFactsService = require('./launchFactsService');

exports.syncStore = async (req, res) => {
  try {
    const result = await applySnapshot(req.body);
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.getStoreForMerchant = (req, res) => res.json({ success: true, data: req.store });

exports.getLaunchFacts = async (req, res) => {
  try {
    const data = await launchFactsService.getLaunchFacts(req.params.storeId);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
};
