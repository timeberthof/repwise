import { db, kvGet } from '../db'
import type { ISODate, Plan, PlanDay, PlanExercise, Profile } from '../types'
import { generatePlan, type GeneratedDay } from '../../logic/planGenerator'
import { allExercises } from '../../data/exercises'
import { defaultPlanStart } from '../../logic/cycle'
import { today, weekdayIndex } from '../../logic/dates'
import type { WorkingWeight } from './startwerte'

/** Übungen mit vorhandenem Verlauf (Startwerte oder eigene Trainings). */
export async function exercisesWithHistory(): Promise<string[]> {
  const ids = new Set<string>()
  await db.strength.each((p) => ids.add(p.exerciseId))
  const ww = await kvGet<Record<string, WorkingWeight>>('startwerte.arbeitsgewichte', {})
  Object.keys(ww).forEach((id) => ids.add(id))
  return [...ids]
}

export async function buildPlanDays(profile: Profile, avoid: string[] = []): Promise<GeneratedDay[]> {
  return generatePlan({
    split: profile.split,
    weekdays: profile.weekdays,
    sessionMinutes: profile.sessionMinutes,
    experience: profile.experience,
    focus: profile.focus,
    equipment: profile.equipment,
    excluded: profile.excludedExercises,
    pains: profile.pains,
    location: profile.location,
    mobility: profile.mobility,
    preferred: (await exercisesWithHistory()).filter((id) => !avoid.includes(id)),
    avoid,
    library: allExercises(),
  })
}

// ---------------------------------------------------------------------------
// Welcher Plan gilt an welchem Tag?

/** Gültiger Plan an einem Tag: der aktive Plan mit dem spätesten Start ≤ Tag. */
export async function planForDate(date: ISODate): Promise<Plan | null> {
  const plans = await db.plans.where('active').equals(1).toArray()
  const valid = plans.filter((p) => p.startDate <= date).sort((a, b) => b.startDate.localeCompare(a.startDate) || b.createdAt - a.createdAt)
  if (valid.length) return valid[0]
  // Vor dem ersten Start: der früheste Plan (damit z. B. „Plan startet am …“ angezeigt werden kann)
  return plans.sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? null
}

/** Bereits geplanter, noch nicht gestarteter Folgeplan. */
export async function upcomingPlan(date: ISODate = today()): Promise<Plan | null> {
  const plans = await db.plans.where('active').equals(1).toArray()
  const cur = await planForDate(date)
  return plans.filter((p) => p.startDate > date && p.id !== cur?.id).sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? null
}

/**
 * Speichert einen neuen Plan. Ältere Pläne bleiben bis zum Start des neuen gültig (Verlauf bleibt erhalten);
 * Pläne, die am selben Tag oder später starten würden, werden ersetzt.
 */
export async function savePlan(days: GeneratedDay[], opts: { startDate: string; split: Profile['split']; source: Plan['source']; status?: Plan['status'] }): Promise<number> {
  return db.transaction('rw', [db.plans, db.planDays, db.planExercises], async () => {
    await db.plans.filter((p) => p.active === 1 && p.startDate >= opts.startDate).modify({ active: 0 })
    const planId = (await db.plans.add({
      createdAt: Date.now(),
      startDate: opts.startDate,
      cycleWeeks: 6,
      active: 1,
      split: opts.split,
      weekOverrides: {},
      status: opts.status ?? 'aktiv',
      source: opts.source,
    })) as number
    let order = 0
    for (const d of days) {
      const dayId = (await db.planDays.add({ planId, name: d.name, kind: d.kind, weekday: d.weekday, order: order++, location: d.location } as PlanDay)) as number
      await db.planExercises.bulkAdd(d.exercises.map((e, i) => ({ planDayId: dayId, order: i, ...e }) as PlanExercise))
    }
    return planId
  })
}

/** Plan aus dem Profil erzeugen und speichern. */
export async function createPlanFromProfile(profile: Profile, source: Plan['source'], startDate?: string, avoid: string[] = []): Promise<number> {
  const days = await buildPlanDays(profile, avoid)
  const t = today()
  return savePlan(days, { startDate: startDate ?? defaultPlanStart(t, weekdayIndex(t)), split: profile.split, source })
}

/** Bestehenden Plan kopieren („Anpassungen beibehalten“). */
export async function copyPlan(planId: number, startDate: string): Promise<number | null> {
  const plan = await db.plans.get(planId)
  if (!plan?.id) return null
  const days = await db.planDays.where('planId').equals(plan.id).sortBy('order')
  const gen: GeneratedDay[] = []
  for (const d of days) {
    const ex = await db.planExercises.where('planDayId').equals(d.id!).sortBy('order')
    gen.push({ weekday: d.weekday, name: d.name, kind: d.kind, location: d.location, exercises: ex.map(({ exerciseId, sets, repMin, repMax, targetRir, restSec, superset }) => ({ exerciseId, sets, repMin, repMax, targetRir, restSec, superset })) })
  }
  return savePlan(gen, { startDate, split: plan.split, source: 'zyklus', status: plan.status })
}

/** Plan direkt ab heute neu erstellen (nach Änderungen in den Einstellungen) und noch nicht begonnene Einheiten verwerfen. */
export async function regeneratePlanNow(profile: Profile): Promise<number> {
  const cur = await planForDate(today())
  const t = today()
  const start = cur && cur.startDate <= t ? cur.startDate : defaultPlanStart(t, weekdayIndex(t))
  const days = await buildPlanDays(profile)
  // Laufender Zyklus bleibt erhalten (gleicher Start), nur die Übungen werden neu gewählt
  const id = await savePlan(days, { startDate: start, split: profile.split, source: 'manuell', status: cur?.status })
  if (cur?.weekOverrides && Object.keys(cur.weekOverrides).length) await db.plans.update(id, { weekOverrides: cur.weekOverrides })
  const pending = await db.sessions.filter((s) => s.status === 'geplant' && s.date >= t && !s.imported).toArray()
  for (const s of pending) {
    await db.sessionExercises.where('sessionId').equals(s.id!).delete()
    await db.sessions.delete(s.id!)
  }
  return id
}

export interface PlanDayWithExercises extends PlanDay {
  exercises: PlanExercise[]
}

export async function loadPlanDays(planId: number): Promise<PlanDayWithExercises[]> {
  const days = await db.planDays.where('planId').equals(planId).sortBy('order')
  const out: PlanDayWithExercises[] = []
  for (const d of days) out.push({ ...d, exercises: await db.planExercises.where('planDayId').equals(d.id!).sortBy('order') })
  return out
}
