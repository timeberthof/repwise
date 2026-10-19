/**
 * Migration bestehender Pläne auf die Planungsregeln v2 (höchstens 7 Übungen, Rollen, Wochenvolumen, Varianten).
 *
 * - läuft beim App-Start und nach jedem Backup-Import (alte Backups bleiben importierbar)
 * - betrifft nur aktive Pläne mit rulesVersion < 2; Plantage behalten ihre IDs, nur die Übungsliste wird neu geschrieben
 * - eigene Übungen bleiben, wo es geht; fixierte Übungen bleiben unverändert
 * - Verlauf (Einheiten, Sätze, Maximalkraft, Protokoll) wird nicht verändert; nur noch nicht begonnene,
 *   zukünftige Einheiten werden verworfen und mit den neuen Regeln neu angelegt
 * - jede Änderung landet im Anpassungsprotokoll
 */
import { db } from '../db'
import type { PlanExercise } from '../types'
import { rebalancePlan, type GeneratedDay } from '../../logic/planGenerator'
import { today } from '../../logic/dates'
import { loadPlanDays, planInputFor, PLAN_RULES_VERSION } from './plan'

let running: Promise<number> | null = null

/** Gibt die Anzahl migrierter Pläne zurück. Mehrfaches Aufrufen ist unbedenklich. */
export function migratePlanRules(): Promise<number> {
  running ??= run().finally(() => (running = null))
  return running
}

async function run(): Promise<number> {
  const profile = await db.profile.get('me')
  if (!profile) return 0
  const plans = (await db.plans.where('active').equals(1).toArray()).filter((p) => (p.rulesVersion ?? 1) < PLAN_RULES_VERSION)
  let n = 0
  for (const plan of plans) {
    const days = await loadPlanDays(plan.id!)
    const current = [...new Set(days.flatMap((d) => d.exercises.map((e) => e.exerciseId)))]
    const input = await planInputFor({ ...profile, split: plan.split }, [], current)
    const existing: GeneratedDay[] = days.map((d) => ({
      weekday: d.weekday,
      name: d.name,
      kind: d.kind,
      location: d.location,
      exercises: d.exercises.map(({ exerciseId, sets, repMin, repMax, targetRir, restSec, superset, role, anchor, variants, pinned }) => ({ exerciseId, sets, repMin, repMax, targetRir, restSec, superset, role, anchor, variants, pinned })),
    }))
    const { days: next, report } = rebalancePlan(input, existing)
    const t = today()
    await db.transaction('rw', [db.plans, db.planExercises, db.sessions, db.sessionExercises, db.adjustments], async () => {
      for (const d of days) {
        if (d.kind !== 'kraft') continue
        const g = next.find((x) => x.kind === 'kraft' && x.weekday === d.weekday && x.name === d.name)
        if (!g) continue
        await db.planExercises.where('planDayId').equals(d.id!).delete()
        await db.planExercises.bulkAdd(g.exercises.map((e, i) => ({ planDayId: d.id!, order: i, ...e }) as PlanExercise))
      }
      await db.plans.update(plan.id!, { rulesVersion: PLAN_RULES_VERSION })
      // noch nicht begonnene Einheiten ab heute neu anlegen lassen
      const pending = await db.sessions.filter((s) => s.planId === plan.id && s.status === 'geplant' && s.date >= t && !s.imported).toArray()
      for (const s of pending) {
        await db.sessionExercises.where('sessionId').equals(s.id!).delete()
        await db.sessions.delete(s.id!)
      }
      const changes = report.log.length ? ` Änderungen: ${report.log.join('; ')}.` : ''
      await db.adjustments.add({
        date: t,
        kind: 'plan',
        field: 'plan',
        before: null,
        after: null,
        title: 'Plan an neue Trainingsregeln angepasst',
        reason: `Höchstens 7 Übungen pro Einheit, Sätze/Wiederholungen/RIR nach Rolle, Wochenvolumen je Muskel ausgeglichen, Varianten zum Abwechseln hinterlegt.${changes}`,
      })
    })
    n++
  }
  return n
}
