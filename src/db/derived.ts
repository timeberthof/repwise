import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { today } from '../logic/dates'
import { weeklyStreak } from '../logic/streak'
import type { ISODate } from './types'

/** Tage mit abgeschlossenem Krafttraining. */
export async function loadDoneDates(): Promise<Set<ISODate>> {
  const done = await db.sessions.where('status').equals('fertig').toArray()
  return new Set(done.filter((s) => s.kind === 'kraft').map((s) => s.date))
}

export async function computeStreak(): Promise<number> {
  return weeklyStreak(today(), await loadDoneDates())
}

/** Aktuelle Serie (Flamme): Wochen in Folge mit mindestens einem Training. */
export function useStreak(): number {
  return useLiveQuery(computeStreak, []) ?? 0
}

export function useDoneDates(): Set<ISODate> | undefined {
  return useLiveQuery(loadDoneDates, [])
}
