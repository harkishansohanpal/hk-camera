const express = require('express');
const { triggerReport } = require('../services/reportScheduler');

const router = express.Router();

router.post('/trigger', (req, res) => {
  const { reason } = req.body;
  triggerReport(reason || 'manual');
  res.json({ success: true, message: `Report triggered (${reason || 'manual'})` });
});

module.exports = router;
