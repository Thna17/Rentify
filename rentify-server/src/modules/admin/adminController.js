// A template's color palette is stored on WebsiteTemplate.colorPalette (JSON),
// which is what onboarding and the marketing site read. There is no separate
// palette table.
const {
  WebsiteTemplate,
  TemplateContent,
} = require("../../models");
const { emitAuditEvent } = require('../../utils/auditLogger');
const { getCorrelationId } = require('../../utils/logger');

const auditContext = (req) => ({ correlationId: getCorrelationId(req), actorUserId: req.user?.id,
  actorRole: req.platformAccess?.roles?.[0] || req.user?.role, actorRoles: req.platformAccess?.roles || (req.user?.role ? [req.user.role] : []),
  effectivePermissions: req.platformAccess?.effectivePermissions || [], reason: req.body.reason,
  sourceCaseId: req.body.sourceCaseId, tenantScope: req.platformAccess?.tenantScope,
  breakGlassGrantId: req.platformAccess?.breakGlassGrantId, ipAddress: req.ip,
  userAgent: req.get?.('user-agent') });
const templatePayload = (body) => {
  const { reason: _reason, sourceCaseId: _sourceCaseId, approvalRequestId: _approvalRequestId, content, ...data } = body;
  return { data, content };
};

exports.createTemplate = async (req, res) => {
  try {
    // Create website template
    const { data, content } = templatePayload(req.body);
    const template = await WebsiteTemplate.create(data);

    // Create template content
    if (Array.isArray(content)) {
      await Promise.all(
        content.map(async (item) => {
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

    await emitAuditEvent({ ...auditContext(req), action: 'PLATFORM_TEMPLATE_CREATED',
      resource: 'WebsiteTemplate', resourceId: template.id, safeAfter: template.toJSON?.() || template });

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
    const before = template.toJSON();
    const { data, content } = templatePayload(req.body);
    await template.update(data);

    // 3. Replace content
    if (Array.isArray(content)) {
      // Delete old content
      await TemplateContent.destroy({ where: { templateId: id } });

      // Add new ones
      await Promise.all(
        content.map((item) =>
          TemplateContent.create({
            ...item,
            templateId: id,
          })
        )
      );
    }

    await emitAuditEvent({ ...auditContext(req), action: 'PLATFORM_TEMPLATE_UPDATED',
      resource: 'WebsiteTemplate', resourceId: template.id, safeBefore: before, safeAfter: template.toJSON() });

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

    const before = template.toJSON();
    await template.destroy();
    await emitAuditEvent({ ...auditContext(req), action: 'PLATFORM_TEMPLATE_DELETED',
      resource: 'WebsiteTemplate', resourceId: template.id, safeBefore: before, safeAfter: { deleted: true } });
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
