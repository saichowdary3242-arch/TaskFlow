const express = require('express');
const {
  getDashboardStats, getMyTasksUnified
} = require('../controllers/taskController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// GET /api/dashboard
router.get('/dashboard', getDashboardStats);

// GET /api/my-tasks-unified
router.get('/my-tasks-unified', getMyTasksUnified);

module.exports = router;
