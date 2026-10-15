// A template's color palette is stored on WebsiteTemplate.colorPalette (JSON),
// which is what onboarding and the marketing site read. There is no separate
// palette table.
const {
  WebsiteTemplate,
  TemplateContent,
} = require("../../models");

exports.createTemplate = async (req, res) => {
  try {
    // Create website template
    const template = await WebsiteTemplate.create(req.body);

    // Create template content
    if (Array.isArray(req.body.content)) {
      await Promise.all(
        req.body.content.map(async (item, index) => {
          try {
            const content = await TemplateContent.create({
              ...item,
              value:
                typeof item.value === "object"
                  ? JSON.stringify(item.value)
                  : item.value,
              templateId: template.id,
            });
          } catch (err) {
            console.error("Error message:", err.message);
            throw err; // This rethrows so the main catch handles it
          }
        })
      );
    }

    res.status(201).json(template);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
exports.updateTemplate = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Find the existing template
    const template = await WebsiteTemplate.findByPk(id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    // 2. Update template main fields
    await template.update(req.body);

    // 3. Replace content
    if (Array.isArray(req.body.content)) {
      // Delete old content
      await TemplateContent.destroy({ where: { templateId: id } });

      // Add new ones
      await Promise.all(
        req.body.content.map((item) =>
          TemplateContent.create({
            ...item,
            templateId: id,
          })
        )
      );
    }

    res
      .status(200)
      .json({ message: "Template updated successfully", template });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    console.log("Admin deleting template");
    const template = await WebsiteTemplate.findByPk(req.params.id);
    if (!template) return res.status(404).json({ error: "Template not found" });

    await template.destroy();
    res.json({ message: "Template deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getAllTemplates = async (req, res) => {
  try {
    console.log("Admin getting all templates");
    const templates = await WebsiteTemplate.findAll({
      include: [TemplateContent],
    });
    res.json(templates);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getTemplateById = async (req, res) => {
  try {
    console.log("Admin getting template by id");
    const template = await WebsiteTemplate.findByPk(req.params.id, {
      include: [TemplateContent],
    });
    if (!template) return res.status(404).json({ error: "Template not found" });

    res.json(template);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
