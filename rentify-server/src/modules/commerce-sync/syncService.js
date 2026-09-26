const { Website } = require('../../models');
const axios = require('axios')
const { ecommerceApiUrl } = require('../../config/runtimeUrls');
class SyncService {
  async replicateWebsiteData(websiteId) {
    const website = await Website.findByPk(websiteId, {
      include: [WebsiteTemplate],
    });

    // Send to e-commerce server
    await axios.post(`${ecommerceApiUrl}/api/website-data`, {
      websiteUUID: website.domain, // Use domain as unique ID
      platformWebsiteId: website.id,
      userId: website.userId,
    }, { headers: { 'x-rentify-service-token': process.env.SERVICE_TO_SERVICE_TOKEN } });
  }
}
module.exports = new SyncService();
