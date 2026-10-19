import { test, expect } from '@playwright/test'

/** Lange Listen im Onboarding (Übungen ausschließen, Startwerte) lassen sich bis zum Ende scrollen. */
test('Onboarding-Listen sind scrollbar', async ({ page }) => {
  await page.goto('/?sim=iphone#/onboarding')
  await page.waitForTimeout(700)
  const weiter = page.getByRole('button', { name: 'Weiter', exact: true })
  while ((await page.locator('h1').textContent()) !== 'Übungen ausschließen') {
    await weiter.click()
    await page.waitForTimeout(150)
  }
  const scroller = page.locator('.overflow-y-auto').first()
  const list = page.locator('div.overflow-hidden.rounded-xl').last()
  // alle Kraftübungen, nicht nur die ersten 60
  expect(await list.locator('button').count()).toBeGreaterThan(120)
  // Liste wird nicht auf Bildschirmhöhe gestaucht
  const clipped = await list.evaluate((el) => el.scrollHeight - el.clientHeight)
  expect(clipped).toBe(0)
  // per Wischen bis zur letzten Übung
  await scroller.hover()
  for (let i = 0; i < 40; i++) await page.mouse.wheel(0, 600)
  await expect(list.locator('button').last()).toBeInViewport()

  await weiter.click()
  await expect(page.locator('h1')).toHaveText('Deine Startwerte')
  const startList = page.locator('div.overflow-hidden.rounded-xl').last()
  expect(await startList.evaluate((el) => el.scrollHeight - el.clientHeight)).toBe(0)
})
