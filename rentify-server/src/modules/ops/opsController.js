const { Op } = require("sequelize");
const { ReminderLog, OutcomeContract, Website, Staff } = require("../../models");
const { fetchInvoiceFacts } = require("./opsInvoiceFactsService");
const { toPhnomDateString, isPaidOnTime } = require("./timezone");

const parseDateParam = (value, fallback) => {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const buildPagination = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

const assertWebsiteAccess = async (req, websiteId) => {
  if (req.user?.role === "admin") {
    return;
  }
  if (req.user) {
    if (!websiteId) {
      throw new Error("websiteId is required");
    }
    const website = await Website.findByPk(websiteId);
    if (!website || website.userId !== req.user.id) {
      throw new Error("Forbidden");
    }
    return;
  }
  if (req.staff) {
    if (!websiteId || req.staff.websiteId !== websiteId) {
      throw new Error("Forbidden");
    }
  }
};

exports.getReminderLogs = async (req, res) => {
  try {
    const {
      websiteId,
      status,
      reminderType,
      from,
      to,
      page = 1,
      limit = 20,
    } = req.query;

    const where = {};
    await assertWebsiteAccess(req, websiteId);
    if (websiteId) where.websiteId = websiteId;
    if (status) where.status = status;
    if (reminderType) where.reminderType = reminderType;

    const fromDate = parseDateParam(from, null);
    const toDate = parseDateParam(to, null);
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt[Op.gte] = fromDate;
      if (toDate) where.createdAt[Op.lte] = toDate;
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);

    const result = await ReminderLog.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
    });

    res.json({
      data: result.rows,
      meta: buildPagination(pageNum, limitNum, result.count),
    });
  } catch (error) {
    res.status(error.message === "Forbidden" ? 403 : 500).json({
      error:
        error.message === "Forbidden"
          ? "Forbidden"
          : "Failed to fetch reminder logs",
    });
  }
};

exports.getOutcomeSummary = async (req, res) => {
  try {
    const { websiteId, from, to } = req.query;
    if (!websiteId) {
      return res.status(400).json({ error: "websiteId is required" });
    }
    await assertWebsiteAccess(req, websiteId);

    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fromDate = parseDateParam(from, defaultFrom);
    const toDate = parseDateParam(to, now);

    const invoices = await fetchInvoiceFacts({
      websiteId,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    });

    const totalInvoices = invoices.length;
    const todayStr = toPhnomDateString(now);
    let paidOnTime = 0;
    let paidTotal = 0;
    let overdueUnpaid = 0;

    const paidInvoices = [];

    invoices.forEach((invoice) => {
      if (invoice.isPaid) {
        paidTotal += 1;
        paidInvoices.push(invoice);
        if (isPaidOnTime(invoice.paidAt, invoice.dueDate)) {
          paidOnTime += 1;
        }
      } else if (invoice.dueDate) {
        const dueStr = toPhnomDateString(invoice.dueDate);
        if (dueStr && todayStr && dueStr < todayStr) {
          overdueUnpaid += 1;
        }
      }
    });

    const invoiceIds = paidInvoices.map((i) => i.id);
    let reminderEffectiveness = {
      totalRemindersSent: 0,
      paidWithin24h: 0,
      rate: 0,
    };

    if (invoiceIds.length) {
      const reminderLogs = await ReminderLog.findAll({
        where: {
          invoiceId: { [Op.in]: invoiceIds },
          status: "sent",
        },
        order: [["createdAt", "DESC"]],
      });

      reminderEffectiveness.totalRemindersSent = reminderLogs.length;
      const latestReminderByInvoice = new Map();
      reminderLogs.forEach((log) => {
        if (!latestReminderByInvoice.has(log.invoiceId)) {
          latestReminderByInvoice.set(log.invoiceId, log);
        }
      });

      paidInvoices.forEach((invoice) => {
        const log = latestReminderByInvoice.get(invoice.id);
        if (!log || !invoice.paidAt) return;
        const diffMs = new Date(invoice.paidAt) - new Date(log.createdAt);
        if (diffMs >= 0 && diffMs <= 24 * 60 * 60 * 1000) {
          reminderEffectiveness.paidWithin24h += 1;
        }
      });

      reminderEffectiveness.rate =
        reminderEffectiveness.totalRemindersSent === 0
          ? 0
          : reminderEffectiveness.paidWithin24h /
            reminderEffectiveness.totalRemindersSent;
    }

    const onTimeRate =
      totalInvoices === 0 ? 0 : paidOnTime / totalInvoices;
    const overdueRate =
      totalInvoices === 0 ? 0 : overdueUnpaid / totalInvoices;

    res.json({
      data: {
        totalInvoices,
        paidTotal,
        paidOnTime,
        onTimeRate,
        overdueUnpaid,
        overdueRate,
        reminderEffectiveness,
        range: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        },
      },
    });
  } catch (error) {
    res.status(error.message === "Forbidden" ? 403 : 500).json({
      error:
        error.message === "Forbidden"
          ? "Forbidden"
          : "Failed to compute outcome summary",
    });
  }
};

exports.getAtRiskInvoices = async (req, res) => {
  try {
    const { websiteId, dueSoonDays = 3, from, to } = req.query;
    if (!websiteId) {
      return res.status(400).json({ error: "websiteId is required" });
    }
    await assertWebsiteAccess(req, websiteId);

    const now = new Date();
    const dueSoonWindowMs = parseInt(dueSoonDays, 10) * 24 * 60 * 60 * 1000;
    const dueSoonCutoff = new Date(now.getTime() + dueSoonWindowMs);

    const defaultFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const fromDate = parseDateParam(from, defaultFrom);
    const toDate = parseDateParam(to, dueSoonCutoff);

    const invoices = await fetchInvoiceFacts({
      websiteId,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    });

    const todayStr = toPhnomDateString(now);
    const dueSoonStr = toPhnomDateString(dueSoonCutoff);

    const overdue = [];
    const dueSoon = [];

    invoices.forEach((invoice) => {
      if (invoice.isPaid || !invoice.dueDate) return;
      const dueStr = toPhnomDateString(invoice.dueDate);
      if (!dueStr || !todayStr) return;
      if (dueStr < todayStr) {
        overdue.push(invoice);
      } else if (dueSoonStr && dueStr <= dueSoonStr) {
        dueSoon.push(invoice);
      }
    });

    const atRiskIds = [...overdue, ...dueSoon].map((i) => i.id);
    const reminderLogs = atRiskIds.length
      ? await ReminderLog.findAll({
          where: { invoiceId: { [Op.in]: atRiskIds } },
          order: [["createdAt", "DESC"]],
        })
      : [];

    const lastReminderByInvoice = new Map();
    reminderLogs.forEach((log) => {
      if (!lastReminderByInvoice.has(log.invoiceId)) {
        lastReminderByInvoice.set(log.invoiceId, log);
      }
    });

    const attachReminder = (invoice) => ({
      ...invoice,
      lastReminder: lastReminderByInvoice.get(invoice.id) || null,
    });

    res.json({
      data: {
        overdue: overdue.map(attachReminder),
        dueSoon: dueSoon.map(attachReminder),
      },
      meta: {
        dueSoonDays: parseInt(dueSoonDays, 10),
        counts: {
          overdue: overdue.length,
          dueSoon: dueSoon.length,
        },
      },
    });
  } catch (error) {
    res.status(error.message === "Forbidden" ? 403 : 500).json({
      error:
        error.message === "Forbidden"
          ? "Forbidden"
          : "Failed to fetch at-risk invoices",
    });
  }
};

exports.pauseContract = async (req, res) => {
  try {
    const contract = await OutcomeContract.findByPk(req.params.id);
    if (!contract) {
      return res.status(404).json({ error: "Contract not found" });
    }
    await assertWebsiteAccess(req, contract.websiteId);

    await contract.update({
      status: "paused",
      isActive: false,
      pausedAt: new Date(),
      effectiveTo: new Date(),
    });

    res.json({ data: contract });
  } catch (error) {
    res.status(error.message === "Forbidden" ? 403 : 500).json({
      error:
        error.message === "Forbidden"
          ? "Forbidden"
          : "Failed to pause contract",
    });
  }
};

exports.resumeContract = async (req, res) => {
  try {
    const contract = await OutcomeContract.findByPk(req.params.id);
    if (!contract) {
      return res.status(404).json({ error: "Contract not found" });
    }
    await assertWebsiteAccess(req, contract.websiteId);

    await contract.update({
      status: "active",
      isActive: true,
      pausedAt: null,
      effectiveFrom: new Date(),
    });

    res.json({ data: contract });
  } catch (error) {
    res.status(error.message === "Forbidden" ? 403 : 500).json({
      error:
        error.message === "Forbidden"
          ? "Forbidden"
          : "Failed to resume contract",
    });
  }
};
