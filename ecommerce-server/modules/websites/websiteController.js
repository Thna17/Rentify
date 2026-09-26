const { WebsiteData, WebsiteContent } = require("../../models");
const updateDeploymentUrls = require("./updateDeploymentUrls");

exports.websiteData = async (req, res) => {
  try {
    if (!WebsiteData) {
      throw new Error("WebsiteDataModel is not defined");
    }

    const {
      websiteId,
      storeId,
      userId,
      content = [],
      status,
      domain,
      niche = "ecommerce",
      businessConfig,
      nicheSettings,
      userData,
      staffData,
      websiteTemplateId,
      package,
    } = req.body;

    if (!websiteId || !userId) {
      return res.status(400).json({
        message: "Missing required fields: websiteId or userId",
      });
    }

    const upsertData = {
      id: websiteId,
      websiteId,
      storeId,
      userId,
      domain,
      niche,
      businessConfig,
      nicheSettings,
      userData,
      staffData,
      websiteTemplateId,
      package,
      isActive: true,
    };

    if (status && typeof status === 'string' && status.trim() !== '') {
      upsertData.status = status;
    }

    const [data] = await WebsiteData.upsert(upsertData);

    if (storeId) {
      const { Product } = require("../../models");
      await Product.update(
        { websiteId },
        { where: { storeId, websiteId: null } }
      );
    }

    await Promise.all(
      content.map(async (item) => {
        return WebsiteContent.findOrCreate({
          where: {
            websiteId: data.id,
            category: item.category,
            label: item.label,
            type: item.type,
          },
          defaults: { value: item.value },
        });
      })
    );

    res.status(200).json(data);
  } catch (error) {
    console.error("Error in POST /website-data:", error.message);
    res
      .status(500)
      .json({ message: "Failed to save website data", error: error.message });
  }
};

exports.updateWebsiteData = async (req, res) => {
  try {
    const { websiteId } = req.params;
    const updates = req.body;

    const [rows] = await WebsiteData.update(updates, {
      where: { id: websiteId },
    });

    if (rows === 0) return res.status(404).json({ error: "Website not found" });

    // Update .env if domain changes
    if (updates.domain) {
      updateDeploymentUrls(updates.domain);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error in PUT /website-data/:websiteId:", error.message);
    res.status(500).json({ message: "Failed to update website data" });
  }
};







exports.getFullWebsiteByDomain = async (req, res) => {
  try {
    const { domain } = req.query;
    if (!domain) return res.status(400).json({ error: "Domain is required" });

    let websiteData = await WebsiteData.findOne({
      where: { domain },
      include: [
        {
          model: WebsiteContent,
          as: "WebsiteContents", // ✅ Add this
          attributes: ["id", "category", "label", "type", "value"],
        },
      ],
    });

    // Fallback: if domain has port (e.g. localhost:4700) or exact match not found, try clean domain
    if (!websiteData && domain.includes(':')) {
      const cleanDomain = domain.split(':')[0];
      websiteData = await WebsiteData.findOne({
        where: { domain: cleanDomain },
        include: [
          {
            model: WebsiteContent,
            as: "WebsiteContents",
            attributes: ["id", "category", "label", "type", "value"],
          },
        ],
      });
    }

    // Fallback for local development if localhost is queried
    if (!websiteData && (domain === 'localhost' || domain.startsWith('localhost:') || domain === '127.0.0.1')) {
      websiteData = await WebsiteData.findOne({
        where: { status: 'active' },
        include: [
          {
            model: WebsiteContent,
            as: "WebsiteContents",
            attributes: ["id", "category", "label", "type", "value"],
          },
        ],
      });
    }

    if (!websiteData) {
      return res.status(404).json({ error: "Website not found" });
    }

    // Structure the response to match frontend expectations
    const response = {
      websiteId: websiteData.id,
      content: websiteData.WebsiteContents,
      websiteTemplateId: websiteData.websiteTemplateId,
      package: websiteData.package,
      staffs:
        websiteData.staffData?.map((staff) => ({
          id: staff.id,
          contact: staff.email || staff.phoneNumber,
          permissions: staff.permissions,
        })) || [],
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching website:", error);
    res.status(500).json({
      error: "Server error",
      details: error.message,
    });
  }
};

exports.getWebsite = async (req, res) => {
  try {
    const userId = req.user.id;
    const website = await WebsiteData.findOne({
      where: { userId },
      include: [{ model: WebsiteContent, as: "WebsiteContents" }],

    });

    if (!website) {
      return res.status(404).json({ error: "Website not found" });
    }

    res.json(website);
  } catch (error) {
    console.error("Error getting website:", error);
    res.status(400).json({ error: error.message });
  }
};
