import { test, expect, type Page } from '@playwright/test'
import { shot } from './helpers'

const APP = '/repwise/'

/** Datensätze je Tabelle direkt aus IndexedDB zählen. */
async function counts(page: Page) {
  return page.evaluate(
    () =>
      new Promise<Record<string, number>>((resolve, reject) => {
        const req = indexedDB.open('repwise')
        req.onerror = () => reject(req.error)
        req.onsuccess = () => {
          const db = req.result
          const names = ['sessions', 'sets', 'strength', 'body', 'plans', 'profile'].filter((n) => db.objectStoreNames.contains(n))
          if (!names.length) return resolve({})
          const tx = db.transaction(names, 'readonly')
          const out: Record<string, number> = {}
          for (const n of names) tx.objectStore(n).count().onsuccess = (e) => (out[n] = (e.target as IDBRequest<number>).result)
          tx.oncomplete = () => (db.close(), resolve(out))
        }
      }),
  )
}

test('Produktions-Build: Onboarding mit Datei, offline, Backup-Rundlauf', async ({ page, context }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  // 1) Erster Aufruf wie auf dem iPhone: keine persönlichen Daten eingebaut
  await page.goto(`${APP}?sim=iphone`)
  await page.evaluate(() => localStorage.setItem('repwise.sim', 'iphone'))
  await expect(page.getByRole('button', { name: 'Daten importieren' })).toBeVisible({ timeout: 15_000 })
  await page.screenshot({ path: shot('P6-willkommen') })

  // 2) Startwerte als Datei laden → Vorbelegung
  await page.locator('input[type=file]').setInputFiles('src/data/startwerte.beispiel.json')
  await expect(page.getByText('Startwerte geladen').first()).toBeVisible()
  await page.screenshot({ path: shot('P6-startwerte-geladen') })

  // 3) Onboarding durchklicken bis zum Plan
  for (let i = 0; i < 15; i++) {
    await page.getByRole('button', { name: 'Weiter', exact: true }).click()
    await page.waitForTimeout(200)
  }
  await page.getByRole('button', { name: "Los geht's" }).click({ timeout: 30_000 })
  await expect(page).toHaveURL(/#\/training/)
  const before = await counts(page)
  expect(before.strength).toBeGreaterThan(50)

  // 4) Service Worker aktiv → offline neu laden
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 15_000 }).toBe(true)
  await context.setOffline(true)
  await page.goto(`${APP}?sim=iphone#/statistik`)
  await expect(page.getByRole('heading', { name: /Statistik/i }).first()).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: shot('P6-offline-statistik') })

  // 5) Backup erstellen (offline) und herunterladen
  await page.goto(`${APP}?sim=iphone#/einstellungen/daten`)
  await page.getByRole('button', { name: 'Backup erstellen' }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Herunterladen' }).click()
  const file = test.info().outputPath('backup.json')
  await (await download).saveAs(file)
  await page.screenshot({ path: shot('P6-backup') })

  // 6) Alle Daten löschen (doppelte Sicherheitsabfrage)
  await page.getByRole('button', { name: 'Alle Daten löschen' }).click()
  await page.getByRole('button', { name: 'Weiter', exact: true }).click()
  await page.getByRole('button', { name: 'Endgültig löschen' }).click()
  await expect(page.getByRole('button', { name: 'Daten importieren' })).toBeVisible({ timeout: 15_000 })
  expect((await counts(page)).sessions ?? 0).toBe(0)

  // 7) Backup im Onboarding wiederherstellen (weiterhin offline)
  await page.locator('input[type=file]').setInputFiles(file)
  await expect(page.getByText('Backup-Inhalt')).toBeVisible()
  await page.screenshot({ path: shot('P6-backup-vorschau') })
  await page.getByRole('button', { name: 'Importieren', exact: true }).click()
  await page.getByRole('button', { name: 'Ersetzen' }).click()
  await expect(page).toHaveURL(/#\/home/, { timeout: 15_000 })
  const after = await counts(page)
  expect(after).toEqual(before)
  await page.waitForTimeout(1200)
  await page.screenshot({ path: shot('P6-nach-import') })
  await context.setOffline(false)
  expect(errors).toEqual([])
})
