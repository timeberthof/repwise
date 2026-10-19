import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { addDays, today } from '../logic/dates'
import { trainingStreak } from '../logic/streak'
import { calculateCalories } from '../logic/calories'
import { ageOn } from '../logic/dates'
import type { ISODate, Plan, Profile } from './types'
import { planForDate } from './repo/plan'

/** Tage mit abgeschlossenem Krafttraining. */
export async function loadDoneDates(): Promise<Set<ISODate>> {
  const done = await db.sessions.where('status').equals('fertig').toArray()
  return new Set(done.filter((s) => s.kind === 'kraft').map((s) => s.date))
}

export function pausedDates(plan: Plan | null | undefined, to: ISODate = today()): Set<ISODate> {
  const set = new Set<ISODate>()
  if (plan?.status === 'pausiert' && plan.pausedSince) {
    for (let d = plan.pausedSince; d <= to; d = addDays(d, 1)) set.add(d)
  }
  return set
}

export async function computeStreak(profile: Profile | null, plan: Plan | null): Promise<number> {
  const doneDates = await loadDoneDates()
  const weekdays = profile?.weekdays ?? [0, 1, 2, 3, 4, 5]
  return trainingStreak({ today: today(), doneDates, plannedWeekdays: weekdays, pausedDates: pausedDates(plan) })
}

/** Aktuelle Trainings-Serie (Flamme). */
export function useStreak(): number {
  return (
    useLiveQuery(async () => {
      const profile = (await db.profile.get('me')) ?? null
      const plan = await planForDate(today())
      return computeStreak(profile, plan)
    }, []) ?? 0
  )
}

export function useDoneDates(): Set<ISODate> | undefined {
  return useLiveQuery(loadDoneDates, [])
}

/** Kalorienbedarf aus Profil und letztem Gewicht. */
export function useCalories() {
  return useLiveQuery(async () => {
    const profile = await db.profile.get('me')
    if (!profile) return null
    const weights = await db.body.where('kind').equals('weight').sortBy('date')
    const weight = weights.length ? weights[weights.length - 1].value : null
    if (!weight) return null
    return {
      weight,
      age: ageOn(profile.birthDate),
      ...calculateCalories({ sex: profile.sex, weightKg: weight, heightCm: profile.heightCm, age: ageOn(profile.birthDate), activity: profile.activity, goal: profile.goal }),
    }
  }, [])
}
