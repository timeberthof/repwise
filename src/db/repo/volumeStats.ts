import { db } from '../db'
import type { ISODate, WeekType } from '../types'
import { addDays, today, weekdayIndex } from '../../logic/dates'
import { weekTypeFor } from '../../logic/cycle'
import { weekVolume, type VolumeGroup, type VolumeItem, type WeekVolume } from '../../logic/volume'
import { allowedExercises, possibleGroups } from '../../logic/selection'
import { adjustForWeek, dayEntries } from './sessions'
import { planForDate, planInputFor, selectionFor } from './plan'

export interface WeekMuscleSets {
  start: ISODate
  end: ISODate
  weekType: WeekType | null
  /** erledigte Arbeitssätze (Einheiten dieser Woche, anteilig gezählt) */
  done: WeekVolume
  /** geplant für die ganze Woche (erledigt + noch offen) */
  planned: WeekVolume
  possible: Set<VolumeGroup>
}

/** Sätze pro Muskelgruppe in der Woche (Mo–So) eines Datums: erledigt und geplant. */
export async function weekMuscleSets(date: ISODate = today()): Promise<WeekMuscleSets> {
  const start = addDays(date, -weekdayIndex(date))
  const end = addDays(start, 6)
  const doneLists: VolumeItem[][] = []
  const plannedLists: VolumeItem[][] = []
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i)
    for (const e of await dayEntries(d)) {
      if (e.kind !== 'kraft') continue
      const s = e.session
      if (s?.status === 'uebersprungen') continue
      if (s && e.sessionExercises) {
        const sets = await db.sets.where('sessionId').equals(s.id!).toArray()
        const done = e.sessionExercises.map((se) => ({ exerciseId: se.exerciseId, sets: sets.filter((x) => x.sessionExerciseId === se.id && x.done).length }))
        if (done.some((x) => x.sets)) doneLists.push(done)
        // fertig: was erledigt wurde; sonst die Vorgabe
        plannedLists.push(s.status === 'fertig' ? done : e.sessionExercises.map((se) => ({ exerciseId: se.exerciseId, sets: Math.max(se.sets, done.find((x) => x.exerciseId === se.exerciseId)?.sets ?? 0) })))
      } else if (!e.paused) {
        plannedLists.push(adjustForWeek(e.planExercises, e.weekType).map((pe) => ({ exerciseId: pe.exerciseId, sets: pe.sets })))
      }
    }
  }
  const plan = await planForDate(start)
  const profile = await db.profile.get('me')
  const possible = profile ? possibleGroups(allowedExercises(selectionFor(await planInputFor(profile)))) : new Set<VolumeGroup>()
  return {
    start,
    end,
    weekType: plan ? weekTypeFor(plan, start).type : null,
    done: weekVolume(doneLists),
    planned: weekVolume(plannedLists),
    possible,
  }
}
