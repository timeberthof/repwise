import type { ISODate, Plan, WeekType } from '../db/types'
import { addDays, diffDays } from './dates'
import { PROGRESSION_CONFIG } from './progression'

/** Woche im Zyklus (0-basiert). Nach Zyklusende läuft die Rotation weiter, bis ein neuer Plan erstellt wird. */
export function weekIndex(plan: Pick<Plan, 'startDate'>, date: ISODate): number {
  return Math.floor(diffDays(plan.startDate, date) / 7)
}

/** Automatischer Typ einer Woche (ohne manuelle Änderung). */
export function autoWeekType(index: number, cycleWeeks = PROGRESSION_CONFIG.cycle.length): WeekType {
  const seq = PROGRESSION_CONFIG.cycle
  const i = ((index % cycleWeeks) + cycleWeeks) % cycleWeeks
  return seq[Math.min(i, seq.length - 1)]
}

/**
 * Typ einer Woche. Manuelle Änderungen gelten nur für genau diese Woche;
 * die folgenden Wochen laufen normal weiter (DECISIONS.md, Frage 14).
 */
export function weekTypeFor(plan: Pick<Plan, 'startDate' | 'cycleWeeks' | 'weekOverrides'>, date: ISODate): { type: WeekType; manual: boolean; index: number } {
  const index = weekIndex(plan, date)
  const manual = plan.weekOverrides?.[index]
  if (manual) return { type: manual, manual: true, index }
  return { type: autoWeekType(index, plan.cycleWeeks), manual: false, index }
}

export function cycleEnd(plan: Pick<Plan, 'startDate' | 'cycleWeeks'>): ISODate {
  return addDays(plan.startDate, plan.cycleWeeks * 7 - 1)
}

export function nextCycleStart(plan: Pick<Plan, 'startDate' | 'cycleWeeks'>, date: ISODate): ISODate {
  const idx = weekIndex(plan, date)
  const cycleNo = Math.floor(idx / plan.cycleWeeks)
  return addDays(plan.startDate, (cycleNo + 1) * plan.cycleWeeks * 7)
}

/** Letzte Woche des (aktuellen) Mesozyklus → Hinweis „Mesozyklus beenden“. */
export function isLastCycleWeek(plan: Pick<Plan, 'startDate' | 'cycleWeeks'>, date: ISODate): boolean {
  const idx = weekIndex(plan, date)
  return idx >= 0 && idx % plan.cycleWeeks === plan.cycleWeeks - 1
}

/** Startdatum für einen neuen Plan: Montag dieser Woche (Mo–Mi) bzw. nächster Montag (Do–So). */
export function defaultPlanStart(today: ISODate, weekday: number): ISODate {
  return weekday <= 2 ? addDays(today, -weekday) : addDays(today, 7 - weekday)
}
