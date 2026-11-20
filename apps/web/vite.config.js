import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const offlineWorkspace = {
  name: 'studex-offline-workspace',
  apply: 'build',
  generateBundle: {
    order: 'post',
    handler(_options, bundle) {
      const shell = ['index.html', 'studex.svg', 'manifest.webmanifest', 'studex-192.png', 'studex-512.png', ...Object.keys(bundle).filter((path) =>
        /^assets\/(?:index-|pdf[.-])/.test(path) || path.endsWith('.woff2'))];
      const worker = readFileSync(new URL('./src/offline-worker.js', import.meta.url), 'utf8');
      const version = createHash('sha256').update(worker).update(shell.join('\n')).update(String(bundle['index.html']?.source ?? '')).digest('hex').slice(0, 16);
      this.emitFile({ type: 'asset', fileName: 'offline-worker.js', source: `const version = '${version}';\nconst shell = ${JSON.stringify(shell)};\n${worker}` });
    },
  },
};

export default defineConfig({
  plugins: [offlineWorkspace],
  esbuild: { jsx: 'automatic' },
  build: {
    rollupOptions: {
      output: {
        assetFileNames: ({ names }) => names.includes('eng.traineddata.gz')
          ? 'assets/ocr/eng.traineddata.gz'
          : 'assets/[name]-[hash][extname]',
      },
    },
  },
});
