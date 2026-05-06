const pool = require('../config/db');

// Require user to be a global admin
const requireGlobalAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Global admin access required' });
  }
  next();
};

module.exports = { requireGlobalAdmin };
