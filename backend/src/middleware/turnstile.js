const https = require('https');

const SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';
const TEST_SECRET = '1x0000000000000000000000000000000AA';

async function verifyTurnstile(token, ip) {
  if (!token) return false;
  if (SECRET_KEY === TEST_SECRET) return true;

  return new Promise((resolve) => {
    const data = JSON.stringify({ secret: SECRET_KEY, response: token, remoteip: ip || undefined });

    const req = https.request({
      hostname: 'challenges.cloudflare.com',
      path: '/turnstile/v0/siteverify',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try { const r = JSON.parse(body); resolve(r.success === true); }
        catch { resolve(false); }
      });
    });

    req.on('error', () => resolve(false));
    req.write(data);
    req.end();
  });
}

module.exports = { verifyTurnstile };
