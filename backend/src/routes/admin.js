const express = require('express');
const { prisma } = require('../config/database');
const logger = require('../config/logger');

const router = express.Router();

// ── Log ingestion (batched) ─────────────────────────────────────
router.post('/logs', async (req, res, next) => {
  try {
    const { logs } = req.body;
    if (!Array.isArray(logs) || logs.length === 0) {
      return res.status(422).json({ success: false, message: 'logs array required' });
    }

    const data = logs.map((l) => ({
      level:   l.level   || 'info',
      tag:     l.tag     || 'unknown',
      message: l.message || '',
      meta:    l.meta    || undefined,
      sessionId: l.sessionId || undefined,
      userId:  req.user?.id || l.userId || undefined,
      cameraId: l.cameraId || undefined,
    }));

    await prisma.log.createMany({ data });
    res.json({ success: true, count: data.length });
  } catch (err) { next(err); }
});

// ── Log retrieval (with filters) ────────────────────────────────
router.get('/logs', async (req, res, next) => {
  try {
    const {
      level, tag, userId, cameraId, sessionId,
      from, to,
      limit = '200', offset = '0',
      sort = 'desc',
    } = req.query;

    const where = {};
    if (level)    where.level = level;
    if (tag)      where.tag = tag;
    if (userId)   where.userId = userId;
    if (cameraId) where.cameraId = cameraId;
    if (sessionId) where.sessionId = sessionId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to)   where.createdAt.lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      prisma.log.findMany({
        where,
        orderBy: { createdAt: sort === 'asc' ? 'asc' : 'desc' },
        take: Math.min(Number(limit) || 200, 1000),
        skip: Number(offset) || 0,
      }),
      prisma.log.count({ where }),
    ]);

    res.json({ success: true, data: logs, total });
  } catch (err) { next(err); }
});

// ── Log tag/index metadata ─────────────────────────────────────
router.get('/logs/meta', async (req, res, next) => {
  try {
    const [levels, tags, cameraIds] = await Promise.all([
      prisma.log.groupBy({ by: ['level'], _count: { level: true } }),
      prisma.log.groupBy({ by: ['tag'], _count: { tag: true } }),
      prisma.log.groupBy({ by: ['cameraId'], _count: { cameraId: true } }),
    ]);
    res.json({
      success: true,
      data: {
        levels: levels.map(l => ({ level: l.level, count: l._count.level })),
        tags: tags.map(t => ({ tag: t.tag, count: t._count.tag })),
        cameraIds: cameraIds.map(c => ({ cameraId: c.cameraId, count: c._count.cameraId })),
      },
    });
  } catch (err) { next(err); }
});

// ── Log summarization (AI) ─────────────────────────────────────
router.post('/logs/analyze', async (req, res, next) => {
  try {
    const { query, logIds, filters, timeRange } = req.body;

    let logs;
    if (logIds && Array.isArray(logIds)) {
      logs = await prisma.log.findMany({ where: { id: { in: logIds } }, orderBy: { createdAt: 'desc' }, take: 500 });
    } else if (filters || timeRange) {
      const where = {};
      if (filters) {
        if (filters.level) where.level = filters.level;
        if (filters.tag) where.tag = filters.tag;
        if (filters.userId) where.userId = filters.userId;
        if (filters.cameraId) where.cameraId = filters.cameraId;
      }
      if (timeRange) {
        where.createdAt = {};
        if (timeRange.from) where.createdAt.gte = new Date(timeRange.from);
        if (timeRange.to) where.createdAt.lte = new Date(timeRange.to);
      }
      logs = await prisma.log.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 });
    } else {
      logs = await prisma.log.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    }

    if (logs.length === 0) {
      return res.json({ success: true, data: { answer: 'No logs found matching the criteria.', summary: null } });
    }

    const logSummary = logs.map(l => {
      const meta = l.meta ? JSON.stringify(l.meta) : '';
      return `[${l.createdAt.toISOString()}] ${l.level.toUpperCase()} [${l.tag}] ${l.message}${meta ? ' ' + meta : ''}`;
    }).join('\n');

    const prompt = `You are a production support engineer analyzing application logs.

${query ? `The user asks: "${query}"\n\n` : ''}
Here are the most recent matching logs (${logs.length} entries):

${logSummary}

${query ? 'Answer the user\'s question based on these logs.' : 'Provide a concise summary of what these logs indicate: any errors, warnings, patterns, anomalies, or trends. Focus on actionable insights for production support.'}`;

    const answer = await callAI(prompt);
    res.json({ success: true, data: { answer, logCount: logs.length } });
  } catch (err) {
    logger.error('Admin', 'Log analysis failed', { error: err.message });
    next(err);
  }
});

// ── OpenRouter / OpenAI call ────────────────────────────────────
async function callAI(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return 'AI analysis not configured. Set OPENROUTER_API_KEY or OPENAI_API_KEY.';
  }

  const baseUrl = process.env.OPENROUTER_API_KEY
    ? 'https://openrouter.ai/api/v1'
    : 'https://api.openai.com/v1';

  const model = process.env.AI_MODEL || 'gpt-4o-mini';

  const body = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: 'You are a production support engineer. Analyze application logs concisely and provide actionable insights.' },
      { role: 'user', content: prompt },
    ],
    max_tokens: 2000,
    temperature: 0.3,
  });

  const https = require('https');
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}/chat/completions`);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(process.env.OPENROUTER_API_KEY ? { 'HTTP-Referer': process.env.CLIENT_URL || 'https://hk-camera.com' } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const text = parsed.choices?.[0]?.message?.content;
          resolve(text || 'No analysis returned.');
        } catch {
          resolve('Failed to parse AI response.');
        }
      });
    });
    req.on('error', (err) => resolve(`AI analysis unavailable: ${err.message}`));
    req.write(body);
    req.end();
  });
}

module.exports = router;
