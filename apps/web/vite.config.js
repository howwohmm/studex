import { defineConfig } from 'vite';

export default defineConfig({
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
