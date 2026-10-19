/**
 * Leichte Variation von Training zu Training.
 *
 * - Ankerübungen (1–2 schwere Grundübungen je Einheit) bleiben im ganzen Zyklus gleich.
 * - Ergänzungs- und Isolationsübungen haben 2–3 gleichwertige Varianten: gleiches Bewegungsmuster, gleicher
 *   Zielmuskel, gleiche Rolle – aber anderer Winkel, Griff oder anderes Gerät. Sie rotieren von Einheit zu Einheit.
 * - Pro Einheit wechseln höchstens 3 Übungen (die rotierenden Übungen sind auf Gruppen verteilt, die abwechselnd wechseln).
 * - Fixierte Übungen und Deload-Wochen wechseln nicht.
 * - Jede Variante behält ihren eigenen Verlauf (Gewicht, Progression).
 */
import type { Exercise, ISODate, WeekType } from '../db/types'
import { PROGRESSION_CONFIG, type ProgressionConfig } from './progression'
import { roleOf } from './roles'
import { scoreExercise, type SelectionInput } from './selection'
import { addDays, diffDays, weekdayIndex } from './dates'

const HEAVY_LOAD = new Set(['langhantel', 'multipresse', 'maschine', 'kabelzug', 'sz_stange'])

/** Gleichwertige Varianten zu einer Übung (erste = die Übung selbst). */
export function variantsFor(ex: Exercise, pool: Exercise[], input: SelectionInput, notIn: string[] = [], cfg: ProgressionConfig = PROGRESSION_CONFIG): string[] {
  const role = roleOf(ex)
  const same = pool.filter((e) => e.id !== ex.id && !notIn.includes(e.id) && e.primaer === ex.primaer && e.muster === ex.muster && roleOf(e) === role)
  // gleiche Zielmuskeln (keine zusätzlichen Nebenmuskeln), ähnliche Schwierigkeit; anderes Gerät/Winkel leicht bevorzugt.
  // Mehrgelenksübungen bleiben in derselben Belastungsklasse (schwer beladbar ↔ Kurzhantel/Körpergewicht), damit sie gleichwertig sind.
  const heavy = (x: Exercise) => HEAVY_LOAD.has(x.equipment[0])
  const score = (e: Exercise) =>
    scoreExercise(e, input) +
    (e.equipment[0] !== ex.equipment[0] ? 6 : 0) -
    Math.abs(e.schwierigkeit - ex.schwierigkeit) * 3 -
    e.sekundaer.filter((m) => !ex.sekundaer.includes(m)).length * 5 -
    (role !== 'isolation' && heavy(e) !== heavy(ex) ? 15 : 0)
  const picks = same.sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name)).slice(0, cfg.planning.maxVariants - 1)
  return [ex.id, ...picks.map((e) => e.id)]
}

export interface RotatingExercise {
  exerciseId: string
  variants?: string[]
  anchor?: boolean
  pinned?: boolean
}

/** Rotierende Übungen einer Einheit (nicht Anker, nicht fixiert, mit mindestens 2 Varianten). */
export function rotating<T extends RotatingExercise>(list: T[]): T[] {
  return list.filter((e) => !e.anchor && !e.pinned && (e.variants?.length ?? 0) > 1)
}

/**
 * Variante je Übung bei der n-ten Einheit dieses Typs (0 = erste).
 * Rotierende Übungen werden auf Gruppen zu höchstens 3 verteilt; bei jeder Einheit wechselt genau eine Gruppe.
 */
export function resolveVariants<T extends RotatingExercise>(list: T[], occurrence: number, cfg: ProgressionConfig = PROGRESSION_CONFIG): string[] {
  const rot = rotating(list)
  const groups = Math.max(1, Math.ceil(rot.length / cfg.planning.maxRotationsPerSession))
  return list.map((e) => {
    const i = rot.indexOf(e)
    if (i < 0) return e.exerciseId
    const variants = e.variants!
    const cohort = i % groups
    const idx = Math.floor((occurrence + (groups - cohort) % groups) / groups) % variants.length
    return variants[idx]
  })
}

/** Wie viele Übungen wechseln von Einheit n−1 zu n? */
export function changesBetween<T extends RotatingExercise>(list: T[], occurrence: number, cfg: ProgressionConfig = PROGRESSION_CONFIG): number {
  if (occurrence <= 0) return 0
  const a = resolveVariants(list, occurrence - 1, cfg)
  const b = resolveVariants(list, occurrence, cfg)
  return a.filter((x, i) => x !== b[i]).length
}

/**
 * Laufende Nummer einer Einheit seit Planstart: gezählt werden alle Tage mit einer Einheit gleichen Namens
 * außerhalb von Deload-Wochen. In der Deload-Woche bleibt die Variante der letzten Einheit (gleiche Übungen).
 */
export function occurrenceIndex(opts: { startDate: ISODate; date: ISODate; weekdays: number[]; weekTypeOf: (date: ISODate) => WeekType }): number {
  const { startDate, date, weekdays, weekTypeOf } = opts
  const days = diffDays(startDate, date)
  if (days < 0) return 0
  let n = 0
  for (let i = 0; i < days; i++) {
    const d = addDays(startDate, i)
    if (weekdays.includes(weekdayIndex(d)) && weekTypeOf(d) !== 'deload') n++
  }
  return weekTypeOf(date) === 'deload' ? Math.max(0, n - 1) : n
}
