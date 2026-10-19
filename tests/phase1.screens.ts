import { test } from '@playwright/test'
import { dismissStartSheets, seededApp, shot } from './helpers'

test('Dashboard', async ({ page }) => {
  await seededApp(page, '/home')
  await dismissStartSheets(page)
  await page.screenshot({ path: shot('S01-dashboard') })
})

test('Einstellungen', async ({ page }) => {
  await seededApp(page, '/einstellungen')
  await page.screenshot({ path: shot('S43-einstellungen-1') })
})

test('Schritte-Abfrage', async ({ page }) => {
  await seededApp(page, '/home')
  await page.waitForTimeout(400)
  await page.screenshot({ path: shot('X-schritte-sheet') })
})
