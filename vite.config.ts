import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { pageEntries, type PageEntryName } from './build/generated-entries';

function resolveInput(): Record<string, string> {
  const only = process.env.BUILD_ENTRY?.trim();
  if (!only) return { ...pageEntries };

  const entry = pageEntries[only as PageEntryName];
  if (!entry) throw new Error(`Unknown BUILD_ENTRY: ${only}`);
  return { [only]: entry };
}

export default defineConfig({
  appType: 'mpa',
  base: './',
  assetsInclude: ['**/*.zip'],
  plugins: [react()],
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
