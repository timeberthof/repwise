import { test, expect } from '@playwright/test'
import { dismissStartSheets, seededApp, shot } from './helpers'

/** Training durchführen – Montag, 19.10.2026 (erster Plantag, Intro-Woche). */
test('Training-Tab und Workout', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-19T09:30:00'))
  await seededApp(page, '/training')
  await dismissStartSheets(page)
  await page.waitForTimeout(500)
  await page.screenshot({ path: shot('S02-training') })

  await page.getByText('Push', { exact: true }).first().click()
  await page.waitForURL(/workout/)
  await page.waitForTimeout(700)
  await page.screenshot({ path: shot('S27-workout-uebersicht') })

  // Trainingstyp
  await page.getByRole('button', { name: 'Intro' }).first().click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: shot('S29-trainingstyp') })
  await page.mouse.click(196, 60)
  await page.waitForTimeout(400)

  // Übung tauschen
  await page.getByRole('button', { name: 'Übung tauschen', exact: true }).first().click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: shot('S28-uebung-tauschen') })
  await page.keyboard.press('Escape')
  await page.goto(page.url())
  await page.waitForTimeout(700)

  // Übungs-Sheet
  await page.getByText('Bankdrücken an der Multipresse').first().click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: shot('S30-uebung-eintragen') })

  // Starten → Check-in
  await page.getByRole('button', { name: 'Starten' }).last().click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: shot('S31-wellness-abfrage') })
  await page.getByRole('button', { name: 'Weiter', exact: true }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: shot('O31b-schlaf') })
  await page.getByRole('button', { name: 'Weiter', exact: true }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: shot('S32-muskelkater') })
  await page.getByRole('button', { name: 'Training starten' }).click()
  await page.waitForTimeout(900)
  await page.screenshot({ path: shot('O33-laufend') })

  // Satz abschließen → Pausentimer
  await page.getByRole('button', { name: /Satz 1 abschließen/ }).click()
  await page.waitForTimeout(600)
  await page.screenshot({ path: shot('S45-pausentimer') })

  // Sätze / Wiederholungen / Gewichte
  await page.getByRole('button', { name: /Sätze$/ }).first().click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: shot('S35-saetze') })
  await page.getByRole('button', { name: 'Abbrechen' }).click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: /Wdh$/ }).first().click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: shot('S33-wiederholungen') })
  await page.getByRole('button', { name: 'Abbrechen' }).click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: /kg$/ }).first().click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: shot('S34-verfuegbare-gewichte') })
})

test('Training komplett durchführen und abschließen', async ({ page }) => {
  // 7 Übungen × 2–4 Sätze über die Oberfläche – WebKit/IndexedDB unter Windows ist langsam
  test.setTimeout(150_000)
  await page.clock.setFixedTime(new Date('2026-10-19T09:30:00'))
  await seededApp(page, '/training')
  await dismissStartSheets(page)
  await page.getByText('Push', { exact: true }).first().click()
  await page.waitForURL(/workout/)
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Starten' }).last().click()
  await page.getByRole('button', { name: 'Überspringen' }).click()
  await page.waitForTimeout(800)
  // alle Sätze aller Übungen abschließen; Pausen per Gedrückthalten überspringen
  for (let guard = 0; guard < 60; guard++) {
    const done = page.getByRole('button', { name: 'Training beenden' })
    if (await done.isVisible().catch(() => false)) {
      await done.click()
      break
    }
    const next = page.getByRole('button', { name: 'Nächste Übung' })
    if (await next.isVisible().catch(() => false)) {
      await next.click()
      await page.waitForTimeout(700)
      continue
    }
    const timer = page.getByRole('button', { name: /Pause: noch/ })
    if (await timer.isVisible().catch(() => false)) {
      // Gedrückt halten überspringt die Pause
      const box = (await timer.boundingBox())!
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.waitForTimeout(800)
      await page.mouse.up()
      await page.waitForTimeout(250)
      continue
    }
    const setBtn = page.getByRole('button', { name: /Satz \d+ abschließen/ })
    if (await setBtn.isVisible().catch(() => false)) {
      await setBtn.click()
      await page.waitForTimeout(250)
      continue
    }
    await page.waitForTimeout(300)
  }
  await page.waitForURL(/abschluss/)
  await page.waitForTimeout(2800)
  await page.screenshot({ path: shot('S46-abschluss-1') })
  await expect(page.getByText(/Streak/).first()).toBeVisible()
  await page.mouse.wheel(0, 900)
  await page.waitForTimeout(500)
  await page.screenshot({ path: shot('S47-abschluss-2') })
})

test('Mobility', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-19T09:30:00'))
  await seededApp(page, '/training')
  await dismissStartSheets(page)
  await page.getByText('Mobility', { exact: true }).first().click()
  await page.waitForURL(/workout/)
  await page.waitForTimeout(600)
  await page.screenshot({ path: shot('S36-mobility') })
  await page.getByRole('button', { name: 'Übung tauschen', exact: true }).first().click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: shot('S37-uebung-tauschen-mobility') })
})
