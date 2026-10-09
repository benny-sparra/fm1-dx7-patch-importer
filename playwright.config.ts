import { defineConfig, devices } from '@playwright/test'

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
    // The app picks American or British English from the browser. Journeys read British English,
    // the complete English resources, unless one sets its own locale to test the choice.
    locale: 'en-GB',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  // Firefox is a supported Web MIDI browser, so every journey runs in it as well as Chromium.
  // The touch journeys in e2e/mobile are an advisory audit of phones and tablets, run only by
  // `npm run test:e2e:touch`, so a gap they find never fails `npm run test:e2e` or a deploy.
  projects: [
    { name: 'chromium', testIgnore: 'mobile/**', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testIgnore: 'mobile/**', use: { ...devices['Desktop Firefox'] } },
    { name: 'touch-phone', testDir: './e2e/mobile', use: { ...devices['Pixel 7'] } },
    { name: 'touch-tablet', testDir: './e2e/mobile', use: { ...devices['Galaxy Tab S9'] } },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    // Reusing whatever already serves the port could test an older build, so it is opt-in.
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === 'true',
    url: 'http://127.0.0.1:4173',
  },
})
