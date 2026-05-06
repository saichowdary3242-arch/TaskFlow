const { validationResult } = require('express-validator');
const pool = require('../config/db');

// GET /api/dashboard  — aggregated stats for current user
const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Task counts
    const taskStats = await pool.query(
      isAdmin
        ? `SELECT
             COUNT(*) AS total_tasks,
             COUNT(*) FILTER (WHERE status = 'pending') AS todo_tasks,
             0 AS in_progress_tasks,
             COUNT(*) FILTER (WHERE status = 'completed') AS done_tasks,
             COUNT(*) FILTER (WHERE due_date < NOW()::DATE AND status != 'completed') AS overdue_tasks
           FROM user_tasks`
        : `SELECT
             COUNT(*) AS total_tasks,
             COUNT(*) FILTER (WHERE status = 'pending') AS todo_tasks,
             0 AS in_progress_tasks,
             COUNT(*) FILTER (WHERE status = 'completed') AS done_tasks,
             COUNT(*) FILTER (WHERE due_date < NOW()::DATE AND status != 'completed') AS overdue_tasks
           FROM user_tasks
           WHERE assigned_to = $1`,
      isAdmin ? [] : [userId]
    );

    // Recent tasks (overdue or due soon)
    const urgentTasks = await pool.query(
      isAdmin
        ? `SELECT ut.id, ut.title, ut.status, ut.priority, ut.due_date, ut.created_at,
                  'Personal Task' AS project_name, '#94a3b8' AS project_color,
                  u.name AS assigned_to_name, u.avatar_color AS assigned_to_color
           FROM user_tasks ut
           LEFT JOIN users u ON u.id = ut.assigned_to
           WHERE ut.status != 'completed'
             AND (ut.due_date <= NOW()::DATE + INTERVAL '3 days' OR ut.priority = 'urgent')
           ORDER BY ut.due_date ASC NULLS LAST, ut.priority ASC
           LIMIT 10`
        : `SELECT ut.id, ut.title, ut.status, ut.priority, ut.due_date, ut.created_at,
                  'Personal Task' AS project_name, '#94a3b8' AS project_color,
                  u.name AS assigned_to_name, u.avatar_color AS assigned_to_color
           FROM user_tasks ut
           LEFT JOIN users u ON u.id = ut.assigned_to
           WHERE ut.status != 'completed'
             AND ut.assigned_to = $1
             AND (ut.due_date <= NOW()::DATE + INTERVAL '3 days' OR ut.priority = 'urgent')
           ORDER BY ut.due_date ASC NULLS LAST, ut.priority ASC
           LIMIT 10`,
      isAdmin ? [] : [userId]
    );

    // My tasks (assigned to me) — only for non-admin
    const myTasks = isAdmin
      ? { rows: [] }
      : await pool.query(
          `SELECT ut.id, ut.title, ut.status, ut.priority, ut.due_date, ut.created_at,
                  'Personal Task' AS project_name, '#94a3b8' AS project_color, ut.assigned_to
           FROM user_tasks ut
           WHERE ut.assigned_to = $1 AND ut.status != 'completed'
           ORDER BY ut.due_date ASC NULLS LAST
           LIMIT 8`,
          [userId]
        );

    res.json({
      projects: { total_projects: 0, active_projects: 0, completed_projects: 0 },
      tasks: taskStats.rows[0],
      urgentTasks: urgentTasks.rows,
      myTasks: myTasks.rows,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/my-tasks-unified — all tasks assigned to current user (or all tasks for admin)
const getMyTasksUnified = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const { status, priority } = req.query;

    let conditions = [];
    let params = [];
    let idx = 1;

    if (!isAdmin) {
      conditions.push(`assigned_to = $${idx++}`);
      params.push(userId);
    }

    if (status) { 
      // Map statuses for compatibility
      if (status === 'todo' || status === 'pending') {
        conditions.push(`(status = 'todo' OR status = 'pending')`);
      } else if (status === 'done' || status === 'completed') {
        conditions.push(`(status = 'done' OR status = 'completed')`);
      } else {
        conditions.push(`status = $${idx++}`); 
        params.push(status);
      }
    }
    if (priority) { conditions.push(`priority = $${idx++}`); params.push(priority); }

    const query = `
      SELECT ut.id, ut.title, ut.description, ut.status, ut.priority, ut.due_date, ut.created_at,
             NULL AS project_id, 'Personal Task' AS project_name, '#94a3b8' AS project_color,
             'user_task' AS task_type, ut.assigned_to, u.name AS assigned_to_name, u.avatar_color AS assigned_to_color
      FROM user_tasks ut
      LEFT JOIN users u ON u.id = ut.assigned_to
      WHERE ${conditions.length > 0 ? conditions.join(' AND ') : 'TRUE'}
      ORDER BY 
        CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
        due_date ASC NULLS LAST,
        created_at DESC
    `;

    const result = await pool.query(query, params);
    res.json({ tasks: result.rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboardStats, getMyTasksUnified };
