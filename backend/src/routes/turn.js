const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { getTurnCredentials } = require('../controllers/turnController');

const router = Router();

// Any logged-in user can fetch fresh TURN credentials
router.get('/', authenticate, getTurnCredentials);

module.exports = router;
