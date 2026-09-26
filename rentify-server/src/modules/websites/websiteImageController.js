// Uploads a website image and, for a logo or onboarding cover, stores it in the
// website's content. The upload itself is done by the media module.
const { uploadProductImages } = require('../media').uploadController;

exports.uploadImage = async (req, res) => {
  const originalJson = res.json.bind(res);
  res.json = async (payload) => {
    const uploaded = payload?.images?.[0];
    if (uploaded && (req.query.isLogo === 'true' || req.query.type === 'logo')) {
      try {
        const { WebsiteContent } = require('../../models');
        const websiteId = req.params.websiteId || req.website?.id;
        if (websiteId) {
          const [logoContent] = await WebsiteContent.findOrCreate({
            where: { websiteId, category: 'Header', label: 'Logo' },
            defaults: { type: 'image', value: { url: uploaded.url } },
          });
          if (logoContent) {
            logoContent.value = { url: uploaded.url };
            logoContent.type = 'image';
            await logoContent.save();
          }
          const cache = require('../../utils/cache');
          if (cache && cache.invalidateWebsiteCache) {
            await cache.invalidateWebsiteCache(websiteId);
          }
        }
      } catch (err) {
        console.warn('Failed to associate uploaded logo with website:', err);
      }
    }
    // A cover chosen during onboarding replaces the template's stock banner photos
    if (uploaded && req.query.type === 'cover') {
      try {
        const { WebsiteContent } = require('../../models');
        const websiteId = req.params.websiteId || req.website?.id;
        if (websiteId) {
          const existing = await WebsiteContent.findOne({ where: { websiteId, label: 'Hero Image' } });
          if (existing) {
            existing.value = [uploaded.url];
            await existing.save();
          } else {
            await WebsiteContent.create({
              websiteId,
              category: 'Hero',
              label: 'Hero Image',
              type: 'image[]',
              value: [uploaded.url],
            });
          }
          const cache = require('../../utils/cache');
          if (cache && cache.invalidateWebsiteCache) {
            await cache.invalidateWebsiteCache(websiteId);
          }
        }
      } catch (err) {
        console.warn('Failed to associate uploaded cover with website:', err);
      }
    }
    if (uploaded) return originalJson(uploaded);
    return originalJson(payload);
  };
  return uploadProductImages(req, res);
};
