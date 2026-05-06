const { validationResult } = require('express-validator');
const pool = require('../config/db');

// GET /api/user-tasks - Get all user tasks (admin sees all, users see theirs)
const getUserTasks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const { assigned_to, status } = req.query;

    let query, params;

    if (isAdmin) {
      // Admin can see all tasks or filter by user
      let conditions = [];
      let idx = 1;

      if (assigned_to) {
        conditions.push(`ut.assigned_to = $${idx++}`);
        params = [assigned_to];
      } else {
        params = [];
      }

      if (status) {
        conditions.push(`ut.status = $${idx++}`);
        params.push(status);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      query = `
        SELECT ut.*, 
               u1.name AS assigned_to_name, u1.email AS assigned_to_email, u1.avatar_color AS assigned_to_color,
               u2.name AS created_by_name
        FROM user_tasks ut
        LEFT JOIN users u1 ON u1.id = ut.assigned_to
        LEFT JOIN users u2 ON u2.id = ut.created_by
        ${whereClause}
        ORDER BY ut.created_at DESC
      `;
    } else {
      // Regular users see only their tasks
      let conditions = ['ut.assigned_to = $1'];
      let params = [userId];
      let idx = 2;

      if (status) {
        conditions.push(`ut.status = $${idx++}`);
        params.push(status);
      }

      query = `
        SELECT ut.*, 
               u1.name AS assigned_to_name, u1.email AS assigned_to_email, u1.avatar_color AS assigned_to_color,
               u2.name AS created_by_name
        FROM user_tasks ut
        LEFT JOIN users u1 ON u1.id = ut.assigned_to
        LEFT JOIN users u2 ON u2.id = ut.created_by
        WHERE ${conditions.join(' AND ')}
        ORDER BY ut.created_at DESC
      `;
    }

    const result = await pool.query(query, params);
    res.json({ tasks: result.rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/user-tasks - Create a task for a user (admin only)
const createUserTask = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, description, assigned_to, priority, due_date } = req.body;
    const created_by = req.user.id;

    // DEBUG LOG
    const fs = require('fs');
    fs.appendFileSync('debug_tasks.log', `Received: ${JSON.stringify(req.body)}\n`);

    // Validate assigned_to user exists
    const userCheck = await pool.query('SELECT id, name FROM users WHERE id = $1', [assigned_to]);
    if (userCheck.rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const result = await pool.query(
      `INSERT INTO user_tasks (title, description, assigned_to, created_by, status, priority, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        title.trim(),
        description || '',
        assigned_to,
        created_by,
        'pending',
        priority || 'medium',
        (due_date && due_date !== '') ? due_date : null,
      ]
    );

    // Fetch with joined user info
    const taskResult = await pool.query(
      `SELECT ut.*, 
              u1.name AS assigned_to_name, u1.email AS assigned_to_email, u1.avatar_color AS assigned_to_color,
              u2.name AS created_by_name
       FROM user_tasks ut
       LEFT JOIN users u1 ON u1.id = ut.assigned_to
       LEFT JOIN users u2 ON u2.id = ut.created_by
       WHERE ut.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({ task: taskResult.rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /api/user-tasks/:id - Update task status (user can update their tasks, admin can update any)
const updateUserTask = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { title, description, status, priority, due_date } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Check if task exists and user has permission
    const taskCheck = await pool.query('SELECT * FROM user_tasks WHERE id = $1', [id]);
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskCheck.rows[0];

    // Only assigned user or admin can update
    if (!isAdmin && task.assigned_to !== userId) {
      return res.status(403).json({ error: 'You can only update your own tasks' });
    }

    const result = await pool.query(
      `UPDATE user_tasks SET
         title       = COALESCE($1, title),
         description = COALESCE($2, description),
         status      = COALESCE($3, status),
         priority    = COALESCE($4, priority),
         due_date    = $5
       WHERE id = $6
       RETURNING *`,
      [title, description, status, priority, (due_date && due_date !== '') ? due_date : null, id]
    );

    // Fetch with joined user info
    const taskResult = await pool.query(
      `SELECT ut.*, 
              u1.name AS assigned_to_name, u1.email AS assigned_to_email, u1.avatar_color AS assigned_to_color,
              u2.name AS created_by_name
       FROM user_tasks ut
       LEFT JOIN users u1 ON u1.id = ut.assigned_to
       LEFT JOIN users u2 ON u2.id = ut.created_by
       WHERE ut.id = $1`,
      [id]
    );

    res.json({ task: taskResult.rows[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/user-tasks/:id - Delete a task (admin only)
const deleteUserTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM user_tasks WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getUserTasks, createUserTask, updateUserTask, deleteUserTask };