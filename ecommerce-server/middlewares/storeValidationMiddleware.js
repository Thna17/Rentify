const axios = require("axios");
const { RENTIFY_API_BASE } = require("../config/serviceUrls");

const storeValidationMiddleware = async (req, res, next) => {
  const storeId =
    req.body.storeId ||
    req.params.storeId ||
    req.params.websiteId ||
    req.body.websiteId;
  if (!storeId) return res.status(400).json({ error: "Store ID required" });

  try {
    const response = await axios.get(
      `${RENTIFY_API_BASE}/api/websites/validate/${storeId}`
    );

    if (!response.data.valid) {
      return res
        .status(400)
        .json({ error: "Invalid website: " + response.data.error });
    }

    req.website = { id: storeId, userId: response.data.userId };
    next();
  } catch (error) {
    res
      .status(500)
      .json({ error: "Website validation failed: " + error.message });
  }
};

module.exports = storeValidationMiddleware;
