#!/usr/bin/env node
// License allowlist gate (ADR-020). Fails on any production dependency whose
// license is not on the allowlist. Scans every workspace package.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ALLOWED = new Set([
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'MPL-2.0',
  '0BSD',
  'CC0-1.0',
  'Unlicense',
  'BlueOak-1.0.0',
  'Python-2.0',
  'CC-BY-4.0', // data only
]);

const root = join(fileURLToPath(import.meta.url), '..', '..');
const workspaceGlobs = readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8')
  .split('\n')
  .map((l) => l.match(/^\s*-\s*'?([^\s'"]+)/)?.[1])
  .filter(Boolean);

const dirs = [root];
for (const glob of workspaceGlobs) {
  const [parent] = glob.split('/');
  for (const d of readdirSync(join(root, parent), { withFileTypes: true })) {
    if (d.isDirectory()) dirs.push(join(root, parent, d.name));
  }
}

const failures = [];
let total = 0;
for (const dir of dirs) {
  let parsed;
  try {
    parsed = JSON.parse(
      execFileSync('pnpm', ['licenses', 'list', '--json', '--prod'], {
        cwd: dir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        maxBuffer: 64 * 1024 * 1024,
      }),
    );
  } catch {
    continue; // package without a licenses table (e.g. private root)
  }
  for (const [license, pkgs] of Object.entries(parsed)) {
    total += pkgs.length;
    const expr = license.replace(/^\(+|\)+$/g, '');
    // Dual/multi-license: "A OR B" passes if any alternative is allowed;
    // "A AND B" passes only if every term is allowed.
    const ok = expr.includes(' OR ')
      ? expr.split(' OR ').some((alt) => ALLOWED.has(alt.replace(/[()]/g, '').trim()))
      : expr.split(' AND ').every((term) => ALLOWED.has(term.replace(/[()]/g, '').trim()));
    if (!ok) {
      for (const pkg of pkgs) {
        failures.push(`${pkg.name}@${pkg.versions?.join(', ') ?? '?'} — ${license}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error('License check failed — disallowed licenses found:');
  for (const f of [...new Set(failures)]) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`License check passed: ${total} production packages, all on the allowlist.`);
