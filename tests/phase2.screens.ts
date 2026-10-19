import { test } from '@playwright/test'
import { shot } from './helpers'

/** Onboarding Schritt für Schritt (frische Datenbank, Vorbelegung aus startwerte.json). */
test('Onboarding', async ({ page }) => {
  await page.goto('/?sim=iphone#/onboarding')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(700)
  const names = [
    'S17-willkommen',
    'S21-ziel',
    'O03-erfahrung',
    'S22-haeufigkeit',
    'S23-split',
    'S24-woche',
    'O07-ort',
    'O08-koerper',
    'S20-koerperfett',
    'O10-aktivitaet',
    'O11-kalorien',
    'O12-fokus',
    'O13-schmerzen',
    'O14-ausschluesse',
    'O15-startwerte',
  ]
  for (const n of names) {
    await page.screenshot({ path: shot(n) })
    await page.getByRole('button', { name: 'Weiter', exact: true }).click()
    await page.waitForTimeout(250)
  }
  await page.waitForTimeout(400)
  await page.screenshot({ path: shot('S26-erstellen') })
  await page.getByRole('button', { name: "Los geht's" }).waitFor({ timeout: 20_000 })
  await page.waitForTimeout(300)
  await page.screenshot({ path: shot('O17-plan') })
  await page.screenshot({ path: shot('O17-plan-ganz'), fullPage: true })
})
