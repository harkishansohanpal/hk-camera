#!/usr/bin/env node

/**
 * Generates a session log report from the production backend and writes it
 * to docs/log-report-{date}.md
 *
 * Usage:
 *   node scripts/generate-log-report.js [--api https://hk-camera-backend.fly.dev] [--token <admin-jwt>]
 *
 * Without --token it will try ADMIN_JWT env var or prompt.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
let apiBase = 'https://hk-camera-backend.fly.dev';
let adminToken = process.env.ADMIN_JWT;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--api' && args[i+1]) apiBase = args[++i];
  if (args[i] === '--token' && args[i+1]) adminToken = args[++i];
}

if (!adminToken) {
  console.error('Provide an admin JWT via --token or ADMIN_JWT env var');
  process.exit(1);
}

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, apiBase);
    const mod = url.protocol === 'https:' ? https : http;
    mod.get(url, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Parse failed for ${path}: ${data.slice(0,200)}`)); }
      });
    }).on('error', reject);
  });
}

async function main() {
  const date = new Date().toISOString().slice(0,10);
  const outFile = path.resolve(__dirname, '..', 'docs', `log-report-${date}.md`);

  // Fetch all logs
  const meta = await apiGet('/api/admin/logs/meta');
  console.log('Meta:', JSON.stringify(meta, null, 2));

  const levels = meta?.data?.levels || [];
  const tags = meta?.data?.tags || [];
  const totalLogs = levels.reduce((s, l) => s + l.count, 0);

  // Fetch recent logs
  const all = await apiGet('/api/admin/logs?limit=500&sort=desc');
  const logs = all?.data || [];
  const total = all?.total || 0;

  // Group by user
  const byUser = {};
  for (const l of logs) {
    const uid = l.userId || 'anonymous';
    if (!byUser[uid]) byUser[uid] = [];
    byUser[uid].push(l);
  }

  // Generate markdown
  const lines = [];
  lines.push(`# Log Report — ${date}`);
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

  // Per-user summary
  lines.push('## Per-User Summary');
  lines.push('');
  for (const [uid, userLogs] of Object.entries(byUser)) {
    const online = userLogs.filter(l => l.message.includes('Camera online')).length;
    const waiting = userLogs.filter(l => l.message.includes('Camera offline, waiting')).length;
    const connected = userLogs.filter(l => l.message.includes('Peer connection established')).length;
    const errors = userLogs.filter(l => l.level === 'error').length;
    lines.push(`- **User ${uid.slice(0,8)}** — ${userLogs.length} events`);
    lines.push(`  - Camera online (offers initiated): ${online}`);
    lines.push(`  - Viewer waiting (camera offline): ${waiting}`);
    lines.push(`  - Peer connections established: ${connected}`);
    lines.push(`  - Errors: ${errors}`);
  }
  lines.push('');

  // Recent events
  lines.push('## Recent Events (Last 100)');
  lines.push('');
  lines.push('```');
  for (const l of logs.slice(0, 100).reverse()) {
    const metaStr = l.meta ? ` ${JSON.stringify(l.meta)}` : '';
    lines.push(`[${l.createdAt}] ${l.level.toUpperCase()} [${l.tag}] ${l.message}${metaStr}`);
  }
  lines.push('```');

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, lines.join('\n') + '\n');
  console.log(`Report written to ${outFile}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
