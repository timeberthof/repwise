/**
 * Automatische Anpassung – alle Regeln und Schwellenwerte an einer Stelle.
 *
 * Reihenfolge je Übung und Einheit:
 *  1. Basis aus der letzten Einheit (doppelte Progression, Reduktion, Stagnation) oder Kalibrierung
 *  2. Wiedereinstieg nach Trainingspause
 *  3. Wochentyp des Mesozyklus (Intro, Normal, Overreaching, Peak Week, Deload)
 *  4. Erholungs-Check-in (Energie, Schlaf, Muskelkater) – senkt nur, steigert nie
 *
 * Jede Änderung erzeugt eine AdjustmentNote mit kurzer Begründung; sie wird im Training angezeigt
 * und lässt sich dort überschreiben.
 */
import type { AdjustmentNote, Checkin, Exercise, MuscleId, WeekType } from '../db/types'
import { e1rmSet, weightForReps } from './e1rm'

export const PROGRESSION_CONFIG = {
  /** Doppelte Progression: Steigerung, wenn alle Sätze das obere Ende beim Ziel-RIR erreichen. */
  doubleProgression: {
    /** Anzahl Gewichtsschritte bei Steigerung */
    stepsUp: 1,
  },
  /** Unter dem unteren Ende des Bereichs */
  belowRange: {
    /** Erst beim n-ten Mal in Folge wird reduziert, davor bleibt das Gewicht. */
    reduceAfterMisses: 2,
    /** Reduktion in Prozent (5–10 %) */
    reducePercent: 0.075,
  },
  /** Stagnation: n Einheiten ohne neue Bestleistung und ohne Gewichtssteigerung */
  stagnation: {
    sessions: 3,
    reducePercent: 0.1,
  },
  /** Trainingspause: Tage seit dem letzten Training dieser Übung → Reduktion */
  pause: [
    { days: 56, percent: 0.3 },
    { days: 28, percent: 0.2 },
    { days: 14, percent: 0.1 },
  ],
  /** Mesozyklus: Reihenfolge der Wochentypen (6 Wochen) */
  cycle: ['intro', 'normal', 'normal', 'overreaching', 'peak', 'deload'] as WeekType[],
  weekTypes: {
    intro: { setsDelta: -1, setsFactor: 1, rirDelta: 1, weightFactor: 1 },
    normal: { setsDelta: 0, setsFactor: 1, rirDelta: 0, weightFactor: 1 },
    overreaching: { setsDelta: 1, setsFactor: 1, rirDelta: 0, weightFactor: 1 },
    peak: { setsDelta: 0, setsFactor: 1, rirDelta: -1, weightFactor: 1 },
    deload: { setsDelta: 0, setsFactor: 0.5, rirDelta: 1, weightFactor: 1 },
  } satisfies Record<WeekType, { setsDelta: number; setsFactor: number; rirDelta: number; weightFactor: number }>,
  /** Erholungs-Check-in (Skalen 0–10) */
  recovery: {
    /** Energie oder Schlaf ≤ Wert → weniger Volumen, mehr Reserve */
    lowEnergy: 3,
    lowSleep: 3,
    lowSetsDelta: -1,
    lowRirDelta: 1,
    /** Muskelkater des Zielmuskels */
    soreHigh: 7,
    soreSetsDelta: -1,
    soreSevere: 9,
    soreWeightFactor: 0.9,
  },
  /** Kalibrierung ohne eigenes Arbeitsgewicht */
  calibration: {
    /** Sicherheitsabschlag auf die berechnete Schätzung */
    safety: 0.95,
    /** Abschlag bei Schätzung aus einer verwandten Übung */
    relatedSafety: 0.8,
  },
  minSets: 1,
  maxSets: 6,
  minRir: 0,
  maxRir: 4,
}

export type ProgressionConfig = typeof PROGRESSION_CONFIG

// ---------------------------------------------------------------------------
// Gewichte runden

/** Auf verfügbares Gewicht runden. Ohne Liste: Vielfaches des Schritts. */
export function roundWeight(w: number, step: number, mode: 'down' | 'up' | 'nearest' = 'nearest', available?: number[]): number {
  if (available && available.length) {
    const sorted = [...available].sort((a, b) => a - b)
    if (mode === 'down') return [...sorted].reverse().find((x) => x <= w + 1e-9) ?? sorted[0]
    if (mode === 'up') return sorted.find((x) => x >= w - 1e-9) ?? sorted[sorted.length - 1]
    return sorted.reduce((best, x) => (Math.abs(x - w) < Math.abs(best - w) ? x : best), sorted[0])
  }
  if (!step) return w
  const f = mode === 'down' ? Math.floor : mode === 'up' ? Math.ceil : Math.round
  return Math.max(step, round3(f(w / step + 1e-9) * step))
}

/** Nächste verfügbare Stufe über dem aktuellen Gewicht. */
export function nextWeight(w: number, step: number, steps = 1, available?: number[]): number {
  if (available && available.length) {
    const sorted = [...available].sort((a, b) => a - b)
    const higher = sorted.filter((x) => x > w + 1e-9)
    return higher[Math.min(steps, higher.length) - 1] ?? w
  }
  return round3(w + step * steps)
}

const round3 = (n: number) => Math.round(n * 1000) / 1000
const de = (n: number) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(n)

// ---------------------------------------------------------------------------
// 1. Basis aus der letzten Einheit

export interface PerformedSet {
  weight: number | null
  reps: number
  rir: number | null
  done: boolean
}

export interface ExerciseHistory {
  /** Letzte Einheiten mit dieser Übung, älteste zuerst. */
  sessions: {
    date: string
    weight: number | null
    sets: PerformedSet[]
    repMin: number
    repMax: number
    targetRir: number
    e1rm: number | null
    /** Wurde bei dieser Einheit eine Stagnations-Reduktion angewendet? */
    stagnationReset?: boolean
  }[]
}

export interface BaseInput {
  exercise: Exercise
  repMin: number
  repMax: number
  targetRir: number
  plannedSets: number
  history: ExerciseHistory
  available?: number[]
}

export interface BaseResult {
  weight: number | null
  notes: AdjustmentNote[]
  /** Kein eigenes Arbeitsgewicht vorhanden → muss geschätzt werden */
  needsCalibration: boolean
  stagnation: boolean
}

export function baseSuggestion(input: BaseInput, cfg: ProgressionConfig = PROGRESSION_CONFIG): BaseResult {
  const { exercise, repMin, repMax, targetRir, history } = input
  const last = history.sessions[history.sessions.length - 1]
  const bodyweight = exercise.gewichtsschritt === 0 || exercise.gewichtsart === 'koerpergewicht'
  if (!last || (!bodyweight && !last.weight)) {
    return { weight: null, notes: [], needsCalibration: !bodyweight, stagnation: false }
  }
  const done = last.sets.filter((s) => s.done)
  const lastWeight = last.weight
  if (!done.length) return { weight: lastWeight, notes: [], needsCalibration: false, stagnation: false }

  // Körpergewicht: mehr Wiederholungen bzw. schwerere Variante
  if (bodyweight) {
    const allTop = done.every((s) => s.reps >= repMax && (s.rir ?? targetRir) >= targetRir)
    if (allTop) {
      return {
        weight: lastWeight,
        needsCalibration: false,
        stagnation: false,
        notes: [
          {
            kind: 'progression',
            field: 'reps',
            before: repMax,
            after: repMax + 1,
            title: 'Mehr Wiederholungen',
            reason: `Ziel +1 Wdh. oder eine schwerere Variante, weil du alle Sätze mit ${repMax} Wdh. geschafft hast.`,
          },
        ],
      }
    }
    return { weight: lastWeight, notes: [], needsCalibration: false, stagnation: false }
  }

  const w = lastWeight as number
  const step = exercise.gewichtsschritt || 2.5

  // Stagnation hat Vorrang vor „Gewicht halten“
  const stagnation = detectStagnation(history, cfg)
  if (stagnation) {
    const after = roundWeight(w * (1 - cfg.stagnation.reducePercent), step, 'down', input.available)
    return {
      weight: after,
      needsCalibration: false,
      stagnation: true,
      notes: [
        {
          kind: 'stagnation',
          field: 'weight',
          before: w,
          after,
          title: 'Kurzer Reset',
          reason: `−${de(w - after)} kg, weil seit ${cfg.stagnation.sessions} Einheiten kein Fortschritt kam. Danach geht es wieder aufwärts – oder probier eine Variante.`,
        },
      ],
    }
  }

  const allTop = done.length >= Math.min(input.plannedSets, last.sets.length) && done.every((s) => s.reps >= repMax && (s.rir ?? targetRir) >= targetRir)
  if (allTop) {
    const after = nextWeight(w, step, cfg.doubleProgression.stepsUp, input.available)
    if (after > w) {
      return {
        weight: after,
        needsCalibration: false,
        stagnation: false,
        notes: [
          {
            kind: 'progression',
            field: 'weight',
            before: w,
            after,
            title: 'Gewicht erhöht',
            reason: `+${de(after - w)} kg, weil du alle Sätze mit ${repMax} Wdh. geschafft hast.`,
          },
        ],
      }
    }
  }

  const below = done.filter((s) => s.reps < repMin)
  if (below.length) {
    const misses = consecutiveMisses(history)
    if (misses >= cfg.belowRange.reduceAfterMisses) {
      const after = roundWeight(w * (1 - cfg.belowRange.reducePercent), step, 'down', input.available)
      return {
        weight: after,
        needsCalibration: false,
        stagnation: false,
        notes: [
          {
            kind: 'reduktion',
            field: 'weight',
            before: w,
            after,
            title: 'Gewicht reduziert',
            reason: `−${de(w - after)} kg, weil du ${misses}× in Folge unter ${repMin} Wdh. lagst.`,
          },
        ],
      }
    }
    return {
      weight: w,
      needsCalibration: false,
      stagnation: false,
      notes: [
        {
          kind: 'reduktion',
          field: 'weight',
          before: w,
          after: w,
          title: 'Gewicht bleibt',
          reason: `Gleiches Gewicht, weil ${below.length === 1 ? 'ein Satz' : `${below.length} Sätze`} unter ${repMin} Wdh. lag${below.length === 1 ? '' : 'en'}.`,
        },
      ],
    }
  }
  return { weight: w, notes: [], needsCalibration: false, stagnation: false }
}

/** Wie oft in Folge (bis zur letzten Einheit) lag mindestens ein Satz unter dem Bereich? */
export function consecutiveMisses(history: ExerciseHistory): number {
  let n = 0
  for (let i = history.sessions.length - 1; i >= 0; i--) {
    const s = history.sessions[i]
    if (s.sets.some((x) => x.done && x.reps < s.repMin)) n++
    else break
  }
  return n
}

/** Keine neue Bestleistung und kein höheres Gewicht in den letzten n Einheiten (seit dem letzten Reset). */
export function detectStagnation(history: ExerciseHistory, cfg: ProgressionConfig = PROGRESSION_CONFIG): boolean {
  const n = cfg.stagnation.sessions
  const list = history.sessions
  const lastReset = list.map((s) => !!s.stagnationReset).lastIndexOf(true)
  const relevant = list.slice(lastReset + 1)
  if (relevant.length < n + 1) return false
  const before = relevant.slice(0, relevant.length - n)
  const recent = relevant.slice(-n)
  const bestBefore = Math.max(...before.map((s) => s.e1rm ?? 0))
  const weightBefore = Math.max(...before.map((s) => s.weight ?? 0))
  if (bestBefore <= 0) return false
  const progressed = recent.some((s) => (s.e1rm ?? 0) > bestBefore + 1e-6 || (s.weight ?? 0) > weightBefore + 1e-6)
  return !progressed
}

// ---------------------------------------------------------------------------
// Kalibrierung (Startgewicht ohne eigenes Arbeitsgewicht)

export interface CalibrationInput {
  exercise: Exercise
  repMax: number
  targetRir: number
  /** Letzte bekannte Maximalkraft dieser Übung (z. B. aus MCI) */
  ownE1rm?: number | null
  /** Maximalkraft einer verwandten Übung */
  related?: { exercise: Exercise; e1rm: number } | null
  available?: number[]
}

/** Grobe Umrechnung zwischen Geräten (Gesamtlast relativ zur Langhantel). */
const EQUIPMENT_RATIO: Record<string, number> = {
  langhantel: 1,
  multipresse: 0.95,
  sz_stange: 0.9,
  maschine: 1,
  kabelzug: 0.9,
  kurzhantel: 0.42, // je Hand
  kettlebell: 0.4,
}

export function calibrationWeight(i: CalibrationInput, cfg: ProgressionConfig = PROGRESSION_CONFIG): { weight: number | null; note: AdjustmentNote } {
  const step = i.exercise.gewichtsschritt || 2.5
  if (i.ownE1rm && i.ownE1rm > 0) {
    const raw = weightForReps(i.ownE1rm, i.repMax, i.targetRir) * cfg.calibration.safety
    const w = roundWeight(raw, step, 'down', i.available)
    return {
      weight: w,
      note: {
        kind: 'kalibrierung',
        field: 'weight',
        before: null,
        after: w,
        title: 'Schätzung',
        reason: `Geschätzt aus Deiner Maximalkraft (${de(i.ownE1rm)} kg). Die ersten Sätze dienen zur Kalibrierung.`,
      },
    }
  }
  if (i.related && i.related.e1rm > 0) {
    const from = EQUIPMENT_RATIO[i.related.exercise.equipment[0]] ?? 1
    const to = EQUIPMENT_RATIO[i.exercise.equipment[0]] ?? 1
    const e1rm = (i.related.e1rm / from) * to
    const raw = weightForReps(e1rm, i.repMax, i.targetRir) * cfg.calibration.relatedSafety
    const w = roundWeight(raw, step, 'down', i.available)
    return {
      weight: w,
      note: {
        kind: 'kalibrierung',
        field: 'weight',
        before: null,
        after: w,
        title: 'Schätzung',
        reason: `Vorsichtig geschätzt aus „${i.related.exercise.name}“. Die ersten Sätze dienen zur Kalibrierung.`,
      },
    }
  }
  return {
    weight: null,
    note: {
      kind: 'kalibrierung',
      field: 'weight',
      before: null,
      after: null,
      title: 'Kalibrierung',
      reason: 'Noch kein Wert bekannt. Wähle ein Gewicht, mit dem du das obere Ende des Bereichs mit etwas Reserve schaffst.',
    },
  }
}

// ---------------------------------------------------------------------------
// 2. Trainingspause

export function pauseReduction(daysSinceLast: number | null, weight: number | null, step: number, cfg: ProgressionConfig = PROGRESSION_CONFIG, available?: number[]): { weight: number | null; note: AdjustmentNote | null } {
  if (daysSinceLast === null || weight === null || !weight) return { weight, note: null }
  const rule = cfg.pause.find((p) => daysSinceLast >= p.days)
  if (!rule) return { weight, note: null }
  const after = roundWeight(weight * (1 - rule.percent), step, 'down', available)
  return {
    weight: after,
    note: {
      kind: 'pause',
      field: 'weight',
      before: weight,
      after,
      title: 'Wiedereinstieg',
      reason: `−${de(weight - after)} kg (−${Math.round(rule.percent * 100)} %), weil du diese Übung seit ${daysSinceLast} Tagen nicht trainiert hast.`,
    },
  }
}

// ---------------------------------------------------------------------------
// 3. Wochentyp

export const WEEK_TYPE_INFO: Record<WeekType, { label: string; text: string; reason: string }> = {
  intro: { label: 'Intro', text: 'Sanfter Einstieg ins Training.', reason: 'durch die Intro-Woche für einen sanften Einstieg' },
  normal: { label: 'Normal', text: 'Training nach Plan, keine Anpassung.', reason: '' },
  overreaching: { label: 'Overreaching', text: 'Erhöhte Belastung.', reason: 'durch die Overreaching-Woche für einen stärkeren Reiz' },
  peak: { label: 'Peak Week', text: 'Maximale Intensität.', reason: 'durch die Peak Week für maximale Intensität' },
  deload: { label: 'Deload', text: 'Reduziertes Volumen zur Erholung.', reason: 'durch die Deload-Woche für eine optimale Progression' },
}

export interface Prescription {
  sets: number
  repMin: number
  repMax: number
  targetRir: number
  weight: number | null
}

export function applyWeekType(p: Prescription, type: WeekType, step: number, cfg: ProgressionConfig = PROGRESSION_CONFIG): { p: Prescription; notes: AdjustmentNote[] } {
  const t = cfg.weekTypes[type]
  const notes: AdjustmentNote[] = []
  let sets = Math.round(p.sets * t.setsFactor + t.setsDelta)
  sets = clamp(sets, cfg.minSets, cfg.maxSets)
  const rir = clamp(p.targetRir + t.rirDelta, cfg.minRir, cfg.maxRir)
  let weight = p.weight
  if (weight && t.weightFactor !== 1) weight = roundWeight(weight * t.weightFactor, step, 'down')
  const why = WEEK_TYPE_INFO[type].reason
  if (sets !== p.sets) {
    notes.push({
      kind: 'wochentyp',
      field: 'sets',
      before: p.sets,
      after: sets,
      title: 'Satzzahl angepasst',
      reason: `Die Anzahl deiner Sätze wurde ${why} angepasst.`,
    })
  }
  if (rir !== p.targetRir) {
    notes.push({
      kind: 'wochentyp',
      field: 'rir',
      before: p.targetRir,
      after: rir,
      title: 'Ziel-RIR angepasst',
      reason: `Die Reserve-Wiederholungen wurden ${why} angepasst.`,
    })
  }
  if (weight !== p.weight) {
    notes.push({ kind: 'wochentyp', field: 'weight', before: p.weight, after: weight, title: 'Gewicht angepasst', reason: `Das Gewicht wurde ${why} angepasst.` })
  }
  return { p: { ...p, sets, targetRir: rir, weight }, notes }
}

// ---------------------------------------------------------------------------
// 4. Erholungs-Check-in

export function applyCheckin(p: Prescription, checkin: Checkin | undefined, exercise: Exercise, step: number, cfg: ProgressionConfig = PROGRESSION_CONFIG): { p: Prescription; notes: AdjustmentNote[] } {
  if (!checkin || checkin.skipped) return { p, notes: [] }
  const r = cfg.recovery
  const notes: AdjustmentNote[] = []
  let { sets, targetRir, weight } = p
  const lowEnergy = checkin.energy !== undefined && checkin.energy <= r.lowEnergy
  const lowSleep = checkin.sleep !== undefined && checkin.sleep <= r.lowSleep
  if (lowEnergy || lowSleep) {
    const newSets = clamp(sets + r.lowSetsDelta, cfg.minSets, sets)
    const newRir = clamp(targetRir + r.lowRirDelta, targetRir, cfg.maxRir)
    const what = lowEnergy && lowSleep ? 'wenig Energie und schlechten Schlaf' : lowEnergy ? 'wenig Energie' : 'schlechten Schlaf'
    if (newSets !== sets) notes.push({ kind: 'erholung', field: 'sets', before: sets, after: newSets, title: 'Erholung berücksichtigt', reason: `−${sets - newSets} Satz, weil du ${what} angegeben hast.` })
    if (newRir !== targetRir) notes.push({ kind: 'erholung', field: 'rir', before: targetRir, after: newRir, title: 'Mehr Reserve', reason: `Ziel-RIR +${newRir - targetRir}, weil du ${what} angegeben hast.` })
    sets = newSets
    targetRir = newRir
  }
  const targets: MuscleId[] = [exercise.primaer]
  const sore = Math.max(...targets.map((m) => checkin.soreness?.[m] ?? 0))
  if (sore >= r.soreHigh) {
    const newSets = clamp(sets + r.soreSetsDelta, cfg.minSets, sets)
    if (newSets !== sets) notes.push({ kind: 'muskelkater', field: 'sets', before: sets, after: newSets, title: 'Muskelkater berücksichtigt', reason: `−${sets - newSets} Satz wegen starkem Muskelkater (${sore}/10).` })
    sets = newSets
    if (sore >= r.soreSevere && weight) {
      const w = roundWeight(weight * r.soreWeightFactor, step, 'down')
      if (w < weight) notes.push({ kind: 'muskelkater', field: 'weight', before: weight, after: w, title: 'Gewicht reduziert', reason: `−${de(weight - w)} kg wegen sehr starkem Muskelkater (${sore}/10).` })
      weight = w
    }
  }
  return { p: { ...p, sets, targetRir, weight }, notes }
}

// ---------------------------------------------------------------------------
// Gesamte Vorgabe für eine Übung in einer Einheit

export interface PrescribeInput extends BaseInput {
  weekType: WeekType
  checkin?: Checkin
  daysSinceLast: number | null
  calibration?: Omit<CalibrationInput, 'exercise' | 'repMax' | 'targetRir'>
}

export interface PrescribeResult extends Prescription {
  notes: AdjustmentNote[]
  isEstimate: boolean
}

export function prescribe(i: PrescribeInput, cfg: ProgressionConfig = PROGRESSION_CONFIG): PrescribeResult {
  const step = i.exercise.gewichtsschritt || 2.5
  const notes: AdjustmentNote[] = []
  const base = baseSuggestion(i, cfg)
  let weight = base.weight
  let isEstimate = false
  notes.push(...base.notes)
  if (base.needsCalibration) {
    const c = calibrationWeight({ exercise: i.exercise, repMax: i.repMax, targetRir: i.targetRir, ...i.calibration }, cfg)
    weight = c.weight
    isEstimate = true
    notes.push(c.note)
  } else {
    const pr = pauseReduction(i.daysSinceLast, weight, step, cfg, i.available)
    weight = pr.weight
    if (pr.note) notes.push(pr.note)
  }
  let p: Prescription = { sets: i.plannedSets, repMin: i.repMin, repMax: i.repMax, targetRir: i.targetRir, weight }
  const wt = applyWeekType(p, i.weekType, step, cfg)
  p = wt.p
  notes.push(...wt.notes)
  const ci = applyCheckin(p, i.checkin, i.exercise, step, cfg)
  p = ci.p
  notes.push(...ci.notes)
  return { ...p, notes, isEstimate }
}

// ---------------------------------------------------------------------------
// Empfehlungen (für die Hervorhebung „EMPFOHLEN“)

export const REP_RANGES: [number, number][] = [
  [5, 8],
  [8, 12],
  [15, 20],
]

const COMPOUND = new Set(['horizontal_druecken', 'vertikal_druecken', 'horizontal_ziehen', 'vertikal_ziehen', 'kniebeuge', 'hueftstreckung', 'ausfallschritt'])

/** Empfohlene Wiederholungsbereiche: Grundübungen 5–8 / 8–12, Isolation 8–12 / 15–20. Der erste ist die Hauptempfehlung. */
export function recommendedRepRanges(ex: Exercise): [number, number][] {
  if (ex.art === 'mobility') return [[8, 12]]
  return COMPOUND.has(ex.muster)
    ? [
        [8, 12],
        [5, 8],
      ]
    : [
        [8, 12],
        [15, 20],
      ]
}

export function isRecommendedRange(ex: Exercise, min: number, max: number): boolean {
  return recommendedRepRanges(ex).some(([a, b]) => a === min && b === max)
}

/** Maximalkraft eines geplanten Satzes – für Vorschauen. */
export function plannedE1rm(weight: number | null, reps: number, rir: number): number {
  return weight ? e1rmSet(weight, reps, rir) : 0
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}
