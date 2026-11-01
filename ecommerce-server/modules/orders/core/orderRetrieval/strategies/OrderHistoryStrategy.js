const { normalizePaymentMethod, normalizePaymentStatus } = require('../../../../payments').paymentUtils;
// orderRetrieval/strategies/OrderHistoryStrategy.js
const BaseRetrievalStrategy = require('./BaseRetrievalStrategy');

class OrderHistoryStrategy extends BaseRetrievalStrategy {
  async execute(req, res) {
    try {
      const { websiteId } = req.params;
      const { status, channel, page = 1, limit = 10 } = req.query;
      const { Op } = require('sequelize');
      
      const validStatuses = ['pending', 'confirmed', 'processing', 'completed', 'fulfilled', 'shipped', 'delivered', 'cancelled', 'refunded'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status filter' });
      }

      let effectiveStoreId = null;
      if (websiteId && this.models.WebsiteData) {
        const website = await this.models.WebsiteData.findOne({
          where: { websiteId },
          attributes: ['storeId'],
        });
        if (website?.storeId) effectiveStoreId = website.storeId;
      }

      const conditions = [];
      if (websiteId) conditions.push({ websiteId });
      if (effectiveStoreId) conditions.push({ storeId: effectiveStoreId });

      const where = conditions.length > 1
        ? { [Op.or]: conditions }
        : (conditions[0] || { websiteId });
      if (status) where.status = status;
      if (channel) {
        if (channel === 'pos') {
          where[Op.and] = [
            ...(where[Op.and] || []),
            { [Op.or]: [{ salesChannel: 'pos' }, { orderType: 'pos' }] }
          ];
        } else if (channel === 'marketplace') {
          where.salesChannel = 'marketplace';
        } else if (channel === 'storefront') {
          where[Op.and] = [
            ...(where[Op.and] || []),
            {
              salesChannel: { [Op.in]: ['storefront', null] },
              orderType: { [Op.ne]: 'pos' }
            }
          ];
        }
      }

      const orders = await this.models.Order.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: (page - 1) * limit,
        include: this.includeCommon,
        order: [['createdAt', 'DESC']],
      });

      const formattedOrders = orders.rows.map(order => ({
        id: order.id,
        status: order.status,
        paymentMethod: normalizePaymentMethod(order.Payment?.paymentMethod),
        totalAmount: order.totalAmount,
        orderDate: order.createdAt,
        paymentStatus: normalizePaymentStatus(order.Payment?.status),
        orderType: order.orderType,
        salesChannel: order.salesChannel || (order.orderType === 'pos' ? 'pos' : (order.orderType === 'manual' ? 'invoice' : 'storefront')),
        items: order.OrderItems,
        shippingDetails: order.shippingDetail || order.ShippingDetail || order.shippingInfo || order.customerInfo
      }));

      res.json({
        totalOrders: orders.count,
        totalPages: Math.ceil(orders.count / limit),
        currentPage: parseInt(page),
        orders: formattedOrders
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }
}

module.exports = OrderHistoryStrategy;