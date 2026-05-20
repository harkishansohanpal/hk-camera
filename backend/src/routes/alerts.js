const { Router } = require('express');
const { body } = require('express-validator');
const { listAlerts, motionAlert, markRead, markAllRead, deleteAlert } = require('../controllers/alertController');
const { authenticate, requireNotDemo } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = Router();
router.use(authenticate);

router.get('/', listAlerts);
router.post('/motion', [body('cameraId').notEmpty()], validate, motionAlert);
router.patch('/read-all', markAllRead);
router.patch('/:alertId/read', markRead);
router.delete('/:alertId', requireNotDemo, deleteAlert);

module.exports = router;
