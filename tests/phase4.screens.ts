import { test, expect, type Page } from '@playwright/test'
import { dismissStartSheets, seededApp, shot } from './helpers'

/** Ein Training per Modul-Import im Dev-Server abschließen (schneller als über die Oberfläche). */
async function doTraining(page: Page, date: string, reps = 8) {
  await page.evaluate(
    async ({ date, reps }) => {
      const m = await import('/src/db/repo/sessions.ts' + '')
      const { db } = await import('/src/db/db.ts' + '')
      const entries = await m.dayEntries(date)
      const id = await m.ensureSession(date, entries[0].planDay!.id!)
      await m.startSession(id, { energy: 8, sleep: 8 })
      for (const s of await db.sets.where('sessionId').equals(id).toArray()) await m.completeSet(s.id!, { reps, weight: s.weight, rir: 2 })
      await m.finishSession(id)
    },
    { date, reps },
  )
}

test('Woche blättern, Vorschau, Zyklus', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-21T10:00:00'))
  await seededApp(page, '/training')
  await dismissStartSheets(page)
  await doTraining(page, '2026-10-19')
  await page.reload()
  await page.waitForTimeout(2500)
  await dismissStartSheets(page)
  await page.screenshot({ path: shot('P4-training-woche') })

  await page.getByRole('button', { name: 'Wochenübersicht' }).first().click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: shot('P4-training-wochenuebersicht') })

  await page.getByRole('button', { name: 'Vorherige Woche' }).click()
  await page.waitForTimeout(700)
  await page.screenshot({ path: shot('P4-training-vergangen') })

  await page.getByRole('button', { name: 'Nächste Woche' }).click()
  await page.getByRole('button', { name: 'Nächste Woche' }).click()
  await page.waitForTimeout(700)
  await page.screenshot({ path: shot('P4-training-zukunft') })
  await page.getByText('Push', { exact: true }).first().click()
  await page.waitForURL(/vorschau/)
  await page.waitForTimeout(2200)
  await page.screenshot({ path: shot('P4-vorschau') })

  await page.goto('/?sim=iphone#/zyklus')
  await page.waitForTimeout(2200)
  await page.screenshot({ path: shot('P4-zyklus') })
  await page.getByRole('button', { name: /Woche 6/ }).click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: shot('P4-zyklus-menue') })
  await page.getByRole('button', { name: /Deload überspringen/ }).click()
  await page.waitForTimeout(700)
  await page.screenshot({ path: shot('P4-zyklus-geaendert') })
  await expect(page.getByText('Manuell').first()).toBeVisible()
})

test('Statistik-Detail und Verlauf', async ({ page }) => {
  // Zwei komplette Trainings über die Oberfläche – WebKit/IndexedDB unter Windows ist langsam
  test.setTimeout(150_000)
  await page.clock.setFixedTime(new Date('2026-10-20T18:00:00'))
  await seededApp(page, '/statistik')
  await dismissStartSheets(page)
  await doTraining(page, '2026-10-19', 8)
  await doTraining(page, '2026-10-20', 9)
  await page.reload()
  await page.waitForTimeout(2500)
  await dismissStartSheets(page)
  await page.screenshot({ path: shot('P4-statistik') })
  await page.getByText('Bankdrücken an der Multipresse').first().click()
  await page.waitForURL(/statistik\/uebung/)
  await page.waitForTimeout(2200)
  await page.screenshot({ path: shot('P4-uebung-detail') })
  await page.getByRole('button', { name: 'Gesamt' }).click()
  await page.getByRole('button', { name: 'Volumen', exact: true }).click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: shot('P4-uebung-detail-volumen'), fullPage: true })

  await page.goto('/?sim=iphone#/verlauf')
  await page.waitForTimeout(2200)
  await page.screenshot({ path: shot('P4-verlauf') })
  await page.goto('/?sim=iphone#/verlauf?tab=anpassungen')
  await page.waitForTimeout(2200)
  await page.screenshot({ path: shot('P4-anpassungen') })
  await page.goto('/?sim=iphone#/verlauf')
  await page.waitForTimeout(700)
  await page.getByText('Push').first().click()
  await page.waitForURL(/verlauf\/\d+/)
  await page.waitForTimeout(2000)
  await page.screenshot({ path: shot('P4-verlauf-detail') })
})

test('Zyklus planen', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-25T10:00:00'))
  await seededApp(page, '/zyklus/planen')
  await page.waitForTimeout(2500)
  await page.screenshot({ path: shot('P4-planen-1') })
  for (let i = 0; i < 9; i++) {
    await page.getByRole('button', { name: 'Weiter', exact: true }).click()
    await page.waitForTimeout(250)
    if (i === 0) await page.screenshot({ path: shot('P4-planen-2') })
  }
  await page.screenshot({ path: shot('P4-planen-korrekt') })
  await page.getByRole('button', { name: 'Weiter', exact: true }).click()
  await page.getByRole('button', { name: 'Fertig' }).waitFor({ timeout: 20_000 })
  await page.waitForTimeout(300)
  await page.screenshot({ path: shot('P4-planen-ergebnis') })
})
