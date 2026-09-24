const bcrypt = require("bcrypt");
const { User, Website, WebsiteTemplate } = require("../models");

exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.id;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is being changed to one that's already in use
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already in use' });
      }
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();

    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage,
      role: user.role,
      isVerified: user.isVerified
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
      return res.status(400).json({ message: 'All fields are required' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
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
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUser = async (req, res) => {
      try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'phoneNumber', 'profileImage', 'role', 'isVerified'],
      include: [
        {
          model: Website,
          include: [
            {
              model: WebsiteTemplate,
              attributes: ['id', 'name'] // You can include other attributes if needed
            }
          ]
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Remove token generation here
    res.status(200).json( user );
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}
