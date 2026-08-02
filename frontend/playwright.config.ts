import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 4173',
    port: 4173,
    reuseExistingServer: true,
    env: {
      VITE_CONTRACT_ADDRESS: process.env.PLAYWRIGHT_CONTRACT_ADDRESS ?? '',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
