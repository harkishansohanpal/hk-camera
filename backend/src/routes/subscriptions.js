const { Router } = require('express');
const { authenticate, requireAdmin, requireNotDemo } = require('../middleware/auth');
const { listPlans, getMySubscription, createCheckoutSession, createPortalSession, cancelSubscription, seedPlans } = require('../controllers/subscriptionController');

const router = Router();

router.get('/plans', listPlans);
router.get('/mine', authenticate, getMySubscription);
router.post('/checkout', authenticate, requireNotDemo, createCheckoutSession);
router.post('/portal', authenticate, requireNotDemo, createPortalSession);
router.post('/cancel', authenticate, requireNotDemo, cancelSubscription);
router.post('/seed', authenticate, requireAdmin, seedPlans);

module.exports = router;
