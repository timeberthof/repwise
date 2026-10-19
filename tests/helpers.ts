import type { Page } from '@playwright/test'

/** App öffnen, Daten zurücksetzen und mit den Startwerten befüllen. */
export async function seededApp(page: Page, path = '/home') {
  await page.goto('/?sim=iphone#/onboarding')
  await page.waitForFunction(() => !!window.__repwiseDev)
  await page.evaluate(() => window.__repwiseDev!.seed())
  await page.evaluate(() => localStorage.setItem('repwise.sim', 'iphone'))
  await page.goto(`/?sim=iphone#${path}`)
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  // IndexedDB-Abfragen laufen asynchron nach dem ersten Rendern
  await page.waitForTimeout(900)
}

/** Sheets, die beim Start automatisch aufgehen (Schritte von gestern), schließen. */
export async function dismissStartSheets(page: Page) {
  const skip = page.getByRole('button', { name: 'Überspringen' })
  if (await skip.isVisible().catch(() => false)) {
    await skip.click()
    await page.waitForTimeout(350)
  }
}

export const shot = (name: string) => `screenshots/app/${name}.png`
