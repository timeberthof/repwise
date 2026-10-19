import { defineConfig } from '@playwright/test'

/**
 * Visuelle Kontrolle in iPhone-Größe (393 × 852 pt @3x, wie die Original-Screenshots).
 * WebKit kommt Safari am nächsten. Safe Areas werden über ?sim=iphone simuliert.
 */
export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    browserName: 'webkit',
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    hasTouch: true,
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
  },
  projects: [
    { name: 'e2e', testMatch: /.*\.e2e\.ts/ },
    { name: 'screens', testMatch: /.*\.screens\.ts/ },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
