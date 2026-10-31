const bcrypt = require("bcrypt");
const { User, Website, WebsiteTemplate, Store } = require("../../models");

exports.updateProfile = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      phoneNumber,
      bio,
      website,
      avatar,
      profileImage,
      businessName,
      storeName,
    } = req.body;
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

    // Update user fields
    if (name !== undefined) user.name = name.trim();
    if (email !== undefined) user.email = email.trim();

    const newPhone = phoneNumber !== undefined ? phoneNumber : phone;
    if (newPhone !== undefined) {
      const cleanPhone = String(newPhone || '').trim();
      user.phoneNumber = cleanPhone || null;
    }

    if (bio !== undefined) user.bio = String(bio || '').trim() || null;
    if (website !== undefined) user.website = String(website || '').trim() || null;

    // Handle profile photo / avatar
    let avatarUrl = avatar !== undefined ? avatar : profileImage;
    if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.startsWith('data:image')) {
      try {
        const { cloudinaryUploadService } = require('../media');
        const matches = avatarUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
        if (matches) {
          const buffer = Buffer.from(matches[2], 'base64');
          const uploaded = await cloudinaryUploadService.uploadBuffer(buffer, {
            folder: `rentify/users/${user.id}/avatar`,
          });
          avatarUrl = uploaded.url;
        }
      } catch (uploadErr) {
        console.warn('Failed to upload base64 avatar to storage:', uploadErr.message);
      }
    }
    if (avatarUrl !== undefined) {
      if (!avatarUrl || typeof avatarUrl !== 'string' || !avatarUrl.startsWith('data:image')) {
        user.profileImage = avatarUrl || null;
      }
    }

    await user.save();

    // If businessName / storeName was changed and user owns a store, update store name
    const newStoreName = (businessName !== undefined ? businessName : storeName)?.trim();
    if (newStoreName && user.role !== 'staff') {
      try {
        const store = await Store.findOne({ where: { ownerUserId: user.id } });
        if (store && store.name !== newStoreName) {
          store.name = newStoreName;
          await store.save();
          const storeSyncService = require('../commerce-sync').storeSyncService;
          if (storeSyncService?.syncStore) {
            storeSyncService.syncStore(store.id).catch(() => {});
          }
        }
      } catch (storeErr) {
        console.warn('Failed to update store name with profile:', storeErr.message);
      }
    }

    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      phone: user.phoneNumber,
      bio: user.bio,
      website: user.website,
      profileImage: user.profileImage,
      avatar: user.profileImage,
      role: user.role,
      isVerified: user.isVerified,
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
      attributes: [
        'id',
        'name',
        'email',
        'phoneNumber',
        'bio',
        'website',
        'profileImage',
        'role',
        'isVerified',
      ],
      include: [
        {
          model: Website,
          include: [
            {
              model: WebsiteTemplate,
              attributes: ['id', 'name'],
            },
          ],
        },
        {
          model: Store,
          as: 'store',
          attributes: ['id', 'name', 'slug', 'primaryCategory', 'logoUrl', 'marketplaceColor', 'status'],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = user.toJSON();
    userData.phone = user.phoneNumber;
    userData.avatar = user.profileImage;
    if (userData.store) {
      userData.businessName = userData.store.name;
    }

    res.status(200).json(userData);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
