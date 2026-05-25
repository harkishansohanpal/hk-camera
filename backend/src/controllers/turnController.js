const https = require('https');
const crypto = require('crypto');
const logger = require('../config/logger');

/**
 * GET /api/turn-credentials
 * Returns ICE server config with TURN credentials.
 * Supports three modes:
 *   1. Coturn (self-hosted) – if COTURN_REALM is set
 *   2. Cloudflare TURN – if CLOUDFLARE_TURN_TOKEN_ID is set
 *   3. STUN-only – fallback
 */
async function getTurnCredentials(req, res) {
  const {
    COTURN_REALM, COTURN_SERVER, COTURN_PORT, COTURN_SECRET,
    CLOUDFLARE_TURN_TOKEN_ID, CLOUDFLARE_TURN_API_TOKEN, CLOUDFLARE_TURN_TTL,
  } = process.env;

  // ── Mode 1: Coturn (self-hosted) ────────────────────────────
  if (COTURN_REALM && COTURN_SECRET) {
    const server = COTURN_SERVER || 'turn';
    const port = parseInt(COTURN_PORT, 10) || 3478;
    const ttl = parseInt(CLOUDFLARE_TURN_TTL, 10) || 86400;
    const username = `${ttl}:${req.user.id}`;
    const hmac = crypto.createHmac('sha256', COTURN_SECRET).update(username).digest('base64');
    const credential = Buffer.from(hmac, 'base64').toString('base64');

    const iceServers = [
      { urls: `stun:${server}:${port}` },
      {
        urls: [
          `turn:${server}:${port}?transport=udp`,
          `turn:${server}:${port}?transport=tcp`,
        ],
        username,
        credential,
      },
    ];

    logger.info('Coturn credentials issued', { userId: req.user.id, server });
    return res.json({ success: true, data: { iceServers, ttl } });
  }

  // ── Mode 2: Cloudflare TURN ─────────────────────────────────
  if (CLOUDFLARE_TURN_TOKEN_ID && CLOUDFLARE_TURN_API_TOKEN) {
    const ttl = parseInt(CLOUDFLARE_TURN_TTL, 10) || 86400;
    const body = JSON.stringify({ ttl });

    const options = {
      hostname: 'rtc.live.cloudflare.com',
      path: `/v1/turn/keys/${CLOUDFLARE_TURN_TOKEN_ID}/credentials/generate`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_TURN_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    try {
      const cfResponse = await new Promise((resolve, reject) => {
        const req = https.request(options, (resp) => {
          let raw = '';
          resp.on('data', (chunk) => { raw += chunk; });
          resp.on('end', () => {
            try { resolve({ status: resp.statusCode, body: JSON.parse(raw) }); }
            catch { reject(new Error(`Failed to parse Cloudflare response: ${raw}`)); }
          });
        });
        req.on('error', reject);
        req.setTimeout(5000, () => { req.destroy(); reject(new Error('Cloudflare TURN API timeout')); });
        req.write(body);
        req.end();
      });

      if (cfResponse.status !== 200 && cfResponse.status !== 201) {
        logger.error('Cloudflare TURN API error', { status: cfResponse.status, body: cfResponse.body });
        return res.status(502).json({ success: false, message: 'Failed to fetch TURN credentials' });
      }

      const { iceServers } = cfResponse.body;
      const normalised = Array.isArray(iceServers) ? iceServers : [iceServers];
      const result = [
        { urls: 'stun:stun.cloudflare.com:3478' },
        ...normalised,
      ];

      logger.info('Cloudflare TURN credentials issued', { userId: req.user.id, ttl });
      return res.json({ success: true, data: { iceServers: result, ttl } });
    } catch (err) {
      logger.error('Cloudflare TURN credential generation failed', { error: err.message });
      return res.status(500).json({ success: false, message: 'Internal error generating TURN credentials' });
    }
  }

  // ── Mode 3: STUN-only fallback ──────────────────────────────
  logger.warn('No TURN config found – returning STUN only');
  return res.json({
    success: true,
    data: {
      iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }],
    },
  });
}

module.exports = { getTurnCredentials };
