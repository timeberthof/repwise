/**
 * Rollen in der Einheit: schwere Grundübung → ergänzende Mehrgelenksübung → Isolationsübung.
 * Die Rolle bestimmt Sätze, Wiederholungen, Pause, Ziel-RIR und die Reihenfolge (Werte in progression.ts).
 */
import type { Exercise, ExerciseRole, Experience, MovementPattern } from '../db/types'
import { PROGRESSION_CONFIG, roundWeight, type ProgressionConfig } from './progression'

const COMPOUND = new Set<MovementPattern>(['horizontal_druecken', 'vertikal_druecken', 'horizontal_ziehen', 'vertikal_ziehen', 'kniebeuge', 'hueftstreckung', 'ausfallschritt', 'glute_bruecke'])
/** Kniebeuge, Kreuzheben, Bankdrücken: 5–8 Wdh. (Rudern, Schulterdrücken, Klimmzüge: 6–10) */
const HEAVY = new Set<MovementPattern>(['kniebeuge', 'hueftstreckung', 'horizontal_druecken'])
/** Isolation mit 12–20 Wdh.: Seitheben, hintere Schulter, Waden, Bauch, Unterarme, Ab-/Adduktion */
const HIGH_REP = new Set<MovementPattern>(['seitheben', 'frontheben', 'reverse_fly', 'wadenheben', 'rumpfbeuge', 'rotation', 'rumpf_stabilitaet', 'unterarm', 'abduktion', 'adduktion', 'rueckenstreckung'])
const LOWER = new Set<MovementPattern>(['kniebeuge', 'hueftstreckung', 'ausfallschritt', 'glute_bruecke'])
const SHORT_REST = new Set<MovementPattern>(['wadenheben', 'rumpfbeuge', 'rotation', 'rumpf_stabilitaet', 'unterarm'])
const LONG_REST = new Set<MovementPattern>(['beinbeugen', 'beinstrecken', 'brust_isolation'])

export const ROLE_LABEL: Record<ExerciseRole, string> = { grund: 'Grundübung', ergaenzung: 'Ergänzungsübung', isolation: 'Isolationsübung' }

/** Rolle aus der Bibliothek, sonst aus dem Bewegungsmuster (eigene Übungen). */
export function roleOf(ex: Exercise): ExerciseRole {
  if (ex.rolle) return ex.rolle
  return COMPOUND.has(ex.muster) ? 'ergaenzung' : 'isolation'
}

export function repRangeFor(ex: Exercise, role: ExerciseRole = roleOf(ex), cfg: ProgressionConfig = PROGRESSION_CONFIG): [number, number] {
  const r = cfg.roles
  if (role === 'grund') return [...(HEAVY.has(ex.muster) ? r.grund.repsHeavy : r.grund.reps)]
  if (role === 'ergaenzung') return [...r.ergaenzung.reps]
  return [...(HIGH_REP.has(ex.muster) ? r.isolation.repsHigh : r.isolation.reps)]
}

export function restFor(ex: Exercise, role: ExerciseRole = roleOf(ex), cfg: ProgressionConfig = PROGRESSION_CONFIG): number {
  const r = cfg.roles
  if (role === 'grund') return LOWER.has(ex.muster) ? r.grund.restLower : r.grund.restUpper
  if (role === 'ergaenzung') return LOWER.has(ex.muster) ? r.ergaenzung.restLower : r.ergaenzung.restUpper
  return SHORT_REST.has(ex.muster) ? r.isolation.restShort : LONG_REST.has(ex.muster) ? r.isolation.restLong : r.isolation.rest
}

/** Erlaubte Arbeitssätze je Rolle (Grund 3–4, Ergänzung 2–4, Isolation 2–3; immer innerhalb 2–4). */
export function setRange(role: ExerciseRole | undefined, cfg: ProgressionConfig = PROGRESSION_CONFIG): [number, number] {
  const P = cfg.planning
  if (!role) return [P.minSetsPerExercise, P.maxSetsPerExercise]
  const r = cfg.roles[role]
  return [Math.max(P.minSetsPerExercise, r.minSets), Math.min(P.maxSetsPerExercise, r.maxSets)]
}

/** Arbeitssätze nach Rolle und Erfahrung; Schwerpunkt-Muskeln +1 (innerhalb des Bereichs der Rolle). */
export function setsFor(role: ExerciseRole, experience: Experience, focus = false, cfg: ProgressionConfig = PROGRESSION_CONFIG): number {
  const [lo, hi] = setRange(role, cfg)
  return Math.min(hi, Math.max(lo, cfg.roles[role].sets[experience] + (focus ? 1 : 0)))
}

export function rirFor(role: ExerciseRole, cfg: ProgressionConfig = PROGRESSION_CONFIG): number {
  return cfg.roles[role].rir
}

export interface RolePrescription {
  role: ExerciseRole
  sets: number
  repMin: number
  repMax: number
  targetRir: number
  restSec: number
}

export function prescriptionForRole(ex: Exercise, experience: Experience, focus = false, role: ExerciseRole = roleOf(ex)): RolePrescription {
  const [repMin, repMax] = repRangeFor(ex, role)
  return { role, sets: setsFor(role, experience, focus), repMin, repMax, targetRir: rirFor(role), restSec: restFor(ex, role) }
}

/** Reihenfolge in der Einheit: Grundübungen → Ergänzung → Isolation (Arme, hintere Schulter, Waden, Bauch zum Schluss). */
export function orderRank(ex: Exercise, role: ExerciseRole = roleOf(ex), anchor = false): number {
  if (role === 'grund') return anchor ? 0 : 1
  if (role === 'ergaenzung') return anchor ? 1 : 2
  const late: Partial<Record<MovementPattern, number>> = { bizeps_curl: 4, trizeps_streckung: 4, unterarm: 5, reverse_fly: 5, shrug: 5, wadenheben: 6, rumpfbeuge: 7, rotation: 7, rumpf_stabilitaet: 7 }
  return late[ex.muster] ?? 3
}

export function isCompound(ex: Exercise): boolean {
  return COMPOUND.has(ex.muster)
}

// ---------------------------------------------------------------------------
// Wiederholungsbereiche im Sheet „Wiederholungen“

export const REP_RANGES: [number, number][] = [
  [5, 8],
  [6, 10],
  [8, 12],
  [10, 15],
  [12, 20],
]

/** Empfohlener Bereich zuerst (nach Rolle), danach eine sinnvolle Alternative. */
export function recommendedRepRanges(ex: Exercise): [number, number][] {
  if (ex.art === 'mobility') return [[8, 12]]
  const role = roleOf(ex)
  const main = repRangeFor(ex, role)
  const alt: [number, number] = role === 'grund' ? [8, 12] : role === 'ergaenzung' ? [6, 10] : main[0] === 12 ? [10, 15] : [12, 20]
  return [main, alt]
}

export function isRecommendedRange(ex: Exercise, min: number, max: number): boolean {
  return recommendedRepRanges(ex).some(([a, b]) => a === min && b === max)
}

// ---------------------------------------------------------------------------
// Erklärungen in der App

/** RIR kurz erklärt – je Übung angezeigt. */
export function rirExplanation(rir: number, role: ExerciseRole): string {
  const base = rir === 0 ? 'RIR 0 = bis zur letzten sauberen Wiederholung.' : `RIR ${rir} = aufhören, wenn noch ${rir} saubere Wiederholung${rir === 1 ? '' : 'en'} möglich ${rir === 1 ? 'wäre' : 'wären'}.`
  return role === 'isolation' && rir > 0 ? `${base} Der letzte Satz darf bis knapp ans Versagen gehen.` : base
}

/** Aufwärmsätze (zählen nicht als Arbeitssätze) – nur bei der ersten schweren Grundübung. */
export function warmupSets(weight: number | null, step: number): { reps: number; weight: number | null }[] {
  const plan: [number, number][] = [
    [0.4, 8],
    [0.6, 5],
    [0.8, 3],
  ]
  if (!weight) return plan.map(([, reps]) => ({ reps, weight: null }))
  const out: { reps: number; weight: number | null }[] = []
  for (const [f, reps] of plan) {
    const w = roundWeight(weight * f, step || 2.5, 'nearest')
    if (w < weight && !out.some((x) => x.weight === w)) out.push({ reps, weight: w })
  }
  return out
}
