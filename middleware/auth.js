function requireAuth(req, res, next) {
  const userId = req.cookies.userId;
  const username = req.cookies.username;
  const role = req.cookies.role;

  if (!userId || !username) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please login first.'
    });
  }

  req.user = {
    id: userId,
    username: username,
    role: role || 'user'
  };

  next();
}

function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      error: 'Admin access required.'
    });
  }
}

module.exports = {
  requireAuth,
  requireAdmin
};