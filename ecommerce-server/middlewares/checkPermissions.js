module.exports = (requiredPermissions) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Merchants (users) have full access
  if (req.user.type === 'user') {
    return next();
  }

  // Staff must have required permissions
  if (req.user.type === 'staff') {
    const hasPermission = requiredPermissions.every(permission => 
      req.user.permissions.includes(permission)
    );

    if (hasPermission) {
      return next();
    }
  }

  res.status(403).json({ error: 'Insufficient permissions' });
};