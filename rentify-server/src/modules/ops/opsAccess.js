const { verifyAccessToken } = require("../../utils/jwtUtils");
const { User, Staff } = require("../../models");

const OPS_TOKEN = process.env.OPS_TOKEN || "";

const hasStaffOpsAccess = (permissions = []) =>
  permissions.includes("manage_invoices") ||
  permissions.includes("manage_analytics") ||
  permissions.includes("manage_settings");

const opsAccess = async (req, res, next) => {
  const opsToken = req.headers["x-ops-token"];
  if (OPS_TOKEN && opsToken === OPS_TOKEN) {
    return next();
  }

  const userAccessToken = req.cookies?.userAccessToken;
  if (userAccessToken) {
    try {
      const decoded = verifyAccessToken(userAccessToken);
      const user = await User.findByPk(decoded.id);
      if (user?.role === "admin") {
        req.user = user;
        return next();
      }
    } catch (error) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const staffAccessToken = req.cookies?.staffAccessToken;
  if (staffAccessToken) {
    try {
      const decoded = verifyAccessToken(staffAccessToken);
      const staff = await Staff.findByPk(decoded.id);
      if (staff && hasStaffOpsAccess(staff.permissions || [])) {
        req.staff = staff;
        return next();
      }
    } catch (error) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  return res.status(403).json({ error: "Forbidden" });
};

module.exports = { opsAccess };
