/**
 * Erzeugt einen Trainingsplan aus den Onboarding-Antworten:
 * Split passend zu den Trainingstagen, Volumen passend zur Erfahrung,
 * Übungsauswahl nach Equipment, Schwerpunkten, Ausschlüssen und Schmerzen.
 */
import type { EquipmentId, Exercise, Experience, MovementPattern, MuscleId, Pain, SplitId, TrainingLocation } from '../db/types'
import { isAvailable } from '../data/exercises'
import { PAIN_REGIONS } from '../data/muskeln'

export interface PlanInput {
  split: SplitId
  weekdays: number[]
  sessionMinutes: number
  experience: Experience
  focus: MuscleId[]
  equipment: EquipmentId[]
  excluded: string[]
  pains: Pain[]
  location: TrainingLocation
  mobility: boolean
  /** Übungen mit vorhandenem Verlauf werden bevorzugt (Startwerte bleiben nutzbar). */
  preferred: string[]
  /** Übungen, die möglichst durch eine Variante ersetzt werden sollen (z. B. Stagnation) */
  avoid?: string[]
  library: Exercise[]
}

export interface GeneratedExercise {
  exerciseId: string
  sets: number
  repMin: number
  repMax: number
  targetRir: number
  restSec: number
  superset?: boolean
}

export interface GeneratedDay {
  weekday: number
  name: string
  kind: 'kraft' | 'mobility'
  location: TrainingLocation
  exercises: GeneratedExercise[]
}

interface Slot {
  muscle: MuscleId
  patterns?: MovementPattern[]
  main?: boolean
}

const PRESS_H: MovementPattern[] = ['horizontal_druecken']
const PRESS_V: MovementPattern[] = ['vertikal_druecken']
const PULL_V: MovementPattern[] = ['vertikal_ziehen']
const PULL_H: MovementPattern[] = ['horizontal_ziehen']
const SQUAT: MovementPattern[] = ['kniebeuge']
const HINGE: MovementPattern[] = ['hueftstreckung']

/** Tagesvorlagen je Split – Reihenfolge = Priorität (wird nach Zeit gekürzt). */
export const DAY_TEMPLATES: Record<string, { name: string; slots: Slot[] }> = {
  // Push | Pull wie im Original: drückende Übungen inkl. kniedominanter Beine, ziehende inkl. Hüftstrecker
  push: {
    name: 'Push',
    slots: [
      { muscle: 'brust', patterns: PRESS_H, main: true },
      { muscle: 'mittlere_schulter', patterns: PRESS_V, main: true },
      { muscle: 'quadrizeps', patterns: SQUAT, main: true },
      { muscle: 'brust', patterns: ['brust_isolation'] },
      { muscle: 'trizeps', patterns: ['trizeps_streckung'] },
      { muscle: 'mittlere_schulter', patterns: ['seitheben'] },
      { muscle: 'quadrizeps', patterns: ['beinstrecken'] },
      { muscle: 'adduktoren' },
      { muscle: 'nacken' },
      { muscle: 'waden' },
    ],
  },
  pull: {
    name: 'Pull',
    slots: [
      { muscle: 'ruecken', patterns: PULL_V, main: true },
      { muscle: 'ruecken', patterns: PULL_H, main: true },
      { muscle: 'beinbeuger', patterns: HINGE, main: true },
      { muscle: 'bizeps' },
      { muscle: 'hintere_schulter' },
      { muscle: 'beinbeuger', patterns: ['beinbeugen'] },
      { muscle: 'bauch' },
      { muscle: 'gesaess', patterns: ['glute_bruecke', 'hueftstreckung', 'abduktion'] },
      { muscle: 'unterarme' },
    ],
  },
  ppl_push: {
    name: 'Push',
    slots: [
      { muscle: 'brust', patterns: PRESS_H, main: true },
      { muscle: 'mittlere_schulter', patterns: PRESS_V, main: true },
      { muscle: 'brust', patterns: PRESS_H },
      { muscle: 'brust', patterns: ['brust_isolation'] },
      { muscle: 'mittlere_schulter', patterns: ['seitheben'] },
      { muscle: 'trizeps', patterns: ['trizeps_streckung'] },
      { muscle: 'trizeps' },
    ],
  },
  ppl_pull: {
    name: 'Pull',
    slots: [
      { muscle: 'ruecken', patterns: PULL_V, main: true },
      { muscle: 'ruecken', patterns: PULL_H, main: true },
      { muscle: 'hintere_schulter' },
      { muscle: 'nacken' },
      { muscle: 'bizeps' },
      { muscle: 'bizeps' },
      { muscle: 'unterarme' },
    ],
  },
  ppl_legs: {
    name: 'Legs',
    slots: [
      { muscle: 'quadrizeps', patterns: SQUAT, main: true },
      { muscle: 'beinbeuger', patterns: HINGE, main: true },
      { muscle: 'quadrizeps', patterns: ['beinstrecken'] },
      { muscle: 'beinbeuger', patterns: ['beinbeugen'] },
      { muscle: 'gesaess', patterns: ['glute_bruecke'] },
      { muscle: 'waden' },
      { muscle: 'bauch' },
      { muscle: 'adduktoren' },
    ],
  },
  upper: {
    name: 'Upper',
    slots: [
      { muscle: 'brust', patterns: PRESS_H, main: true },
      { muscle: 'ruecken', patterns: PULL_H, main: true },
      { muscle: 'mittlere_schulter', patterns: PRESS_V, main: true },
      { muscle: 'ruecken', patterns: PULL_V },
      { muscle: 'mittlere_schulter', patterns: ['seitheben'] },
      { muscle: 'bizeps' },
      { muscle: 'trizeps' },
      { muscle: 'hintere_schulter' },
    ],
  },
  lower: {
    name: 'Lower',
    slots: [
      { muscle: 'quadrizeps', patterns: SQUAT, main: true },
      { muscle: 'beinbeuger', patterns: HINGE, main: true },
      { muscle: 'quadrizeps', patterns: ['beinstrecken'] },
      { muscle: 'beinbeuger', patterns: ['beinbeugen'] },
      { muscle: 'gesaess' },
      { muscle: 'waden' },
      { muscle: 'bauch' },
    ],
  },
  full: {
    name: 'Ganzkörper',
    slots: [
      { muscle: 'quadrizeps', patterns: SQUAT, main: true },
      { muscle: 'brust', patterns: PRESS_H, main: true },
      { muscle: 'ruecken', patterns: PULL_H, main: true },
      { muscle: 'beinbeuger', patterns: HINGE },
      { muscle: 'mittlere_schulter', patterns: PRESS_V },
      { muscle: 'ruecken', patterns: PULL_V },
      { muscle: 'bizeps' },
      { muscle: 'trizeps' },
      { muscle: 'bauch' },
    ],
  },
}

export const SPLITS: { id: SplitId; label: string; text: string; cycle: string[] }[] = [
  { id: 'upper_lower', label: 'Upper | Lower', text: 'Abwechselnd Oberkörper und Unterkörper – jede Muskelgruppe zweimal pro Woche.', cycle: ['upper', 'lower'] },
  { id: 'push_pull_legs', label: 'Push | Pull | Legs', text: 'Drücken, Ziehen und Beine an getrennten Tagen – viel Volumen pro Einheit.', cycle: ['ppl_push', 'ppl_pull', 'ppl_legs'] },
  { id: 'push_pull', label: 'Push | Pull', text: 'Hier machst Du an einem Tag alle drückenden und an einem anderen Tag alle ziehenden Übungen.', cycle: ['push', 'pull'] },
  { id: 'ganzkoerper', label: 'Ganzkörper', text: 'Jede Einheit trainiert den ganzen Körper – ideal bei wenigen Trainingstagen.', cycle: ['full'] },
]

/** Empfohlene Splits je Anzahl Trainingstage (Hervorhebung „EMPFOHLEN“). */
export function recommendedSplits(days: number): SplitId[] {
  if (days <= 2) return ['ganzkoerper']
  if (days === 3) return ['ganzkoerper', 'push_pull_legs']
  if (days === 4) return ['upper_lower', 'push_pull']
  if (days === 5) return ['push_pull_legs', 'upper_lower']
  return ['upper_lower', 'push_pull_legs', 'push_pull']
}

/** Empfohlene Trainingshäufigkeit je Erfahrung. */
export function recommendedDays(exp: Experience): number[] {
  if (exp === 'anfaenger') return [2, 3]
  if (exp === 'fortgeschritten') return [3, 4, 6]
  return [4, 5, 6]
}

/** Empfohlene Dauer (Minuten) je Erfahrung. */
export function recommendedDuration(exp: Experience): [number, number] {
  if (exp === 'anfaenger') return [45, 60]
  if (exp === 'fortgeschritten') return [60, 90]
  return [75, 120]
}

/** Standard-Wochentage für n Trainings (0 = Mo). */
export function defaultWeekdays(n: number): number[] {
  const map: Record<number, number[]> = {
    1: [0],
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 3, 4],
    5: [0, 1, 2, 3, 4],
    6: [0, 1, 2, 3, 4, 5],
    7: [0, 1, 2, 3, 4, 5, 6],
  }
  return map[Math.min(7, Math.max(1, n))]
}

/** Namen der Einheiten je Wochentag (für die Wochenplanung). */
export function dayNamesFor(split: SplitId, weekdays: number[]): Record<number, string> {
  const cycle = SPLITS.find((s) => s.id === split)!.cycle
  const out: Record<number, string> = {}
  ;[...weekdays].sort((a, b) => a - b).forEach((wd, i) => {
    out[wd] = DAY_TEMPLATES[cycle[i % cycle.length]].name
  })
  return out
}

const SET_BASE: Record<Experience, number> = { anfaenger: 2, fortgeschritten: 3, profi: 4 }
const SMALL = new Set<MovementPattern>(['seitheben', 'wadenheben', 'rumpfbeuge', 'reverse_fly', 'shrug', 'unterarm', 'abduktion', 'adduktion', 'rumpf_stabilitaet', 'rotation'])

function prescriptionFor(ex: Exercise, slot: Slot, exp: Experience, focus: boolean): GeneratedExercise {
  let sets = SET_BASE[exp]
  if (focus) sets += 1
  if (!slot.main && exp === 'profi') sets -= 1
  let repMin = 8
  let repMax = 12
  if (slot.main && exp !== 'anfaenger' && (ex.muster === 'horizontal_druecken' || ex.muster === 'kniebeuge' || ex.muster === 'hueftstreckung')) {
    repMin = 5
    repMax = 8
  }
  if (SMALL.has(ex.muster)) {
    repMin = 15
    repMax = 20
  }
  const restSec = slot.main ? 150 : SMALL.has(ex.muster) ? 90 : 120
  return { exerciseId: ex.id, sets: Math.max(2, sets), repMin, repMax, targetRir: 2, restSec }
}

/** Geschätzte Dauer einer Einheit in Minuten (Arbeit + Pausen + Aufwärmen). */
export function estimateMinutes(list: { sets: number; restSec: number }[]): number {
  const sec = list.reduce((sum, e) => sum + e.sets * (e.restSec + 45), 0)
  return Math.round(sec / 60 + (list.length ? 4 : 0))
}

function blockedJoints(pains: Pain[]): Set<string> {
  const set = new Set<string>()
  for (const p of pains) {
    if (p.level < 5) continue
    PAIN_REGIONS.find((r) => r.id === p.region)?.joints.forEach((j) => set.add(j))
  }
  return set
}

/** Kandidaten für einen Slot, bestbewertete zuerst. */
export function candidatesFor(slot: Slot, input: PlanInput): Exercise[] {
  const blocked = blockedJoints(input.pains)
  const list = input.library.filter(
    (e) =>
      e.art === 'kraft' &&
      e.primaer === slot.muscle &&
      (!slot.patterns || slot.patterns.includes(e.muster)) &&
      isAvailable(e, input.equipment) &&
      !input.excluded.includes(e.id) &&
      !e.gelenke.some((j) => blocked.has(j)) &&
      e.einheit !== 'sekunden',
  )
  const score = (e: Exercise) => {
    let s = 0
    if (input.preferred.includes(e.id)) s += 100
    if (input.experience === 'anfaenger') s -= (e.schwierigkeit - 1) * 15
    if (input.experience === 'fortgeschritten') s -= Math.max(0, e.schwierigkeit - 2) * 10
    // Im Gym geführte Geräte bevorzugen (sicher, gut steigerbar); sonst freie Gewichte
    const main = e.equipment[0]
    if (input.location === 'gym' && (main === 'maschine' || main === 'kabelzug' || main === 'multipresse')) s += 8
    if (main === 'koerpergewicht' || main === 'widerstandsband') s -= input.location === 'gym' ? 20 : 0
    return s
  }
  const sorted = list.sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))
  // Zu vermeidende Übungen nur nehmen, wenn es keine Alternative gibt
  const avoid = input.avoid ?? []
  const without = sorted.filter((e) => !avoid.includes(e.id))
  return without.length ? without : sorted
}

/** Ganzer Wochenplan. Wiederholte Tage (z. B. 3× Push) wechseln zwischen Varianten. */
export function generatePlan(input: PlanInput): GeneratedDay[] {
  const split = SPLITS.find((s) => s.id === input.split)!
  const weekdays = [...input.weekdays].sort((a, b) => a - b)
  const occurrence: Record<string, number> = {}
  const days: GeneratedDay[] = []

  weekdays.forEach((weekday, i) => {
    const key = split.cycle[i % split.cycle.length]
    const tpl = DAY_TEMPLATES[key]
    const variant = occurrence[key] ?? 0
    occurrence[key] = variant + 1
    const used = new Set<string>()
    const exercises: GeneratedExercise[] = []
    // Schwerpunkte: Slots der Fokus-Muskeln nach vorne ziehen
    const slots = [...tpl.slots].sort((a, b) => Number(!!b.main) - Number(!!a.main) || Number(input.focus.includes(b.muscle)) - Number(input.focus.includes(a.muscle)))
    for (const slot of slots) {
      const cands = candidatesFor(slot, input).filter((c) => !used.has(c.id))
      if (!cands.length) continue
      // Variante B/C: anderes Hauptwerkzeug wählen, wenn vorhanden (Verlaufs-Übungen bleiben bevorzugt)
      const pick = variant > 0 && !slot.main && cands.length > 1 && !input.preferred.includes(cands[0].id) ? cands[variant % cands.length] : cands[0]
      const p = prescriptionFor(pick, slot, input.experience, input.focus.includes(slot.muscle))
      if (estimateMinutes([...exercises, p]) > input.sessionMinutes && exercises.length >= 3) break
      used.add(pick.id)
      exercises.push(p)
    }
    // Zusätzliche Übung für Schwerpunkte, wenn noch Zeit ist
    for (const m of input.focus) {
      if (!tpl.slots.some((s) => s.muscle === m)) continue
      const extra = candidatesFor({ muscle: m }, input).find((c) => !used.has(c.id))
      if (!extra) continue
      const p = prescriptionFor(extra, { muscle: m }, input.experience, false)
      if (estimateMinutes([...exercises, p]) > input.sessionMinutes) continue
      used.add(extra.id)
      exercises.push(p)
    }
    days.push({ weekday, name: tpl.name, kind: 'kraft', location: input.location, exercises })
    if (input.mobility) days.push({ weekday, name: 'Mobility', kind: 'mobility', location: input.location === 'gym' ? 'zuhause' : input.location, exercises: mobilityRoutine(input, i) })
  })
  return days
}

/** Kurze Mobility-Einheit (Super-Satz aus 4 Übungen) für Problemzonen und Hüfte. */
export function mobilityRoutine(input: Pick<PlanInput, 'pains' | 'library' | 'excluded' | 'equipment'>, seed = 0): GeneratedExercise[] {
  const regions: MuscleId[] = []
  for (const p of [...input.pains].sort((a, b) => b.level - a.level)) {
    PAIN_REGIONS.find((r) => r.id === p.region)?.mobility.forEach((m) => !regions.includes(m) && regions.push(m))
  }
  for (const m of ['huefte', 'brustwirbelsaeule', 'sprunggelenk', 'schultergelenk'] as MuscleId[]) if (!regions.includes(m)) regions.push(m)
  const pool = input.library.filter((e) => e.art === 'mobility' && !input.excluded.includes(e.id) && isAvailable(e, input.equipment))
  const picks: Exercise[] = []
  // Erste Region doppelt (Hauptproblemzone), danach je eine
  const order = [regions[0], regions[1] ?? regions[0], regions[0], regions[2] ?? 'huefte']
  order.forEach((region, i) => {
    const list = pool.filter((e) => e.primaer === region && !picks.includes(e))
    if (list.length) picks.push(list[(seed + i) % list.length])
  })
  return picks.map((e) => ({ exerciseId: e.id, sets: 3, repMin: e.einheit === 'sekunden' ? 30 : 8, repMax: e.einheit === 'sekunden' ? 45 : 12, targetRir: 0, restSec: 15, superset: true }))
}
