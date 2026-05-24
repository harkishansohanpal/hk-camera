const express = require('express');
const { prisma } = require('../config/database');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { logs } = req.body;
    if (!Array.isArray(logs) || logs.length === 0) {
      return res.status(422).json({ success: false, message: 'logs array required' });
    }

    const data = logs.map((l) => ({
      level:    l.level    || 'info',
      tag:      l.tag      || 'unknown',
      message:  l.message  || '',
      meta:     l.meta     || undefined,
      sessionId: l.sessionId || undefined,
      userId:   req.user?.id || l.userId || undefined,
      cameraId: l.cameraId || undefined,
    }));

    await prisma.log.createMany({ data });
    res.json({ success: true, count: data.length });
  } catch (err) { next(err); }
});

module.exports = router;
