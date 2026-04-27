const { Router } = require('express');
const { body } = require('express-validator');
const { register, login, refresh, logout, me } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

const router = Router();

router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
  ],
  validate,
  register
);

router.post(
  '/login',
  authLimiter,
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  validate,
  login
);

router.post('/refresh', [body('refreshToken').notEmpty()], validate, refresh);
router.post('/logout', logout);
router.get('/me', authenticate, me);

module.exports = router;
