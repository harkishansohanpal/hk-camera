#!/usr/bin/env node

/**
 * Fetches logs from the backend API and writes a report to /logs/
 *
 * Usage:
 *   # With admin creds (script logs in)
 *   node scripts/generate-log-report.js --admin-email admin@hkcamera.app --admin-password admin123
 *
 *   # With pre-existing admin JWT
 *   node scripts/generate-log-report.js --token <jwt>
 *
 *   # All via env vars
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/generate-log-report.js
 *
 *   # Custom API base
 *   node scripts/generate-log-report.js --api http://localhost:5001 --admin-email ... --admin-password ...
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ── Parse args ────────────────────────────────────────────
const args = process.argv.slice(2);
let apiBase = 'https://hk-camera-backend.fly.dev';
let adminToken = process.env.ADMIN_JWT;
let adminEmail = process.env.ADMIN_EMAIL;
let adminPassword = process.env.ADMIN_PASSWORD;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--api' && args[i+1])             apiBase = args[++i];
  else if (args[i] === '--token' && args[i+1])       adminToken = args[++i];
  else if (args[i] === '--admin-email' && args[i+1]) adminEmail = args[++i];
  else if (args[i] === '--admin-password' && args[i+1]) adminPassword = args[++i];
}

// ── HTTP helpers ──────────────────────────────────────────
function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, apiBase);
    const mod = url.protocol === 'https:' ? https : http;
    const opts = {
      hostname: url.hostname,
      path: url.pathname,
      method,
      headers: {},
    };
    if (adminToken) opts.headers.Authorization = `Bearer ${adminToken}`;
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = mod.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { reject(new Error(`Parse failed for ${method} ${urlPath}: ${data.slice(0,200)}`)); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function apiGet(p)    { return request('GET', p); }
function apiPost(p,b) { return request('POST', p, b); }

// ── Main ───────────────────────────────────────────────────
async function main() {
  // 1. Authenticate if email+password provided
  if (!adminToken && adminEmail && adminPassword) {
    const loginBody = JSON.stringify({ email: adminEmail, password: adminPassword });
    const loginRes = await apiPost('/api/auth/login', loginBody);
    if (!loginRes.data?.success) {
      console.error('Login failed:', JSON.stringify(loginRes.data));
      process.exit(1);
    }
    adminToken = loginRes.data.data.accessToken;
    console.log('Authenticated as', adminEmail);
  }

  if (!adminToken) {
    console.error('Need auth: pass --token or --admin-email/--admin-password (or env vars)');
    process.exit(1);
  }

  // 2. Fetch meta + logs
  const [metaRes, allRes] = await Promise.all([
    apiGet('/api/admin/logs/meta'),
    apiGet('/api/admin/logs?limit=500&sort=desc'),
  ]);

  const levels = metaRes.data?.data?.levels || [];
  const tags   = metaRes.data?.data?.tags   || [];
  const logs   = allRes.data?.data           || [];
  const total  = allRes.data?.total          || 0;

  // 3. Group by user
  const byUser = {};
  for (const l of logs) {
    const uid = l.userId || 'anonymous';
    if (!byUser[uid]) byUser[uid] = [];
    byUser[uid].push(l);
  }

  // 4. Build markdown
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const lines = [];
  lines.push(`# Log Report — ${ts}`);
  lines.push('');
  lines.push(`**Total logs in database:** ${total}`);
  lines.push('');
  lines.push('## Summary by Level');
  lines.push('');
  lines.push('| Level | Count |');
  lines.push('|-------|-------|');
  for (const l of levels) lines.push(`| ${l.level} | ${l.count} |`);
  lines.push('');

  lines.push('## Summary by Tag');
  lines.push('');
  lines.push('| Tag | Count |');
  lines.push('|-----|-------|');
  for (const t of tags) lines.push(`| ${t.tag} | ${t.count} |`);
  lines.push('');

  lines.push('## Per-User Summary');
  lines.push('');
  for (const [uid, userLogs] of Object.entries(byUser)) {
    const online    = userLogs.filter(l => l.message.includes('Camera online')).length;
    const waiting   = userLogs.filter(l => l.message.includes('Camera offline, waiting')).length;
    const connected = userLogs.filter(l => l.message.includes('Peer connection established')).length;
    const errors    = userLogs.filter(l => l.level === 'error').length;
    lines.push(`- **User ${uid.slice(0,8)}** — ${userLogs.length} events`);
    lines.push(`  - Camera online (offers initiated): ${online}`);
    lines.push(`  - Viewer waiting (camera offline): ${waiting}`);
    lines.push(`  - Peer connections established: ${connected}`);
    lines.push(`  - Errors: ${errors}`);
  }
  lines.push('');

  lines.push('## Recent Events (Last 100)');
  lines.push('');
  lines.push('```');
  for (const l of logs.slice(0, 100).reverse()) {
    const metaStr = l.meta ? ` ${JSON.stringify(l.meta)}` : '';
    lines.push(`[${l.createdAt}] ${l.level.toUpperCase()} [${l.tag}] ${l.message}${metaStr}`);
  }
  lines.push('```');

  // 5. Write to file
  const outDir  = path.resolve(__dirname, '..', 'logs');
  const outFile = path.join(outDir, `log-report-${ts}.md`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, lines.join('\n') + '\n');
  console.log(`Report written to ${outFile}`);

  // 6. Optionally write/update latest symlink or summary
  const latestFile = path.join(outDir, 'LATEST.md');
  fs.writeFileSync(latestFile, lines.join('\n') + '\n');
  console.log(`Latest copy at ${latestFile}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
