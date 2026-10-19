import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { BodyEntry, ISODate, Plan, Profile } from './types'
import { today } from '../logic/dates'
import { planForDate } from './repo/plan'

/** Profil: undefined = lädt noch, null = noch keins angelegt */
export function useProfile(): Profile | null | undefined {
  return useLiveQuery(async () => (await db.profile.get('me')) ?? null, [])
}

/** Plan, der an einem Tag gilt (Standard: heute). */
export function usePlanFor(date: ISODate = today()): Plan | null | undefined {
  return useLiveQuery(() => planForDate(date), [date])
}

export function useActivePlan(): Plan | null | undefined {
  return usePlanFor(today())
}

export function useBody(kind: BodyEntry['kind']): BodyEntry[] | undefined {
  return useLiveQuery(() => db.body.where('kind').equals(kind).sortBy('date'), [kind])
}

/** Letztes Körpergewicht (oder null) */
export function useCurrentWeight(): number | null | undefined {
  return useLiveQuery(async () => {
    const list = await db.body.where('kind').equals('weight').sortBy('date')
    return list.length ? list[list.length - 1].value : null
  }, [])
}
