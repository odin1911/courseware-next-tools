import { defineConfig } from '@playwright/test';

const port = process.env.PLAYWRIGHT_PORT || '4173';
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './test/e2e',
  timeout: 30_000,
  use: { baseURL, headless: true },
  webServer: {
    command: `yarn dev --host 127.0.0.1 --port ${port} --strictPort`,
    url: `${baseURL}/src/pages/dragonbones-tool/index.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
