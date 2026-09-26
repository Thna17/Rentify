// controllers/packageController.js (updated to include full CRUD)
const subscriptionService = require('./subscriptionService');

exports.getPackages = async (req, res) => {
  try {
    const packages = await subscriptionService.getPackages();
    res.json(packages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPackageById = async (req, res) => {
  try {
    const pkg = await subscriptionService.getPackageById(req.params.id);
    res.json(pkg);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

exports.createPackage = async (req, res) => {
  try {
    const pkg = await subscriptionService.createPackage(req.body);
    res.status(201).json(pkg);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updatePackage = async (req, res) => {
  try {
    const pkg = await subscriptionService.updatePackage(req.params.id, req.body);
    res.json(pkg);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deletePackage = async (req, res) => {
  try {
    await subscriptionService.deletePackage(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};