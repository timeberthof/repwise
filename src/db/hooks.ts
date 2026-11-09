import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { BodyEntry, Profile } from './types'

/** Profil: undefined = lädt noch, null = noch keins angelegt */
export function useProfile(): Profile | null | undefined {
  return useLiveQuery(async () => (await db.profile.get('me')) ?? null, [])
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
