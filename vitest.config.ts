import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  assetsInclude: ['**/*.zip'],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: { exclude: ['test/e2e/**', 'node_modules/**', 'dist/**'] },
});
