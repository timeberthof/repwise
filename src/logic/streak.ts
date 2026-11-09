import type { ISODate } from '../db/types'
import { addDays, weekdayIndex } from './dates'

/** Montag der Woche eines Datums. */
export const weekStart = (d: ISODate) => addDays(d, -weekdayIndex(d))

/**
 * Serie ohne Plan: Wochen in Folge mit mindestens einem Training. Die laufende Woche zählt mit, sobald trainiert
 * wurde; ist sie noch leer, bricht die Serie dadurch nicht ab.
 */
export function weeklyStreak(today: ISODate, doneDates: Set<ISODate>): number {
  const weeks = new Set([...doneDates].map(weekStart))
  let w = weekStart(today)
  if (!weeks.has(w)) w = addDays(w, -7)
  let n = 0
  while (weeks.has(w) && n < 520) {
    n++
    w = addDays(w, -7)
  }
  return n
}

export type DayState = 'done' | 'today' | 'future' | 'rest'

/** Zustand eines Tages für die Wochenreihe im Trainingsabschluss. */
export function dayState(date: ISODate, today: ISODate, doneDates: Set<ISODate>): DayState {
  if (doneDates.has(date)) return date === today ? 'today' : 'done'
  if (date > today) return 'future'
  return 'rest'
}
