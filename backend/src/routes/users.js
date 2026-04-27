const { Router } = require('express');
const { body } = require('express-validator');
const { updateProfile, changePassword, deleteAccount } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = Router();
router.use(authenticate);

router.patch(
  '/me',
  [body('name').optional().trim().notEmpty()],
  validate,
  updateProfile
);

router.patch(
  '/me/password',
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
  ],
  validate,
  changePassword
);

router.delete('/me', deleteAccount);

module.exports = router;
