// controllers/categoryController.js (port 4000)
const { Category } = require("../models");

exports.createCategory = async (req, res) => {
  try {
    const { websiteId } = req.params;

    const { id, name } = req.body;
    const category = await Category.create({
      id, // Use the same ID as in WebsiteContent
      websiteId,
      name,
      status: "active",
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    await category.update({ name });
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    await category.update({ status: "deleted" });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const { websiteId } = req.params;
    const categories = await Category.findAll({
      where: { websiteId, status: "active" },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
