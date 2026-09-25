// controllers/categoryController.js (port 4000)
const { Category } = require("../models");

const MAX_CATEGORY_NAME = 80;

// Optional category photo: an https link, as returned by the image upload.
const categoryImage = (value) => {
  if (value === undefined || value === null || value === "") return null;
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" && !url.username && !url.password && url.href.length <= 2048 ? url.href : undefined;
  } catch {
    return undefined;
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { websiteId } = req.params;

    const { id } = req.body;
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    if (!name || name.length > MAX_CATEGORY_NAME) {
      return res.status(400).json({ error: `Category name is required (up to ${MAX_CATEGORY_NAME} characters)` });
    }
    const image = categoryImage(req.body.image);
    if (image === undefined) return res.status(400).json({ error: "Category image must be an https link" });

    const category = await Category.create({
      id, // Use the same ID as in WebsiteContent
      websiteId,
      name,
      ...(image && { image }),
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
