const { Router } = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { listPlans, getMySubscription, createCheckoutSession, createPortalSession, cancelSubscription, seedPlans } = require('../controllers/subscriptionController');

const router = Router();

router.get('/plans', listPlans);
router.get('/mine', authenticate, getMySubscription);
router.post('/checkout', authenticate, createCheckoutSession);
router.post('/portal', authenticate, createPortalSession);
router.post('/cancel', authenticate, cancelSubscription);
router.post('/seed', authenticate, requireAdmin, seedPlans);

module.exports = router;
