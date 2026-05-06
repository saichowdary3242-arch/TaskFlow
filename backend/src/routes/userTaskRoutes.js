const express = require('express');
const { body } = require('express-validator');
const {
  getUserTasks, createUserTask, updateUserTask, deleteUserTask,
} = require('../controllers/userTaskController');
const { authenticate } = require('../middleware/auth');
const { requireGlobalAdmin } = require('../middleware/rbac');

const router = express.Router();

router.use(authenticate);

// GET /api/user-tasks - Get all user tasks (admin sees all, users see theirs)
router.get('/user-tasks', getUserTasks);

// POST /api/user-tasks - Create a task for a user (admin only)
router.post(
  '/user-tasks',
  requireGlobalAdmin,
  [
    body('title').trim().notEmpty().withMessage('Task title is required'),
    body('assigned_to').isUUID().withMessage('Valid user ID is required'),
    body('status').optional().isIn(['pending', 'completed']).withMessage('Invalid status'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
    body('due_date').notEmpty().withMessage('Due date is required').isISO8601().withMessage('Invalid date format'),
  ],
  createUserTask
);

// PUT /api/user-tasks/:id - Update task status
router.put(
  '/user-tasks/:id',
  [
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
    body('status').optional().isIn(['pending', 'completed']).withMessage('Invalid status'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
    body('due_date').optional({ nullable: true }).isISO8601().withMessage('Invalid date format'),
  ],
  updateUserTask
);

// DELETE /api/user-tasks/:id - Delete a task (admin only)
router.delete('/user-tasks/:id', requireGlobalAdmin, deleteUserTask);

module.exports = router;