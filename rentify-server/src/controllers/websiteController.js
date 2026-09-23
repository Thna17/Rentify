// controllers/websiteController.js
const websiteService = require("../services/websiteService");
const ecommerceSyncService = require("../services/ecommerceSyncService");
const { logger } = require("../utils/logger");
const { asyncHandler } = require("../utils/helpers");
const { ERROR_CODES } = require("../config/constants");
const {
  Website,
  User,
  Staff,
  Subscription,
  Package,
  WebsiteTemplate,
  WebsiteContent,
} = require("../models");
const { getMerchantCache } = require("../utils/cache");
const cache = getMerchantCache();

class WebsiteController {
  /**
   * Create website with free trial
   */
  createWebsite = asyncHandler(async (req, res) => {
    const { templateId, businessData, packageId } = req.body;
    const userId = req.user.id;

    logger.info("Creating website", { userId, templateId, packageId });

    const website = await websiteService.createWebsiteWithTrial({
      userId,
      templateId,
      businessData,
      packageId,
    });

    // Sync to ecommerce service (non-blocking)
    ecommerceSyncService.syncWebsiteData(website).catch((error) => {
      logger.error("Ecommerce sync failed", {
        websiteId: website.id,
        error: error.message,
      });
    });

    res.status(201).json({
      success: true,
      data: website,
      message: "Website created successfully with free trial",
    });
  });

  /**
   * Get user's website
   */
  getWebsite = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const website = await websiteService.getUserWebsite(userId);

    if (!website) {
      return res.status(404).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: "Website not found",
      });
    }

    res.json({
      success: true,
      data: website,
    });
  });

  /**
   * Validate website access
   */
  validateWebsite = asyncHandler(async (req, res) => {
    const { websiteId } = req.params;

    const validation = await websiteService.validateWebsiteAccess(websiteId);

    res.json({
      success: true,
      data: validation,
    });
  });

  /**
   * Get merchant telegram info
   */
  getMerchantTelegramInfo = asyncHandler(async (req, res) => {
    const { websiteId } = req.params;

    const telegramInfo = await websiteService.getMerchantTelegramInfo(
      websiteId
    );

    res.json({
      success: true,
      data: telegramInfo,
    });
  });

  /**
   * Update website color palette
   */
  updateColorPalette = asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    const { paletteId } = req.body;

    const website = await websiteService.updateColorPalette(
      websiteId,
      paletteId
    );

    res.json({
      success: true,
      data: website,
      message: "Color palette updated successfully",
    });
  });
  getWebsiteByDomain = asyncHandler(async (req, res) => {
    try {
      const rawDomain = req.query.domain;
      if (!rawDomain) return res.status(400).json({ error: "Domain is required" });

      const reqOrigin = req.headers.origin || req.headers.referer || "";
      let targetDomain = rawDomain;
      if (rawDomain === "localhost") {
        if (reqOrigin.includes(":4600")) {
          targetDomain = "localhost:4600";
        } else if (reqOrigin.includes(":4700")) {
          targetDomain = "localhost:4700";
        }
      }

      // Check cache
      const cacheKey = `website:public:domain:${targetDomain}`;
      const cachedData = await cache.get(cacheKey);

      if (cachedData) {
        return res.json(cachedData);
      }

      const includeModels = [
        {
          model: User,
          attributes: ["id", "email", "phoneNumber"],
        },
        {
          model: WebsiteTemplate,
        },
        {
          model: WebsiteContent,
          as: "WebsiteContents",
          attributes: ["id", "category", "label", "type", "value"],
        },
        {
          model: Staff,
          as: "staffs",
          attributes: ["id", "email", "phoneNumber", "permissions"],
        },
      ];

      let website = await Website.findOne({
        where: { domain: targetDomain },
        include: includeModels,
      });

      if (!website && targetDomain.includes(":")) {
        const [hostOnly] = targetDomain.split(":");
        website = await Website.findOne({
          where: { domain: hostOnly },
          include: includeModels,
        });
      }

      if (!website) {
        return res.status(404).json({ error: "Website not found" });
      }

      const subscription = await Subscription.findOne({
        where: { websiteId: website.id },
        include: [Package],
      });

      // ✅ Optimized payload for public website
      const content =
        website.WebsiteContents?.map((item) => ({
          id: item.id,
          category: item.category,
          label: item.label,
          type: item.type,
          value: item.value,
        })) || [];

      const response = {
        websiteId: website.id,
        userId: website.userId,
        templateId: website.templateId,
        userEmail: website.User?.email || null,
        userPhoneNumber: website.User?.phoneNumber || null,
        content: content,
        selectedPalette:
          content.find(
            (item) => item.label === "Color Palette" && item.type === "palette"
          )?.value || null,
        colorPalette: website.WebsiteTemplate?.colorPalette || null,
        websiteTemplateId:
          website.WebsiteTemplate?.websiteTemplateId || website.templateId,
        package: subscription?.Package
          ? {
              id: subscription.Package.id,
              name: subscription.Package.name,
              features: subscription.Package.features,
              packageEndDate: subscription.endDate,
              subscriptionId: subscription.id,
            }
          : null,
        staffs:
          website.staffs?.map((staff) => ({
            id: staff.id,
            contact: staff.email || staff.phoneNumber,
            permissions: staff.permissions,
          })) || [],
      };

      // ✅ Use setWithIndex to cache and index in one call
      await cache.setWithIndex(website.id, cacheKey, response, 1800);

      res.json(response);
    } catch (error) {
      console.error("Error fetching website by domain:", error);
      res.status(500).json({
        error: "Server error",
        details: error.message,
      });
    }
  });

  getWebsiteForMerchant = asyncHandler(async (req, res) => {
    try {
      const userId = req.user.id;

      // ✅ Clean key design
      const cacheKey = `website:dashboard:user:${userId}`;
      const cachedData = await cache.get(cacheKey);

      if (cachedData) {
        return res.json(cachedData);
      }


      const website = await Website.findOne({
        where: { userId },
        include: [
          {
            model: User,
            as: "User",
            attributes: ["id", "name", "email", "phoneNumber"],
          },
          {
            model: WebsiteTemplate,
          },
          {
            model: WebsiteContent,
            as: "WebsiteContents",
            attributes: ["id", "category", "label", "type", "value"],
          },
          {
            model: Staff,
            as: "staffs",
            attributes: ["id", "name", "email", "phoneNumber", "permissions"],
          },
        ],
      });

      if (!website) {
        return res.status(404).json({ error: "Website not found" });
      }

      const subscription = await Subscription.findOne({
        where: { websiteId: website.id },
        include: [Package],
      });

      const WebsiteContents =
        website.WebsiteContents?.map((item) => ({
          id: item.id,
          category: item.category,
          label: item.label,
          type: item.type,
          value: item.value,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          websiteId: website.id,
        })) || [];

      const response = {
        id: website.id,
        domain: website.domain,
        websiteId: website.id,
        userId: website.userId,
        niche: website.niche || "ecommerce",
        status: website.status,
        businessConfig: website.businessConfig,
        userData: {
          id: website.User.id,
          name: website.User.name,
          email: website.User.email,
          phoneNumber: website.User.phoneNumber,
        },
        staffData:
          website.staffs?.map((staff) => ({
            id: staff.id,
            name: staff.name,
            email: staff.email,
            permissions: staff.permissions,
            phoneNumber: staff.phoneNumber,
          })) || [],
        package: subscription?.Package
          ? {
              id: subscription.Package.id,
              name: subscription.Package.name,
              features: subscription.Package.features,
              packageEndDate: subscription.endDate,
              subscriptionId: subscription.id,
            }
          : null,
        websiteTemplateId:
          website.WebsiteTemplate?.websiteTemplateId || website.templateId,
        nicheSettings: website.nicheSettings,
        createdAt: website.createdAt,
        updatedAt: website.updatedAt,
        WebsiteContents: WebsiteContents,
        selectedPalette:
          WebsiteContents.find(
            (item) => item.label === "Color Palette" && item.type === "palette"
          )?.value || null,
        colorPalette: website.WebsiteTemplate.colorPalette,
      };

      // ✅ Use setWithIndex to cache and index in one call
      await cache.setWithIndex(website.id, cacheKey, response, 60);

      res.json(response);
    } catch (error) {
      console.error("Error getting website for merchant:", error);
      res.status(400).json({ error: error.message });
    }
  });

  updateThemeConfiguration = asyncHandler(async (req, res) => {
    try {
      const { websiteId } = req.params;
      const { theme } = req.body;

      console.log(
        "🎨 Updating theme configuration for website:",
        websiteId,
        theme
      );

      if (!websiteId || !theme) {
        return res
          .status(400)
          .json({ error: "Website ID and theme are required" });
      }

      // Find or create theme configuration
      let themeContent = await WebsiteContent.findOne({
        where: {
          websiteId,
          label: "Theme Configuration",
          category: "global setting",
          type: "theme",
        },
      });

      if (themeContent) {
        themeContent.value = theme;
        await themeContent.save();
        console.log(
          "✅ Updated existing theme configuration:",
          themeContent.id
        );
      } else {
        themeContent = await WebsiteContent.create({
          websiteId,
          category: "global setting",
          label: "Theme Configuration",
          type: "theme",
          value: theme,
        });
        console.log("✅ Created new theme configuration:", themeContent.id);
      }

      // ✅ INVALIDATE CACHE - This is the key fix!
      const deletedCount = await cache.invalidateWebsiteCache(websiteId);
      console.log(
        `🗑️ Invalidated ${deletedCount} cache entries for website: ${websiteId}`
      );

      res.json({
        success: true,
        data: themeContent,
        message: `Theme updated successfully. Cleared ${deletedCount} cache entries.`,
      });
    } catch (error) {
      console.error("❌ Error updating theme:", error);
      res.status(400).json({ error: error.message });
    }
  });

  updateWebsiteContent = asyncHandler(async (req, res) => {
    try {
      const { contentId } = req.params;
      const { value } = req.body;

      console.log("Updating content:", contentId);

      const content = await WebsiteContent.findByPk(contentId);

      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }

      const websiteId = content.websiteId;

      // Handle different content types
      if (content.type === "image[]") {
        content.value = value;
      } else if (content.type === "theme") {
        if (typeof value === "object" && value.colors && value.typography) {
          content.value = value;
        } else {
          return res.status(400).json({ error: "Invalid theme structure" });
        }
      } else {
        content.value = value;
      }

      await content.save();

      console.log("✅ Content updated successfully:", content.id);

      // ✅ ONLY invalidate cache (Cache-Aside pattern)
      const deletedCount = await cache.invalidateWebsiteCache(websiteId);

      res.json({
        success: true,
        data: content,
        message: `Content updated successfully. Cleared ${deletedCount} cache entries.`,
      });
    } catch (error) {
      console.error("Error updating content:", error);
      res.status(400).json({ error: error.message });
    }
  });
  /**
   * Cache management endpoints
   */

  // ✅ Clean cache clearing (uses index, no wildcards)
  clearCache = asyncHandler(async (req, res) => {
    try {
      const { websiteId, userId, domain } = req.body;

      let message = "Cache cleared successfully";
      let clearedCount = 0;

      if (websiteId) {
        clearedCount = await cache.invalidateWebsiteCache(websiteId);
        message = `Cleared ${clearedCount} cache entries for website: ${websiteId}`;
      } else if (userId) {
        await cache.invalidateDashboardCache(userId);
        message = `Cleared dashboard cache for user: ${userId}`;
      } else if (domain) {
        await cache.invalidatePublicCache(domain);
        message = `Cleared public cache for domain: ${domain}`;
      } else {
        return res.status(400).json({
          error: "Please provide websiteId, userId, or domain",
        });
      }

      res.json({
        success: true,
        message,
        clearedCount,
      });
    } catch (error) {
      console.error("Error clearing cache:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ✅ Get cache stats
  getCacheStats = asyncHandler(async (req, res) => {
    try {
      const stats = await cache.getStats();

      // Get sample of what's cached
      const client = await cache.redisInstance.getClient();
      const allKeys = await client.keys("*");
      const sampleKeys = allKeys.slice(0, 5);
      const sampleData = {};

      for (const key of sampleKeys) {
        const value = await client.get(key);
        try {
          const parsed = JSON.parse(value);
          sampleData[key] = {
            type: key.includes("public")
              ? "public"
              : key.includes("dashboard")
              ? "dashboard"
              : key.includes("keys")
              ? "index"
              : "other",
            hasWebsiteId: !!(parsed.websiteId || parsed.id),
            size: value ? Buffer.byteLength(value, "utf8") : 0,
          };
        } catch (e) {
          sampleData[key] = { type: "non-json" };
        }
      }

      res.json({
        success: true,
        data: {
          stats,
          sample: sampleData,
          totalKeys: allKeys.length,
        },
      });
    } catch (error) {
      console.error("Error getting cache stats:", error);
      res.status(500).json({ error: error.message });
    }
  });

  getThemeConfiguration = asyncHandler(async (req, res) => {
    try {
      const { websiteId } = req.params;

      const themeContent = await WebsiteContent.findOne({
        where: {
          websiteId,
          label: "Theme Configuration",
          category: "global setting",
        },
      });

      res.json(themeContent);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
}

module.exports = new WebsiteController();
