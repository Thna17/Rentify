// controllers/dashboardController.js
const axios = require("axios");
const {
  Website,
  User,
  WebsiteTemplate,
  Package,
  Subscription,
} = require("../models");
const { Op } = require("sequelize");
const cloudinary = require("cloudinary").v2;
const { rentifyApiUrl: CHOULWEB_API, ecommerceApiUrl: ECOMMERCE_API } = require("../config/runtimeUrls");
// Environment variables for service communication
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = {
  // Admin Dashboard Overview
  getAdminDashboard: async (req, res) => {
    try {
      if (req.user.role !== "admin")
        return res.status(403).json({ error: "Forbidden" });

      const [users, websites, sales, systemHealth] = await Promise.all([
        User.findAndCountAll(),
        Website.findAndCountAll(),
        axios.get(`${ECOMMERCE_API}/ecommerce/admin/sales`),
        checkSystemHealth(),
      ]);

      res.json({
        platformStats: {
          totalUsers: users.count,
          activeWebsites: websites.count,
          totalSales: sales.data.total,
          monthlyGrowth: calculateGrowth(websites.count),
        },
        systemHealth,
        recentActivities: await getRecentActivities(),
        revenueAnalytics: sales.data.breakdown,
      });
    } catch (error) {
      handleDashboardError(res, error);
    }
  },

  // Website-Specific Dashboard
  getWebsiteDashboard: async (req, res) => {
    try {
      const websiteId = req.params.websiteId;

      const [websiteData, analytics, products, orders] = await Promise.all([
        axios.get(`${CHOULWEB_API}/websites/${websiteId}`),
        axios.get(`${CHOULWEB_API}/websites/${websiteId}/analytics`),
        axios.get(`${ECOMMERCE_API}/ecommerce/websites/${websiteId}/products`),
        axios.get(`${ECOMMERCE_API}/ecommerce/websites/${websiteId}/orders`),
      ]);

      res.json({
        website: websiteData.data,
        analytics: analytics.data,
        ecommerce: {
          products: products.data,
          orders: orders.data,
          inventoryStats: calculateInventoryStats(products.data),
        },
      });
    } catch (error) {
      handleDashboardError(res, error);
    }
  },
  getCurrentWebsite: async (req, res) => {
    try {
      const userId = req.user.id;

      const website = await Website.findOne({
        where: { userId },
        include: [
          {
            model: User,
            attributes: ["id", "email", "phoneNumber"],
          },
          {
            model: Subscription,
            include: [
              {
                model: Package,
                attributes: ["id", "name", "features"],
              },
            ],
          },
        ],
      });

      if (!website) {
        return res.status(404).json({ error: "Website not found" });
      }

      const totalSizeMB = await getUserStorageSizeMB(userId);
      res.json({
        id: website.id,
        userId: website.userId,
        user: {
          id: website.User.id,
          email: website.User.email,
          phoneNumber: website.User.phoneNumber,
        },
        templateId: website.templateId,
        status: website.status,
        storageUsedMB: totalSizeMB,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  getUserSubscription: async (req, res) => {
    try {
      const userId = req.user.id;

      const website = await Website.findOne({
        where: { userId },
        include: [
          {
            model: Subscription,
            where: {
              status: {
                [Op.in]: ["active", "trial"],
              },
            },
            required: false,
            include: [
              {
                model: Package,
                attributes: ["id", "name", "features", "limits"],
              },
            ],
          },
        ],
      });

      if (!website) {
        return res.status(404).json({ error: "Website not found" });
      }

      res.json({
        package: website.Subscription.Package
          ? {
              id: website.Subscription.Package.id,
              name: website.Subscription.Package.name,
              features: website.Subscription.Package.features,
              packageEndDate: website.Subscription?.endDate,
              subscriptionId: website.Subscription?.id,
            }
          : null,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

// Helper functions
async function getWebsiteAnalytics(websiteId) {
  try {
    const [views, conversions] = await Promise.all([
      AnalyticsService.getViews(websiteId),
      AnalyticsService.getConversions(websiteId),
    ]);
    return { views, conversions, conversionRate: (conversions / views) * 100 };
  } catch {
    return { error: "Analytics unavailable" };
  }
}

function calculateGrowth(currentCount) {
  // Implementation using historical data
  return ((currentCount - previousMonthCount) / previousMonthCount) * 100;
}

async function checkSystemHealth() {
  const services = [
    { name: "Database", check: checkDatabaseConnection },
    { name: "Choulweb API", check: () => axios.get(`${CHOULWEB_API}/health`) },
    {
      name: "Ecommerce API",
      check: () => axios.get(`${ECOMMERCE_API}/health`),
    },
  ];

  const results = await Promise.all(
    services.map(async (service) => ({
      service: service.name,
      status: await service
        .check()
        .then(() => "OK")
        .catch(() => "Down"),
    }))
  );

  return {
    status: results.every((r) => r.status === "OK") ? "Healthy" : "Degraded",
    services: results,
  };
}

function handleDashboardError(res, error) {
  console.error("Dashboard Error:", error);
  if (error.response?.status === 404) {
    return res.status(404).json({ error: "Resource not found" });
  }
  res.status(500).json({ error: "Dashboard data unavailable" });
}

function generateQuickActions(role) {
  const baseActions = [
    { label: "New Website", icon: "add", path: "/websites/new" },
    {
      label: "View Products",
      icon: "shopping_bag",
      path: "/ecommerce/products",
    },
  ];

  if (role === "admin") {
    baseActions.push(
      { label: "Manage Users", icon: "people", path: "/admin/users" },
      { label: "System Monitor", icon: "monitor", path: "/admin/monitor" }
    );
  }

  return baseActions;
}

async function getUserStorageSizeMB(userId) {
  let totalSize = 0;
  let nextCursor = null;

  try {
    do {
      const result = await cloudinary.api.resources({
        type: "upload",
        prefix: userId,
        max_results: 100,
        next_cursor: nextCursor,
      });

      totalSize += result.resources.reduce((acc, file) => acc + file.bytes, 0);
      nextCursor = result.next_cursor;
    } while (nextCursor);

    const totalSizeMB = totalSize / (1024 * 1024);
    const percentageUsed = Math.min((totalSizeMB / 100) * 100, 100).toFixed(2); // capped at 100%

    return {
      totalSizeMB: parseFloat(totalSizeMB.toFixed(2)),
      percentageUsed: parseFloat(percentageUsed),
    };
  } catch (err) {
    console.error("Cloudinary error:", err);
    return { totalSizeMB: 0, percentageUsed: 0 };
  }
}
