const express = require('express');
const { handleWebhook } = require('../controllers/webhookController');

const router = express.Router();

router.post('/stripe', express.raw({ type: 'application/json' }), handleWebhook);

module.exports = router;
