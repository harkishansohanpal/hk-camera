const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHECK_ONLY = process.argv.includes('--check');

const files = {
  readme: path.join(ROOT, 'README.md'),
  testing: path.join(ROOT, 'docs/TESTING.md'),
};

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf-8', timeout: 120000, ...opts });
}

function stripAnsi(s) {
  return s.replace(/\u001b\[[0-9;]*m/g, '');
}
function parseTestCount(output) {
  // Vitest: "Tests  39 passed (39)"
  // Jest (no skips): "Tests:       57 passed, 57 total"
  // Jest (with skips): "Tests:       3 skipped, 61 passed, 64 total"
  //
  // Match the number that appears immediately before " passed".
  // Use a loop to find the last occurrence (which is always the passed count).
  const clean = stripAnsi(output);
  const re = /(\d+)\s+passed/g;
  let m, last;
  while ((m = re.exec(clean)) !== null) last = m[1];
  return last ? parseInt(last, 10) : null;
}

function updateTestTable(content, suite, count) {
  const re = new RegExp(
    `(\\|\\s*${suite.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s*\\|)([^|]+)(\\|\\s*)(\\*{0,2})(\\d+)(\\*{0,2})(\\s*\\|)`,
    'i'
  );
  return content.replace(re, (match, prefix, _mid, sep, _boldL, _old, _boldR, suffix) =>
    `${prefix}${_mid}${sep}${_boldL}${count}${_boldR}${suffix}`
  );
}

try {
  feOut = run('npm test -- --reporter=verbose 2>&1', {
    cwd: path.join(ROOT, 'frontend'),
  });
} catch (err) {
  console.error('Frontend tests failed:', err.message.substring(0, 500));
  if (err.stdout) console.error('STDOUT:', err.stdout.toString().substring(0, 1000));
  if (err.stderr) console.error('STDERR:', err.stderr.toString().substring(0, 1000));
  process.exit(1);
}
try {
  beOut = run('npm test -- --verbose 2>&1', {
    cwd: path.join(ROOT, 'backend'),
  });
} catch (err) {
  console.error('Backend tests failed:', err.message.substring(0, 500));
  if (err.stdout) console.error('STDOUT:', err.stdout.toString().substring(0, 1000));
  if (err.stderr) console.error('STDERR:', err.stderr.toString().substring(0, 1000));
  process.exit(1);
}

  const feTotal = parseTestCount(feOut);
  const beTotal = parseTestCount(beOut);

  if (!feTotal || !beTotal) {
    console.error('Could not parse test counts');
    process.exit(1);
  }

  let changed = false;

  function extractRowCount(content, rowLabel) {
    const escaped = rowLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\|\\s*${escaped}\\s*\\|[^|]*\\|\\s*\\*{0,2}(\\d+)\\*{0,2}\\s*\\|`, 'i');
    const m = content.match(re);
    return m ? parseInt(m[1], 10) : 0;
  }

  for (const [name, filepath] of Object.entries(files)) {
    let content = fs.readFileSync(filepath, 'utf-8');
    const original = content;
    const e2eTotal = extractRowCount(content, 'E2E');
    const total = feTotal + beTotal + e2eTotal;

    content = updateTestTable(content, 'Unit tests', feTotal);
    content = updateTestTable(content, 'Integration', beTotal);
    content = updateTestTable(content, '\\*\\*Total\\*\\*', total);

    if (content !== original) {
      if (CHECK_ONLY) {
        console.log(`[CHECK FAILED] ${name} test counts are out of date. Run 'npm run docs:sync' to update.`);
        changed = true;
      } else {
        fs.writeFileSync(filepath, content);
        console.log(`Updated ${name}: fe=${feTotal} be=${beTotal} total=${total}`);
        changed = true;
      }
    }
  }

  if (changed && CHECK_ONLY) {
    process.exit(1);
  } else if (changed) {
    console.log('\nDocs updated. Run `git diff` to review changes.');
  } else {
    console.log('All doc test counts are up to date.');
  }
