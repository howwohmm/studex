#!/usr/bin/env node
// License allowlist gate (ADR-020, amended 2026-11-20). Scans every workspace
// package's production dependencies via `pnpm licenses list`.
//
// SPDX semantics: a bare identifier passes if allowed; "A OR B" passes if any
// term is allowed; "A AND B" passes only if every term is allowed. Anything
// that mixes AND and OR (with or without parentheses) fails closed and is
// printed for manual review.
//
// Usage:
//   node scripts/check-licenses.mjs            — scan all production deps
//   node scripts/check-licenses.mjs --expr "X" — evaluate one expression (dry run)
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
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
]);

// Package-level exceptions approved via ADR-020 (exact name + license pairs).
// Each new exception requires an ADR change.
const EXCEPTIONS = new Map([['caniuse-lite', 'CC-BY-4.0']]);

// Returns { ok: boolean } or { ok: false, review: true } for mixed/unknown syntax.
export function evaluateLicenseExpression(expr) {
  const cleaned = expr.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  const hasAnd = /\bAND\b/i.test(cleaned);
  const hasOr = /\bOR\b/i.test(cleaned);
  if (hasAnd && hasOr) {
    return { ok: false, review: true };
  }
  if (hasOr) {
    const terms = cleaned.split(/\s+OR\s+/i).map((t) => t.trim());
    return { ok: terms.some((t) => ALLOWED.has(t)) };
  }
  if (hasAnd) {
    const terms = cleaned.split(/\s+AND\s+/i).map((t) => t.trim());
    return { ok: terms.every((t) => ALLOWED.has(t)) };
  }
  return { ok: ALLOWED.has(cleaned) };
}

function main() {
  const exprArg = process.argv.indexOf('--expr');
  if (exprArg !== -1) {
    const expr = process.argv[exprArg + 1];
    if (!expr) {
      console.error('usage: check-licenses.mjs --expr "<license expression>"');
      process.exit(2);
    }
    const { ok, review } = evaluateLicenseExpression(expr);
    console.log(
      `${expr}: ${ok ? 'allowed' : review ? 'REVIEW REQUIRED (mixed AND/OR — failing closed)' : 'NOT ALLOWED'}`,
    );
    process.exit(ok ? 0 : 1);
  }

  const root = join(fileURLToPath(import.meta.url), '..', '..');
  const workspaceGlobs = readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8')
    .split('\n')
    .map((l) => l.match(/^\s*-\s*'?([^\s'"]+)/)?.[1])
    .filter(Boolean);

  const dirs = [];
  for (const glob of workspaceGlobs) {
    const [parent] = glob.split('/');
    for (const d of readdirSync(join(root, parent), { withFileTypes: true })) {
      if (d.isDirectory()) dirs.push(join(root, parent, d.name));
    }
  }

  const failures = [];
  const review = [];
  const exceptionsUsed = new Set();
  let total = 0;
  let checked = 0;
  for (const dir of dirs) {
    const pkgPath = join(dir, 'package.json');
    if (!existsSync(pkgPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (!pkg.dependencies || Object.keys(pkg.dependencies).length === 0) {
      continue; // workspace package with no production deps — nothing to scan
    }
    checked += 1;
    let stdout;
    try {
      stdout = execFileSync('pnpm', ['licenses', 'list', '--json', '--prod'], {
        cwd: dir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 64 * 1024 * 1024,
      });
    } catch (err) {
      console.error(`pnpm licenses list failed in ${dir} (exit ${err.status}):`);
      console.error(err.stderr?.toString() ?? String(err));
      process.exit(1);
    }
    let parsed;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      console.error(`Unparsable licenses output in ${dir}:`);
      console.error(stdout.slice(0, 2000));
      process.exit(1);
    }
    for (const [license, pkgs] of Object.entries(parsed)) {
      total += pkgs.length;
      const res = evaluateLicenseExpression(license);
      if (!res.ok) {
        for (const p of pkgs) {
          const line = `${p.name}@${p.versions?.join(', ') ?? '?'} — ${license}`;
          if (EXCEPTIONS.get(p.name) === license) {
            exceptionsUsed.add(`${p.name} — ${license} (ADR-020 exception)`);
          } else {
            (res.review ? review : failures).push(line);
          }
        }
      }
    }
  }

  if (checked === 0) {
    console.error('License check failed: no workspace packages with production deps found.');
    process.exit(1);
  }

  if (review.length > 0) {
    console.error('License check failed — mixed AND/OR expressions need manual review:');
    for (const f of [...new Set(review)]) console.error(`  ${f}`);
  }
  if (failures.length > 0) {
    console.error('License check failed — disallowed licenses found:');
    for (const f of [...new Set(failures)]) console.error(`  ${f}`);
  }
  if (exceptionsUsed.size > 0) {
    console.log('Exceptions applied (ADR-020):');
    for (const e of exceptionsUsed) console.log(`  ${e}`);
  }
  if (failures.length > 0 || review.length > 0) process.exit(1);

  console.log(
    `License check passed: ${total} production packages across ${checked} workspace packages, all on the allowlist.`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
