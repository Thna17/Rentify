// orderRetrieval/strategies/POSOrdersStrategy.js
const BaseRetrievalStrategy = require('./BaseRetrievalStrategy');
const { Op } = require('sequelize');

class POSOrdersStrategy extends BaseRetrievalStrategy {
  async execute(req, res) {
    try {
      const rawWebsiteId = req.params.websiteId || req.query?.websiteId || req.store?.websiteId;
      const rawStoreId = req.params.storeId || req.query?.storeId || req.store?.storeId;

      let effectiveWebsiteId = null;
      let effectiveStoreId = rawStoreId || null;

      if (rawWebsiteId) {
        const website = await this.models.WebsiteData.findOne({
          where: { websiteId: rawWebsiteId },
          attributes: ['storeId', 'websiteId'],
        });
        if (website) {
          effectiveWebsiteId = website.websiteId;
          effectiveStoreId = effectiveStoreId || website.storeId;
        } else {
          const store = await this.models.StoreAccess.findByPk(rawWebsiteId);
          if (store) {
            effectiveStoreId = store.storeId;
            effectiveWebsiteId = store.websiteId || null;
          }
        }
      }

      if (!effectiveStoreId && rawStoreId) {
        const store = await this.models.StoreAccess.findByPk(rawStoreId);
        if (store) {
          effectiveStoreId = store.storeId;
          effectiveWebsiteId = store.websiteId || null;
        }
      }

      const conditions = [];
      if (effectiveStoreId) conditions.push({ storeId: effectiveStoreId });
      if (effectiveWebsiteId) conditions.push({ websiteId: effectiveWebsiteId });

      const where = {
        orderType: 'pos',
        ...(conditions.length > 1
          ? { [Op.or]: conditions }
          : conditions[0] || (rawWebsiteId ? { websiteId: rawWebsiteId } : {})),
      };

      const orders = await this.models.Order.findAll({
        where,
        include: this.includeCommon,
        order: [['createdAt', 'DESC']],
      });

      const formattedOrders = orders.map(order => ({
        id: order.id,
        status: order.status,
        paymentMethod: order.Payment?.paymentMethod,
        totalAmount: order.totalAmount,
        orderDate: order.createdAt,
        paymentStatus: order.Payment?.status,
        items: (order.OrderItems || []).map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          product: item.Product ? {
            id: item.Product.id,
            name: item.Product.name,
            price: item.Product.price,
            sku: item.Product.sku,
            image: item.Product.images?.[0]?.url
          } : null
        }))
      }));

      res.json({
        totalOrders: formattedOrders.length,
        orders: formattedOrders
      });
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch POS orders');
    }
  }
}

module.exports = POSOrdersStrategy;