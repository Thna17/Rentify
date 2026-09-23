// controllers/ecommerceStatsController.js
const {
  Order,
  OrderItem,
  Product,
  Payment,
  Cart,
  CartItem,
} = require("../models");
const { Op, Sequelize } = require("sequelize");
const { sequelize } = require("../config/db");
module.exports = {
  getWebsiteStats: async (req, res) => {
    try {
      const { websiteId } = req.params;
      const { period = "7d", orderType } = req.query;

      const dateRange = getDateRange(period);

      const orderTypeFilter =
        orderType && orderType !== "all"
          ? { orderType }
          : { orderType: { [Op.in]: ["online", "pos", "manual"] } };

      const [overview, products, payments, trends] = await Promise.all([
        getSalesOverview(websiteId, dateRange, orderTypeFilter),
        getProductPerformance(websiteId, dateRange, orderTypeFilter),
        getPaymentAnalytics(websiteId, dateRange, orderTypeFilter),
        getSalesTrends(websiteId, dateRange, orderTypeFilter),
      ]);

      res.json({
        dateRange,
        overview,
        products,
        payments,
        trends,
        customerInsights: await getCustomerInsights(
          websiteId,
          dateRange,
          orderTypeFilter
        ),
        inventory: await getInventoryStats(websiteId),
        conversions: await getConversionMetrics(
          websiteId,
          dateRange,
          orderTypeFilter
        ),
        revenueRisk: {
          recovered: await getRecoveredRevenue(websiteId, dateRange),
          potential: await getPotentialRevenue(websiteId, dateRange),
        }
      });
    } catch (error) {
      handleStatsError(res, error);
    }
  },

  getAdminStats: async (req, res) => {
    try {
      const [platformStats, topPerformers] = await Promise.all([
        getPlatformWideStats(),
        getTopPerformers(),
      ]);

      res.json({
        ...platformStats,
        topPerformers,
        lifetimeValues: await calculateLTV(),
        // merchantHealth: await getMerchantHealthStats()
      });
    } catch (error) {
      handleStatsError(res, error);
    }
  },
};

// ======================
// HELPER FUNCTIONS
// ======================

async function getSalesOverview(websiteId, dateRange, orderTypeFilter) {
  const result = await Order.findOne({
    attributes: [
      [Sequelize.fn("COUNT", Sequelize.col("id")), "totalOrders"],
      [Sequelize.fn("SUM", Sequelize.col("totalAmount")), "totalRevenue"],
      [
        Sequelize.literal("SUM(totalAmount) / COUNT(DISTINCT userId)"),
        "avgRevenuePerUser",
      ],
      [Sequelize.literal("SUM(totalAmount) / COUNT(id)"), "avgOrderValue"],
    ],
    where: {
      websiteId,
      status: { [Op.in]: ["completed", "fulfilled"] },
      createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
      ...orderTypeFilter,
    },
    raw: true,
  });

  const previousPeriod = await getPreviousPeriodComparison(
    websiteId,
    dateRange,
    orderTypeFilter
  );

  const safeDivision = (current, previous) =>
    previous === 0
      ? current === 0
        ? 0
        : 100
      : ((current - previous) / previous) * 100;
  const totalOrders = Number(result.totalOrders) || 0;
  const totalRevenue = Number(result.totalRevenue) || 0;

  return {
    totalOrders,
    totalRevenue,
    avgRevenuePerUser: result.avgRevenuePerUser || 0,
    avgOrderValue: result.avgOrderValue || 0,
    growthRate: {
      revenue: safeDivision(totalRevenue, previousPeriod.revenue),
      orders: safeDivision(totalOrders, previousPeriod.orders),
    },
  };
}

async function getPreviousPeriodComparison(
  websiteId,
  dateRange,
  orderTypeFilter
) {
  const diff = dateRange.end - dateRange.start;

  const previousStart = new Date(dateRange.start.getTime() - diff);
  const previousEnd = dateRange.start;

  const result = await Order.findOne({
    attributes: [
      [Sequelize.fn("COUNT", Sequelize.col("id")), "orders"],
      [Sequelize.fn("SUM", Sequelize.col("totalAmount")), "revenue"],
    ],
    where: {
      websiteId,
      status: { [Op.in]: ["completed", "fulfilled"] },
      createdAt: { [Op.between]: [previousStart, previousEnd] },
      ...orderTypeFilter,
    },
    raw: true,
  });

  return {
    orders: Number(result.orders || 0),
    revenue: Number(result.revenue || 0),
  };
}

async function getProductPerformance(websiteId, dateRange, orderTypeFilter) {
  const results = await OrderItem.findAll({
    attributes: [
      "productId",
      [Sequelize.fn("SUM", Sequelize.col("quantity")), "unitsSold"],
      [
        Sequelize.fn("SUM", Sequelize.literal("quantity * OrderItem.price")),
        "revenue",
      ],
    ],
    include: [
      {
        model: Order,
        where: {
          websiteId,
          status: { [Op.in]: ["completed", "fulfilled"] },
          createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
          ...orderTypeFilter,
        },
        attributes: [], // we only need the join
      },
      {
        model: Product,
        attributes: ["name", "images", "price"],
        where: { websiteId },
      },
    ],
    group: ["productId", "Product.id"],
    order: [[Sequelize.literal("unitsSold"), "DESC"]],
    limit: 10,
    raw: true,
    nest: true,
  });

  return results.map((item) => ({
    productId: item.productId,
    name: item.Product.name,
    image: item.Product.images,
    price: item.Product.price,
    revenue: Number(item.revenue),
    unitsSold: Number(item.unitsSold),
  }));
}

const getPaymentAnalytics = async (websiteId, dateRange, orderTypeFilter) => {
  const paymentStats = await Payment.findAll({
    attributes: [
      "paymentMethod",
      [Sequelize.fn("COUNT", Sequelize.col("Payment.id")), "transactions"],
      [Sequelize.fn("SUM", Sequelize.col("amount")), "totalAmount"],
      [
        Sequelize.literal(
          `(COUNT(Payment.id) * 100.0) / (SELECT COUNT(*) FROM Payments WHERE createdAt BETWEEN '${dateRange.start}' AND '${dateRange.end}')`
        ),
        "percentage",
      ],
    ],
    include: [
      {
        model: Order,
        attributes: [], // skip including full order fields here
        where: { websiteId, ...orderTypeFilter },
      },
    ],
    where: {
      status: "completed",
      createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
    },
    group: ["Payment.paymentMethod"],
  });

  return paymentStats;
};

async function getSalesTrends(websiteId, dateRange, orderTypeFilter) {
  const dates = generateDateSeries(dateRange.start, dateRange.end);

  // Extract orderTypes array
  const orderTypes = orderTypeFilter?.orderType?.[Op.in]
    ? orderTypeFilter.orderType[Op.in]
    : orderTypeFilter?.orderType
      ? [orderTypeFilter.orderType]
      : ["online", "pos", "manual"];

  return await sequelize.query(
    `
    SELECT 
      dates.date AS date,
      COALESCE(COUNT(DISTINCT orders.id), 0) AS orders,
      COALESCE(SUM(orders.totalAmount), 0) AS revenue
    FROM (${dates}) AS dates
    LEFT JOIN Orders orders 
      ON DATE(orders.createdAt) = dates.date
      AND orders.websiteId = :websiteId
      AND orders.status IN (:statuses)
      AND orders.orderType IN (:orderTypes)
    GROUP BY dates.date
    ORDER BY dates.date ASC
  `,
    {
      replacements: {
        websiteId,
        statuses: ["completed", "fulfilled"],
        orderTypes, // ✅ Now explicitly passed
      },
      type: Sequelize.QueryTypes.SELECT,
    }
  );
}

function generateDateSeries(start, end) {
  const dates = [];
  let current = new Date(start);
  current.setHours(0, 0, 0, 0);
  end = new Date(end);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    dates.push(`SELECT DATE('${current.toISOString().slice(0, 10)}') AS date`);
    current.setDate(current.getDate() + 1);
  }

  return dates.join(" UNION ALL ");
}

async function getInventoryStats(websiteId) {
  const result = await Product.findOne({
    attributes: [
      [Sequelize.fn("COUNT", Sequelize.col("id")), "totalProducts"],
      [Sequelize.fn("SUM", Sequelize.col("stockQuantity")), "totalStock"],
      [
        Sequelize.literal(`
          SUM(CASE 
            WHEN stockQuantity <= 0 THEN 1
            ELSE 0 
          END)`),
        "criticalOutOfStock",
      ],
      [
        Sequelize.literal(`
          SUM(CASE 
            WHEN stockQuantity > 0 
            AND stockQuantity <= COALESCE(lowStockThreshold, 5) THEN 1
            ELSE 0 
          END)`),
        "lowStock",
      ],
      [Sequelize.fn("AVG", Sequelize.col("stockQuantity")), "avgStock"],
    ],
    where: {
      websiteId,
      status: { [Op.ne]: "archived" },
    },
    raw: true,
  });

  return {
    totalProducts: Number(result.totalProducts) || 0,
    totalStock: Number(result.totalStock) || 0,
    criticalOutOfStock: Number(result.criticalOutOfStock) || 0,
    lowStock: Number(result.lowStock) || 0,
    avgStock: Number(result.avgStock).toFixed(1) || "0.0",
  };
}
async function getCustomerInsights(websiteId, dateRange, orderTypeFilter) {
  const customers = await Order.findAll({
    attributes: [
      [
        Sequelize.fn(
          "COALESCE",
          Sequelize.col("userId"),
          Sequelize.col("sessionId")
        ),
        "customerIdentifier",
      ],
      [
        Sequelize.literal(
          "CASE WHEN `Order`.`userId` IS NULL THEN true ELSE false END"
        ),
        "isGuest",
      ],
      [Sequelize.fn("COUNT", Sequelize.col("id")), "orders"],
      [Sequelize.fn("SUM", Sequelize.col("totalAmount")), "totalSpent"],
    ],
    where: {
      status: { [Op.in]: ["completed", "fulfilled"] },
      websiteId,
      createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
      ...orderTypeFilter,
    },
    group: ["customerIdentifier", "isGuest"],
    order: [[Sequelize.literal("`totalSpent`"), "DESC"]],
    limit: 10,
  });

  return customers;
}

async function getConversionMetrics(websiteId, dateRange, orderTypeFilter) {
  if (orderTypeFilter.orderType && orderTypeFilter.orderType !== "online") {
    return { abandonedCarts: 0, convertedCarts: 0, conversionRate: 0 };
  }

  const abandonedCarts = await Cart.count({
    include: [
      {
        model: CartItem,
        required: true,
      },
      {
        model: Order,
        required: false,
      },
    ],
    where: {
      websiteId,
      createdAt: {
        [Op.between]: [dateRange.start, dateRange.end],
      },
      // ❌ This is probably your mistake:
      // 'items.id': { [Op.ne]: null },

      // ✅ Replace it with:
      "$CartItems.id$": { [Op.ne]: null },
      "$Order.id$": null,
    },
  });

  const convertedCarts = await Order.count({
    where: {
      websiteId,
      orderType: "online",
      createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
    },
    include: [
      {
        model: Cart,
        required: true,
        where: {
          createdAt: { [Op.between]: [dateRange.start, dateRange.end] },
        },
      },
    ],
  });

  const conversionRate =
    abandonedCarts === 0
      ? 0
      : (convertedCarts / (abandonedCarts + convertedCarts)) * 100;

  return { abandonedCarts, convertedCarts, conversionRate };
}

async function getRecoveredRevenue(websiteId, dateRange) {
  const result = await Payment.sum('amount', {
    where: {
      isRecovered: true,
      createdAt: { [Op.between]: [dateRange.start, dateRange.end] }
    },
    include: [{
      model: Order,
      where: { websiteId },
      attributes: []
    }]
  });
  return result || 0;
}

async function getPotentialRevenue(websiteId, dateRange) {
  // Sum of Pending Orders (that have a pending payment)
  const result = await Order.sum('totalAmount', {
    where: {
      websiteId,
      status: { [Op.in]: ['pending', 'confirmed'] }, // Confirmed but not paid yet? Depends on logic. Usually 'pending'.
      createdAt: { [Op.between]: [dateRange.start, dateRange.end] }
    },
    include: [{
      model: Payment,
      as: 'Payment',
      where: { status: 'pending' },
      attributes: [],
      required: true // Only count orders that HAVE a pending payment attempt
    }]
  });
  return result || 0;
}

// Admin-only mock functions
async function getPlatformWideStats() {
  const totalOrders = await Order.count();
  const totalRevenue = await Order.sum("totalAmount");
  return { totalOrders, totalRevenue };
}

async function getTopPerformers() {
  return Product.findAll({
    attributes: [
      "id",
      "name",
      [
        Sequelize.literal(
          "(SELECT SUM(`quantity`) FROM `OrderItems` WHERE `OrderItems`.`productId` = `Product`.`id`)"
        ),
        "totalSold",
      ],
    ],
    order: [[Sequelize.literal("totalSold"), "DESC"]],
    limit: 5,
  });
}

async function calculateLTV() {
  return Order.findAll({
    attributes: [
      "userId",
      [
        Sequelize.fn(
          "SUM",
          Sequelize.literal(
            `CASE 
            WHEN Orders.status = 'cancelled' THEN 0
            WHEN Payments.status = 'refunded' THEN 0
            ELSE totalAmount 
          END`
          )
        ),
        "ltv",
      ],
    ],
    include: [
      {
        model: Payment,
        attributes: [],
      },
    ],
    group: ["userId"],
    order: [[Sequelize.fn("SUM", Sequelize.col("totalAmount")), "DESC"]],
    limit: 5,
  });
}

// async function getMerchantHealthStats() {
//   const merchantCount = await Website.count();
//   const activeMerchants = await Website.count({ where: { updatedAt: { [Op.gt]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } });
//   return {
//     merchantCount,
//     activeMerchants,
//     engagementRate: (activeMerchants / merchantCount) * 100
//   };
// }

// ======================
// UTILITIES
// ======================

function getDateRange(period) {
  const now = new Date();
  let start = new Date();

  switch (period) {
    case "14d":
      start.setDate(end.getDate() - 14);
      break;
    case "24h":
      start.setHours(now.getHours() - 24);
      break;
    case "7d":
      start.setDate(now.getDate() - 7);
      break;
    case "30d":
      start.setDate(now.getDate() - 30);
      break;
    case "90d":
      start.setDate(now.getDate() - 90);
      break;
    default:
      start.setDate(end.getDate() - 7);
      break;
  }

  return { start, end: now };
}

function handleStatsError(res, error) {
  console.error(error);
  res
    .status(500)
    .json({ error: "Internal Server Error", details: error.message });
}
