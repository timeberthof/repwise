import { test, expect } from '@playwright/test'
import { dismissStartSheets, pickImage, seededApp, shot } from './helpers'

test('Cardio eintragen und Statistik', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-21T19:00:00'))
  await seededApp(page, '/cardio/neu')
  await page.waitForTimeout(1500)
  await page.screenshot({ path: shot('P5-cardio-form') })
  await expect(page.getByText('Ziel-Intensität')).toHaveCount(0)
  await page.getByRole('button', { name: 'Radfahren' }).click()
  await page.getByLabel('Ø-Puls').fill('128')
  await page.getByLabel('Ø-Puls').blur()
  await page.waitForTimeout(300)
  await page.screenshot({ path: shot('P5-cardio-form-2'), fullPage: true })
  await page.getByRole('button', { name: 'Speichern' }).click()
  await page.waitForTimeout(800)
  await page.goto('/?sim=iphone#/statistik')
  await page.waitForTimeout(1500)
  await dismissStartSheets(page)
  await page.getByRole('button', { name: 'Cardio', exact: true }).click()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: shot('P5-statistik-cardio') })
})

test('Einstellungen', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-21T19:00:00'))
  await seededApp(page, '/einstellungen')
  await page.waitForTimeout(800)
  await page.screenshot({ path: shot('P5-einstellungen') })
  for (const gone of ['Zyklus', 'Ziele & Kalorien', 'Schritte']) await expect(page.getByText(gone, { exact: true })).toHaveCount(0)
  for (const [path, name] of [
    ['profil', 'P5-profil'],
    ['training', 'P5-training-einstellungen'],
    ['cardio', 'P5-cardio-einstellungen'],
    ['hinweise', 'P5-hinweise'],
    ['daten', 'P5-daten'],
    ['info', 'P5-info'],
  ]) {
    await page.goto(`/?sim=iphone#/einstellungen/${path}`)
    await page.waitForTimeout(1500)
    await page.screenshot({ path: shot(name) })
  }
})

test('Körper: Fotos und Vorher/Nachher', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-21T19:00:00'))
  page.on('console', (m) => m.type() === 'error' && console.log('[browser]', m.text()))
  await seededApp(page, '/koerper')
  await page.waitForTimeout(800)
  for (const [i, pose] of [
    [0, 'Vorne'],
    [1, 'Seitlich'],
  ] as const) {
    await pickImage(page, 1, i === 0 ? 'screenshots/S20-zyklus-05-koerperfett.png' : 'screenshots/S36-mobility.png')
    await page.waitForTimeout(800)
    const sheet = page.getByRole('dialog', { name: 'Foto speichern' })
    await sheet.getByRole('button', { name: pose, exact: true }).click()
    await expect(sheet.getByAltText('Vorschau')).toBeVisible()
    if (i === 0) await page.screenshot({ path: shot('P5-foto-speichern') })
    await sheet.getByRole('button', { name: 'Speichern' }).click()
    await expect(sheet).toBeHidden({ timeout: 25_000 })
    await page.waitForTimeout(1500)
  }
  await page.getByRole('heading', { name: 'Körper' }).scrollIntoViewIfNeeded()
  await page.getByText('Fortschrittsfotos', { exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: shot('P5-fotos') })
  await expect(page.locator('img[alt*="Seitlich"]')).toBeVisible()
  await page.getByRole('button', { name: /Vorher \/ Nachher/ }).click()
  const picker = page.getByRole('dialog', { name: 'Vorher / Nachher' })
  await picker.getByRole('button', { name: 'Vergleichen' }).click()
  await page.waitForTimeout(800)
  await expect(page.getByRole('dialog', { name: 'Vergleich' })).toBeVisible()
  await page.screenshot({ path: shot('P5-fotos-vergleich') })
})
