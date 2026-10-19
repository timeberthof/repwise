import type { ISODate } from '../db/types'
import { addDays, weekdayIndex } from './dates'

export interface StreakInput {
  today: ISODate
  /** Tage mit abgeschlossenem Training */
  doneDates: Set<ISODate>
  /** Geplante Trainingstage (0 = Mo … 6 = So) */
  plannedWeekdays: number[]
  /** Pausierte Tage zählen nicht als verpasst */
  pausedDates?: Set<ISODate>
}

/**
 * Serie wie im Original: zählt erledigte Trainings rückwärts bis zum ersten verpassten
 * geplanten Trainingstag. Ruhetage unterbrechen nicht, der heutige Tag auch nicht.
 */
export function trainingStreak({ today, doneDates, plannedWeekdays, pausedDates }: StreakInput): number {
  let streak = 0
  for (let i = 0; i < 400; i++) {
    const d = addDays(today, -i)
    if (doneDates.has(d)) {
      streak++
      continue
    }
    if (i === 0) continue
    if (pausedDates?.has(d)) continue
    if (plannedWeekdays.includes(weekdayIndex(d))) break
  }
  return streak
}

export type DayState = 'done' | 'missed' | 'today' | 'future' | 'rest'

/** Zustand eines Tages für die Wochenreihe im Trainingsabschluss. */
export function dayState(date: ISODate, today: ISODate, doneDates: Set<ISODate>, plannedWeekdays: number[]): DayState {
  const planned = plannedWeekdays.includes(weekdayIndex(date))
  if (doneDates.has(date)) return date === today ? 'today' : 'done'
  if (date > today) return planned ? 'future' : 'rest'
  if (date === today) return planned ? 'future' : 'rest'
  return planned ? 'missed' : 'rest'
}
