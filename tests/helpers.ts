import type { Page } from '@playwright/test'

/**
 * App öffnen, Daten zurücksetzen und mit den Startwerten befüllen.
 * Standard: mit erledigtem Check-in inkl. Foto, damit das Pflicht-Sheet nicht alles verdeckt.
 */
export async function seededApp(page: Page, path = '/home', opts: { checkin?: boolean } = {}) {
  await page.goto('/?sim=iphone#/onboarding')
  await page.waitForFunction(() => !!window.__repwiseDev)
  await page.evaluate((o) => window.__repwiseDev!.seed(o), opts)
  await page.evaluate(() => localStorage.setItem('repwise.sim', 'iphone'))
  await page.goto(`/?sim=iphone#${path}`)
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  // IndexedDB-Abfragen laufen asynchron nach dem ersten Rendern
  await page.waitForTimeout(900)
}

/** Foto-Abfrage des Check-ins („Später“) schließen, falls sie offen ist. */
export async function dismissStartSheets(page: Page) {
  const later = page.getByRole('button', { name: 'Später' })
  if (await later.isVisible().catch(() => false)) {
    await later.click()
    await page.waitForTimeout(350)
  }
}

/**
 * Bild wie bei einer Auswahl in der Fotos-App an ein Datei-Feld übergeben (im Browser erzeugt).
 * setInputFiles liefert in WebKit unter Windows gelegentlich Dateien, die sich nicht lesen lassen.
 */
export async function pickImage(page: Page, inputIndex: number, path: string) {
  await page.evaluate(
    async ({ i, url }) => {
      const blob = await (await fetch(url)).blob()
      const input = document.querySelectorAll<HTMLInputElement>('input[type=file]')[i]
      const dt = new DataTransfer()
      dt.items.add(new File([blob], url.split('/').pop()!, { type: blob.type || 'image/png' }))
      input.files = dt.files
      input.dispatchEvent(new Event('change', { bubbles: true }))
    },
    { i: inputIndex, url: '/' + path },
  )
}

export const shot = (name: string) => `screenshots/app/${name}.png`
