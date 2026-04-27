const https = require('https');
const logger = require('../config/logger');

/**
 * GET /api/turn-credentials
 * Returns fresh Cloudflare TURN ICE server credentials (TTL = CLOUDFLARE_TURN_TTL seconds).
 * Requires a valid JWT (authenticate middleware applied in route).
 */
async function getTurnCredentials(req, res) {
  const { CLOUDFLARE_TURN_TOKEN_ID, CLOUDFLARE_TURN_API_TOKEN, CLOUDFLARE_TURN_TTL } = process.env;

  if (!CLOUDFLARE_TURN_TOKEN_ID || !CLOUDFLARE_TURN_API_TOKEN) {
    logger.warn('Cloudflare TURN env vars not set – returning STUN only');
    return res.json({
      success: true,
      data: {
        iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }],
      },
    });
  }

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
      req.write(body);
      req.end();
    });

    if (cfResponse.status !== 200 && cfResponse.status !== 201) {
      logger.error('Cloudflare TURN API error', { status: cfResponse.status, body: cfResponse.body });
      return res.status(502).json({ success: false, message: 'Failed to fetch TURN credentials' });
    }

    // Cloudflare returns: { iceServers: { urls: [...], username: '...', credential: '...' } }
    // WebRTC expects an array of ice server objects, so we normalise here.
    const { iceServers } = cfResponse.body;
    const normalised = Array.isArray(iceServers) ? iceServers : [iceServers];

    // Always include the STUN server first
    const result = [
      { urls: 'stun:stun.cloudflare.com:3478' },
      ...normalised,
    ];

    logger.info('TURN credentials issued', { userId: req.user.id, ttl });

    return res.json({ success: true, data: { iceServers: result, ttl } });
  } catch (err) {
    logger.error('TURN credential generation failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal error generating TURN credentials' });
  }
}

module.exports = { getTurnCredentials };
