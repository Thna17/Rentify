// middleware/limitMiddleware.js
const { Website, Staff } = require('../models');

const limitMiddleware = (resource) => {
  return async (req, res, next) => {
    try {
      const website = await Website.findByPk(req.website.id);
      
      if (!website.limits || website.limits[resource] === undefined) {
        return next();
      }

      const limit = website.limits[resource];
      
      // Unlimited resource
      if (limit === -1) return next();

      let currentUsage;
      switch (resource) {
        case 'staff':
          currentUsage = await Staff.count({ where: { websiteId: website.id }});
          break;
        case 'storage':
          currentUsage = await File.sum('size', { 
            where: { websiteId: website.id }
          }) || 0;
          break;
        // Add other resources here
        default:
          return next();
      }

      const requestedAmount = req[`${resource}Amount`] || 1;

      if (currentUsage + requestedAmount > limit) {
        return res.status(403).json({
          error: `You've reached your ${resource} limit (${limit}). Upgrade your plan to increase limits.`
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = limitMiddleware;