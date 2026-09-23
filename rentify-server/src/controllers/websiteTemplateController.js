const WebsiteTemplate = require("../models/WebsiteTemplate");

exports.getAllTemplates = async (req, res) => {
    try {
      console.log("getting all templates");
      const templates = await WebsiteTemplate.findAll();
      res.json(templates);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }


exports.getTemplateById = async (req, res) => {
  try {
    console.log("getting template by id");
    const template = await WebsiteTemplate.findByPk(req.params.id);
    if (!template) return res.status(404).json({ error: "Template not found" });

    res.json(template);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

exports.getTemplatesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    console.log(`Getting templates for category: ${category}`);
    
    const templates = await WebsiteTemplate.findAll({
      where: { category }
    });

    if (templates.length === 0) {
      return res.status(404).json({ error: "No templates found for this category" });
    }

    res.json(templates);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
