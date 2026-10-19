import { defineConfig } from '@playwright/test'
import base from './playwright.config'

/**
 * Test gegen den Produktions-Build unter /repwise/ (wie auf GitHub Pages): Service Worker, Offline, Backup.
 * Vorher bauen: npm run build. Aufruf: npx playwright test -c playwright.prod.config.ts
 */
export default defineConfig({
  ...base,
  timeout: 180_000,
  globalTimeout: 300_000,
  use: { ...base.use, baseURL: 'http://localhost:4173', serviceWorkers: 'allow' },
  projects: [{ name: 'prod', testMatch: /.*\.prod\.ts/ }],
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/repwise/',
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
