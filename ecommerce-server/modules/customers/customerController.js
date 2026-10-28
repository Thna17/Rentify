const bcrypt = require("bcrypt");
const { Customer, Order } = require("../../models");
const { updateStock } = require("../inventory").stockService;
const { orderStateMachineService } = require("../orders");
const retryTransaction = require("../../utils/retryTransaction");
const { ORDER_STATUS } = require("../../utils/constants");

exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.id;

    const customer = await Customer.findByPk(userId);
    if (!customer) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if email is being changed to one that's already in use
    if (email && email !== customer.email) {
      const existingCustomer = await Customer.findOne({ where: { email } });
      if (existingCustomer) {
        return res.status(400).json({ message: "Email is already in use" });
      }
    }

    // Update fields
    if (name) customer.name = name;
    if (email) customer.email = email;

    await customer.save();

    res.status(200).json({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      profileImage: customer.profileImage,
      role: customer.role,
      isVerified: customer.isVerified,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const customer = await Customer.findByPk(userId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, customer.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Validate new password
    if (
      newPassword.length < 8 ||
      !/[A-Z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters, include an uppercase letter, and a number.",
      });
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    customer.password = hashedPassword;
    await customer.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCustomer = async (req, res) => {
  try {
    
    const customer = await Customer.findByPk(req.user.id, {
      attributes: [
        "id",
        "name",
        "email",
        "profileImage",
        "isVerified",
        "shippingAddress",
      ],
    });



    if (!customer) {
      return res.status(404).json({ message: "User not found" });
    }
    // Remove token generation here
    res.status(200).json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.cancelOrderByCustomer = async (req, res) => {
  const { orderId } = req.params;
  const user = req.user;

  if (!user || user.type === 'guest') {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const actor = {
      id: user.id,
      type: user.type,
      sessionId: req.sessionId || user.sessionId,
    };
    const idempotencyKey = req.headers?.['idempotency-key'] || req.body?.idempotencyKey || `cancel-cust-${orderId}-${Date.now()}`;
    const correlationId = req.headers?.['x-correlation-id'] || null;

    const order = await Order.findByPk(orderId);
    if (!order) {
      const error = new Error("Order not found");
      error.statusCode = 404;
      throw error;
    }

    // Verify buyer ownership: buyer may cancel only their own order
    const isOwner = (user.type === 'customer' && order.userId === user.id) ||
                    (user.type === 'user' && order.buyerId === user.id) ||
                    (user.sessionId && order.sessionId === user.sessionId);

    if (!isOwner) {
      const error = new Error("Order not found");
      error.statusCode = 404;
      throw error;
    }

    // Reject cross-store / cross-website cancellation if context was supplied
    const targetStoreId = req.params?.storeId || req.query?.storeId || req.body?.storeId;
    if (targetStoreId && order.storeId && order.storeId !== targetStoreId) {
      const error = new Error("Order not found");
      error.statusCode = 404;
      throw error;
    }

    await orderStateMachineService.cancelOrder(orderId, {
      actor,
      reason: req.body?.reason || 'Cancelled by customer',
      idempotencyKey,
      correlationId,
    });

    res.json({ success: true });
  } catch (error) {
    if (error.code === 'UNAUTHORIZED_TRANSITION_ACTOR') {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.status(error.statusCode || 400).json({ error: error.message, code: error.code });
  }
};