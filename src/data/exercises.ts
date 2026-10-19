import raw from './uebungen.json'
import type { EquipmentId, Exercise } from '../db/types'
import { EQUIPMENT } from './equipment'

/** Bibliothek aus src/data/uebungen.json (zum Selbst-Ergänzen gedacht). */
export const LIBRARY: Exercise[] = raw as Exercise[]

const byId = new Map<string, Exercise>(LIBRARY.map((e) => [e.id, e]))
let custom: Exercise[] = []

/** Eigene Übungen (aus der Datenbank) registrieren. */
export function setCustomExercises(list: Exercise[]) {
  custom = list
  for (const e of list) byId.set(e.id, e)
}

export function allExercises(): Exercise[] {
  return custom.length ? [...LIBRARY, ...custom] : LIBRARY
}

export function getExercise(id: string): Exercise | undefined {
  return byId.get(id)
}

/** Ohne Gerät = nur Körpergewicht oder Widerstandsband nötig. */
export function isOhneGeraet(ex: Exercise): boolean {
  return ex.equipment.every((id) => EQUIPMENT.find((m) => m.id === id)?.ohneGeraet)
}

/** Alle benötigten Geräte vorhanden? Körpergewicht ist immer verfügbar. */
export function isAvailable(ex: Exercise, available: EquipmentId[]): boolean {
  return ex.equipment.every((id) => id === 'koerpergewicht' || available.includes(id))
}

export function exerciseName(id: string): string {
  return byId.get(id)?.name ?? id
}
