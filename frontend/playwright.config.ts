import { defineConfig, devices } from '@playwright/test';

const contractAddress = process.env.PLAYWRIGHT_MODE === 'live'
  ? process.env.PLAYWRIGHT_CONTRACT_ADDRESS ?? ''
  : '';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:43173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 43173 --strictPort',
    port: 43173,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_CONTRACT_ADDRESS: contractAddress,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
