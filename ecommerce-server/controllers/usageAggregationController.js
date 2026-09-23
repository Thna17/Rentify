const { getSummary, getBreakdown } = require("../services/usageAggregationService");
const { getBillingSummary } = require("../services/billingService");

exports.getUsageSummary = async (req, res) => {
  try {
    const { websiteId, rangeDays = 7 } = req.query;
    if (!websiteId) {
      return res.status(400).json({ error: "websiteId is required" });
    }

    const summary = await getSummary({
      websiteId,
      rangeDays: Number(rangeDays),
    });

    res.json({
      data: {
        breakdown: summary.breakdown,
        totalCost: summary.totalCost,
        range: {
          from: summary.from.toISOString(),
          to: summary.to.toISOString(),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to compute usage summary" });
  }
};

exports.getUsageBreakdown = async (req, res) => {
  try {
    const { websiteId, from, to, eventType, page = 1, pageSize = 20 } = req.query;
    if (!websiteId || !from || !to) {
      return res.status(400).json({ error: "websiteId, from, to required" });
    }

    const result = await getBreakdown({
      websiteId,
      from: new Date(from),
      to: new Date(to),
      eventType,
      page: Number(page),
      pageSize: Number(pageSize),
    });

    res.json({
      data: result.rows,
      meta: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: result.totalRows,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to compute usage breakdown" });
  }
};

exports.getBillingSummary = async (req, res) => {
  try {
    const { websiteId, month } = req.query;
    if (!websiteId || !month) {
      return res.status(400).json({ error: "websiteId and month required" });
    }

    const summary = await getBillingSummary(websiteId, month);
    res.json({
      data: {
        websiteId: summary.websiteId,
        month: summary.month,
        totalAmount: summary.totalAmount,
        breakdown: summary.breakdown,
        status: summary.status,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to compute billing summary" });
  }
};
