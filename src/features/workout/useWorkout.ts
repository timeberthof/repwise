import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { Exercise, Session, SessionExercise, SetEntry } from '../../db/types'
import { getExercise } from '../../data/exercises'

export interface WorkoutExercise extends SessionExercise {
  exercise: Exercise
  sets_: SetEntry[]
  doneCount: number
}

export interface WorkoutData {
  session: Session
  items: WorkoutExercise[]
}

/** Live-Daten eines Workouts (Einheit, Übungen, Sätze). */
export function useWorkout(sessionId: number): WorkoutData | null | undefined {
  return useLiveQuery(async () => {
    const session = await db.sessions.get(sessionId)
    if (!session) return null
    const list = await db.sessionExercises.where('sessionId').equals(sessionId).sortBy('order')
    const sets = await db.sets.where('sessionId').equals(sessionId).toArray()
    const items: WorkoutExercise[] = []
    for (const se of list) {
      const exercise = getExercise(se.exerciseId)
      if (!exercise) continue
      const own = sets.filter((x) => x.sessionExerciseId === se.id).sort((a, b) => a.index - b.index)
      items.push({ ...se, exercise, sets_: own, doneCount: own.filter((x) => x.done).length })
    }
    return { session, items }
  }, [sessionId])
}

/** Text unter dem Übungsnamen: „2 Sätze x 50 kg“ / „3 Sätze x Körpergewicht“ */
export function prescriptionText(it: Pick<WorkoutExercise, 'sets' | 'weight' | 'exercise' | 'weightIsEstimate'>): string {
  const n = `${it.sets} ${it.sets === 1 ? 'Satz' : 'Sätze'}`
  const bw = it.exercise.gewichtsart === 'koerpergewicht' || it.exercise.gewichtsschritt === 0
  if (bw && !it.weight) return `${n} x Körpergewicht`
  if (!it.weight) return `${n} x Gewicht wählen`
  const w = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(it.weight)
  const suffix = it.exercise.gewichtsart === 'zusatzgewicht' ? ' Zusatz' : ''
  return `${n} x ${w} kg${suffix}${it.weightIsEstimate ? ' (Schätzung)' : ''}`
}
