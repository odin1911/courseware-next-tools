import fs from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import { defineConfig } from 'vite';

function resolveInput(): Record<string, string> {
  const pagesRoot = path.resolve(__dirname, 'src/pages');

  return Object.fromEntries(
    fs
      .readdirSync(pagesRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => [entry.name, path.join(pagesRoot, entry.name, 'index.html')] as const)
      .filter(([, htmlFile]) => fs.existsSync(htmlFile)),
  );
}

export default defineConfig({
  appType: 'mpa',
  base: './',
  assetsInclude: ['**/*.zip'],
  plugins: [
    react(),
    legacy({
      modernPolyfills: ['es.global-this', 'es.object.from-entries', 'es.string.replace-all'],
      targets: [
        'last 2 versions',
        'iOS >= 10',
        'Android >= 6',
        'Chrome >= 49',
        'Safari >= 10',
        'Samsung >= 5',
        'OperaMobile >= 46',
      ],
    }),
  ],
  define: { global: 'globalThis' },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
    dedupe: ['pixi.js'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: { input: resolveInput() },
  },
});
