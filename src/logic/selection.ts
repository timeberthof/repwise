/**
 * Welche Übungen dürfen in den Plan? Equipment, Ausschlüsse, Schmerzen; Bewertung nach Verlauf,
 * Erfahrung und Trainingsort.
 */
import type { EquipmentId, Exercise, ExerciseRole, Experience, Pain, TrainingLocation } from '../db/types'
import { isAvailable } from '../data/exercises'
import { PAIN_REGIONS } from '../data/muskeln'
import { roleOf } from './roles'
import { primaryGroup, type VolumeGroup } from './volume'

export interface SelectionInput {
  equipment: EquipmentId[]
  excluded: string[]
  pains: Pain[]
  location: TrainingLocation
  experience: Experience
  /** Übungen mit vorhandenem Verlauf (bzw. aktuell im Plan) werden bevorzugt */
  preferred: string[]
  /** Möglichst vermeiden (z. B. Stagnation) */
  avoid?: string[]
  library: Exercise[]
}

export function blockedJoints(pains: Pain[]): Set<string> {
  const set = new Set<string>()
  for (const p of pains) {
    if (p.level < 5) continue
    PAIN_REGIONS.find((r) => r.id === p.region)?.joints.forEach((j) => set.add(j))
  }
  return set
}

/** Alle Kraftübungen, die eingeplant werden dürfen. */
export function allowedExercises(input: SelectionInput): Exercise[] {
  const blocked = blockedJoints(input.pains)
  return input.library.filter(
    (e) => e.art === 'kraft' && e.einheit !== 'sekunden' && isAvailable(e, input.equipment) && !input.excluded.includes(e.id) && !e.gelenke.some((j) => blocked.has(j)),
  )
}

/** Bewertung einer Übung (höher = besser). */
export function scoreExercise(e: Exercise, input: SelectionInput, preferRoles?: ExerciseRole[]): number {
  let s = 0
  const pref = input.preferred.indexOf(e.id)
  if (pref >= 0) s += 100
  if (input.avoid?.includes(e.id)) s -= 200
  if (input.experience === 'anfaenger') s -= (e.schwierigkeit - 1) * 15
  if (input.experience === 'fortgeschritten') s -= Math.max(0, e.schwierigkeit - 2) * 10
  const main = e.equipment[0]
  // Im Gym geführte Geräte bevorzugen (sicher, gut steigerbar); sonst freie Gewichte
  if (input.location === 'gym' && (main === 'maschine' || main === 'kabelzug' || main === 'multipresse')) s += 8
  if (main === 'koerpergewicht' || main === 'widerstandsband') s -= input.location === 'gym' ? 20 : 0
  // Isolation: sauber zielende Übungen (wenige Nebenmuskeln) bevorzugen
  if (roleOf(e) === 'isolation') s -= e.sekundaer.length * 4
  if (preferRoles?.length) {
    const i = preferRoles.indexOf(roleOf(e))
    s += i < 0 ? -40 : (preferRoles.length - i) * 10
  }
  return s
}

export function sortByScore(list: Exercise[], input: SelectionInput, preferRoles?: ExerciseRole[]): Exercise[] {
  return [...list].sort((a, b) => scoreExercise(b, input, preferRoles) - scoreExercise(a, input, preferRoles) || a.name.localeCompare(b.name))
}

/** Gruppen, für die es überhaupt eine erlaubte Übung gibt. */
export function possibleGroups(pool: Exercise[]): Set<VolumeGroup> {
  const set = new Set<VolumeGroup>()
  for (const e of pool) {
    const g = primaryGroup(e)
    if (g) set.add(g)
  }
  return set
}

/** Rollen, die beim Ergänzen einer Gruppe bevorzugt werden (große Muskeln: Mehrgelenk, kleine: Isolation). */
export function preferredRolesFor(g: VolumeGroup): ExerciseRole[] {
  return g === 'gesaess' || g === 'quadrizeps' || g === 'beinbeuger' || g === 'ruecken' || g === 'brust' ? ['ergaenzung', 'isolation', 'grund'] : ['isolation', 'ergaenzung', 'grund']
}
