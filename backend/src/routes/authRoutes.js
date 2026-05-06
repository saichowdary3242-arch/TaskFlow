const express = require('express');
const { body } = require('express-validator');
const { signup, login, getMe, listUsers } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { requireGlobalAdmin } = require('../middleware/rbac');

const router = express.Router();

// POST /api/auth/signup
router.post(
  '/signup',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  signup
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  login
);

// GET /api/auth/me
router.get('/me', authenticate, getMe);

// GET /api/auth/users  (any authenticated user — needed for task assignment)
router.get('/users', authenticate, listUsers);

module.exports = router;
