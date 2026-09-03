import { defineConfig } from '@playwright/test'

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  outputDir: 'test-results',
  reporter: process.env.CI ? 'github' : 'list',
  retries: process.env.CI ? 2 : 0,
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 30_000,
  workers: process.env.CI ? 2 : 4,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    reuseExistingServer: !process.env.CI,
    url: 'http://127.0.0.1:4173',
  },
})
