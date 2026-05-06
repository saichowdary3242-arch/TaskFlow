const pool = require('../config/db');

// Require user to be a global admin
const requireGlobalAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Global admin access required' });
  }
  next();
};

// Require user to be admin of a specific project
const requireProjectAdmin = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const userId = req.user.id;

    // Global admins can do anything
    if (req.user.role === 'admin') return next();

    const result = await pool.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this project' });
    }

    if (result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Project admin access required' });
    }

    next();
  } catch (err) {
    next(err);
  }
};

// Require user to be a member of a project (any role)
const requireProjectMember = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const userId = req.user.id;

    // Global admins can do anything
    if (req.user.role === 'admin') return next();

    const result = await pool.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this project' });
    }

    req.projectRole = result.rows[0].role;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireGlobalAdmin, requireProjectAdmin, requireProjectMember };
