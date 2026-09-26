const { UsageEvent } = require("../../models");
const { recordStoreViewEvent } = require("./usageEventService");

const isBot = (userAgent = "") => {
  const ua = userAgent.toLowerCase();
  return ua.includes("bot") || ua.includes("spider") || ua.includes("crawler");
};

exports.trackStoreView = async (req, res) => {
  try {
    const { websiteId, sessionId } = req.body;
    if (!websiteId || !sessionId) {
      return res.status(400).json({ error: "websiteId and sessionId required" });
    }

    const userAgent = req.headers["user-agent"] || "";
    if (isBot(userAgent)) {
      return res.json({ status: "ignored" });
    }

    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip;

    await recordStoreViewEvent({
      websiteId,
      sessionId,
      userAgent,
      ip,
      occurredAt: new Date(),
    });

    res.json({ status: "tracked" });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.json({ status: "duplicate" });
    }
    res.status(500).json({ error: "Failed to track store view" });
  }
};
