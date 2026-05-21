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

function parseTestCount(output) {
  // Vitest: "Tests  39 passed (39)"
  // Jest:   "Tests:       57 passed, 57 total"
  const m = output.match(/Tests:?\s+(\d+)\s+passed/);
  return m ? parseInt(m[1], 10) : null;
}

function updateTestTable(content, suite, count) {
  const re = new RegExp(
    `(\\|\\s*${suite.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s*\\|\\s*\\w+\\s*\\|\\s*)(\\d+)(\\s*\\|)`,
    'i'
  );
  return content.replace(re, (match, prefix, _old, suffix) => `${prefix}${count}${suffix}`);
}

try {
  const feOut = run('npm test -- --reporter=verbose 2>&1', {
    cwd: path.join(ROOT, 'frontend'),
  });
  const beOut = run('npm test -- --verbose 2>&1', {
    cwd: path.join(ROOT, 'backend'),
  });

  const feTotal = parseTestCount(feOut);
  const beTotal = parseTestCount(beOut);

  if (!feTotal || !beTotal) {
    console.error('Could not parse test counts');
    process.exit(1);
  }

  const total = feTotal + beTotal;
  let changed = false;

  for (const [name, filepath] of Object.entries(files)) {
    let content = fs.readFileSync(filepath, 'utf-8');
    const original = content;

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
} catch (err) {
  console.error('Failed to sync docs:', err.message);
  if (err.stderr) console.error('STDERR:', err.stderr.toString().slice(0, 2000));
  if (err.stdout) console.error('STDOUT:', err.stdout.toString().slice(0, 2000));
  process.exit(1);
}
