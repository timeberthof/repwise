import { beforeAll, describe, expect, it } from 'vitest'
import { db } from '../db'
import { setNow } from '../../logic/dates'
import startwerte from '../../data/startwerte.beispiel.json'
import { profileDefaults, type Startwerte } from './startwerte'
import { emptyDraft, finishOnboarding } from '../../features/onboarding/draft'
import { migratePlanRules } from './migrate'
import { PLAN_RULES_VERSION } from './plan'
import { createBackup, parseBackup, restoreBackup, wipeAllData } from '../../lib/backup'

const s = startwerte as unknown as Startwerte

/** Plan in den Zustand vor den neuen Regeln versetzen: 9 Übungen am ersten Tag, keine Rollen/Varianten. */
async function makeOldPlan() {
  const plan = (await db.plans.where('active').equals(1).first())!
  await db.plans.update(plan.id!, { rulesVersion: undefined })
  const days = await db.planDays.where('planId').equals(plan.id!).filter((d) => d.kind === 'kraft').sortBy('order')
  for (const d of days) {
    await db.planExercises.where('planDayId').equals(d.id!).modify((pe) => {
      delete pe.role
      delete pe.anchor
      delete pe.variants
      pe.sets = 3
      pe.repMin = 8
      pe.repMax = 12
    })
  }
  const first = days[0]
  const count = await db.planExercises.where('planDayId').equals(first.id!).count()
  for (const [i, id] of ['adduktorenmaschine', 'kabel-crossover', 'kurzhantel-shrugs'].entries()) {
    await db.planExercises.add({ planDayId: first.id!, exerciseId: id, order: count + i, sets: 3, repMin: 8, repMax: 12, targetRir: 2, restSec: 120 })
  }
  return { plan, first }
}

describe('Migration auf die neuen Trainingsregeln', () => {
  beforeAll(async () => {
    setNow(new Date(2026, 9, 18, 10, 0))
    await db.delete()
    await db.open()
    await finishOnboarding(emptyDraft({ ...profileDefaults(s), onboardingDone: false, createdAt: 0 }, 80, 18, true), s)
  })

  it('kürzt Einheiten auf 7 Übungen, setzt Rollen und Varianten und lässt den Verlauf unverändert', async () => {
    const { plan, first } = await makeOldPlan()
    expect(await db.planExercises.where('planDayId').equals(first.id!).count()).toBeGreaterThan(7)
    // eine zukünftige, noch nicht begonnene Einheit
    const future = (await db.sessions.add({ date: '2026-10-20', planId: plan.id, planDayId: first.id, name: first.name, kind: 'kraft', weekType: 'intro', status: 'geplant', location: 'gym' })) as number
    const history = { sessions: await db.sessions.filter((x) => x.status === 'fertig').count(), strength: await db.strength.count(), sets: await db.sets.count() }

    expect(await migratePlanRules()).toBe(1)

    expect((await db.plans.get(plan.id!))!.rulesVersion).toBe(PLAN_RULES_VERSION)
    const days = await db.planDays.where('planId').equals(plan.id!).filter((d) => d.kind === 'kraft').toArray()
    for (const d of days) {
      const list = await db.planExercises.where('planDayId').equals(d.id!).toArray()
      expect(list.length).toBeLessThanOrEqual(7)
      for (const pe of list) {
        expect(pe.role).toBeDefined()
        expect(pe.variants?.length).toBeGreaterThan(0)
        expect(pe.sets).toBeGreaterThanOrEqual(2)
        expect(pe.sets).toBeLessThanOrEqual(4)
      }
    }
    // Plantage behalten ihre IDs, der Verlauf bleibt
    expect(await db.planDays.get(first.id!)).toBeDefined()
    expect(await db.sessions.filter((x) => x.status === 'fertig').count()).toBe(history.sessions)
    expect(await db.strength.count()).toBe(history.strength)
    expect(await db.sets.count()).toBe(history.sets)
    // nicht begonnene Einheit wird mit den neuen Regeln neu angelegt
    expect(await db.sessions.get(future)).toBeUndefined()
    const log = await db.adjustments.filter((a) => a.kind === 'plan').toArray()
    expect(log.at(-1)!.title).toBe('Plan an neue Trainingsregeln angepasst')
    // zweiter Lauf ändert nichts
    expect(await migratePlanRules()).toBe(0)
  })

  it('alte Backups bleiben importierbar und werden beim Import angepasst', async () => {
    await makeOldPlan()
    const text = JSON.stringify(await createBackup())
    await wipeAllData()
    const parsed = parseBackup(text)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    await restoreBackup(parsed.data)
    const plan = (await db.plans.where('active').equals(1).first())!
    expect(plan.rulesVersion).toBe(PLAN_RULES_VERSION)
    const days = await db.planDays.where('planId').equals(plan.id!).filter((d) => d.kind === 'kraft').toArray()
    for (const d of days) expect(await db.planExercises.where('planDayId').equals(d.id!).count()).toBeLessThanOrEqual(7)
  })
})
