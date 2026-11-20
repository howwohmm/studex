// Builds and serves the QA web export for Playwright.
// EXPO_PUBLIC_QA=1 is baked in at export time. Every run re-exports so tests never see a stale
// bundle; set E2E_REUSE_EXPORT=1 to reuse an existing export while iterating locally.
import { createServer } from 'node:http';
import { existsSync, statSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = fileURLToPath(new URL('..', import.meta.url));
const dir = join(fileURLToPath(new URL('.', import.meta.url)), 'dist');
const reuse = process.env.E2E_REUSE_EXPORT === '1' && existsSync(join(dir, 'index.html'));
if (!reuse) {
  console.log('[e2e] exporting QA web build...');
  execSync('npx expo export --platform web --clear --output-dir ' + dir, {
    cwd: appRoot,
    stdio: 'inherit',
    env: { ...process.env, EXPO_PUBLIC_QA: '1', CI: '1' },
  });
}

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.map': 'application/json', '.webmanifest': 'application/manifest+json',
};

createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  for (const cand of [p, p + '.html', join(p, 'index.html')]) {
    const f = join(dir, cand);
    if (existsSync(f) && statSync(f).isFile()) {
      res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' });
      return res.end(readFileSync(f));
    }
  }
  res.writeHead(404).end('not found');
}).listen(4173, () => console.log('[e2e] serving ' + dir + ' on :4173'));
