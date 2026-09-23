const bcrypt = require("bcrypt");
const { Customer, Order } = require("../models");
const { updateStock } = require("../services/stockService");
const retryTransaction = require("../utils/retryTransaction");
const { ORDER_STATUS } = require("../utils/constants");

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

  try {
    await retryTransaction(async (t) => {
      const order = await Order.findByPk(orderId, {
        include: ['OrderItems'],
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!order) throw new Error("Order not found");
      
      // Validate order can be cancelled
      const cancellableStatuses = [
        ORDER_STATUS.PENDING,
        ORDER_STATUS.CONFIRMED,
        ORDER_STATUS.PROCESSING
      ];
      
      if (!cancellableStatuses.includes(order.status)) {
        throw new Error("Order cannot be cancelled at this stage");
      }

      // Restore stock if needed
      if (order.stockDeducted) {
        await updateStock(orderId, "restore", t);
      }

      // Update order status
      await order.update(
        { status: ORDER_STATUS.CANCELLED },
        { transaction: t }
      );
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Customer cancel error:", error);
    res.status(400).json({ error: error.message });
  }
};