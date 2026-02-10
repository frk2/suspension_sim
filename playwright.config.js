import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  use: {
    baseURL: 'http://localhost:5174',
    screenshot: 'on',
  },
  webServer: {
    command: 'npx vite --port 5174',
    port: 5174,
    reuseExistingServer: true,
  },
});
