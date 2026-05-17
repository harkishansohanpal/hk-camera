const { Router } = require('express');
const express = require('express');
const { handleWebhook } = require('../controllers/webhookController');

const router = Router();

router.post('/stripe', express.raw({ type: 'application/json' }), handleWebhook);

module.exports = router;
