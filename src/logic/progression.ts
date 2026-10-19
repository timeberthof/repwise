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
import type { AdjustmentNote, Checkin, Exercise, ExerciseRole, MuscleId, MovementPattern, WeekType } from '../db/types'
import { e1rmSet, weightForReps } from './e1rm'

export const PROGRESSION_CONFIG = {
  /**
   * Doppelte Progression: Steigerung, wenn alle Sätze das obere Ende beim Ziel-RIR erreichen.
   * Mehrgelenksübungen Oberkörper +2,5 kg, Unterkörper +5 kg; Isolation und Kurzhanteln (je Hand)
   * kleinster Sprung. Danach beginnt man wieder am unteren Ende des Bereichs.
   */
  doubleProgression: {
    upperCompoundKg: 2.5,
    lowerCompoundKg: 5,
  },
  /** Trainingsplanung: harte Grenzen pro Einheit, Wochenvolumen, Variation (DECISIONS.md, Trainingsplanung) */
  planning: {
    maxExercises: 7,
    minSetsPerExercise: 2,
    maxSetsPerExercise: 4,
    minSessionSets: 14,
    maxSessionSets: 22,
    /** Grundplan höchstens 20 Sätze je Einheit – Luft für die Overreaching-Woche (bis 22) */
    planSessionSets: 20,
    /** Ziel je Muskelgruppe und Woche, anteilig gezählt (Zielmuskel 1, mitarbeitend 0,5) */
    weeklyMin: 10,
    weeklyMax: 20,
    secondaryFactor: 0.5,
    /** Mindestens so oft pro Woche trainiert … */
    minFrequency: 2,
    /** … wobei eine Einheit ab so vielen (anteiligen) Sätzen zählt */
    frequencySets: 2,
    /** Drücken : Ziehen (Oberkörper) und Quadrizeps : Beinbeuger sollen in diesem Verhältnis liegen */
    balance: { min: 0.8, max: 1.25 },
    /** Ankerübungen je Einheit (bleiben im Zyklus gleich) */
    maxAnchors: 2,
    /** Varianten je Übung (inkl. Grundvariante) und Wechsel pro Einheit */
    maxVariants: 3,
    maxRotationsPerSession: 3,
  },
  /** Vorgaben je Rolle: Sätze nach Erfahrung, Wiederholungen, Pause, Ziel-RIR */
  roles: {
    grund: {
      sets: { anfaenger: 3, fortgeschritten: 3, profi: 4 },
      minSets: 3,
      maxSets: 4,
      /** Kniebeuge, Kreuzheben, Bankdrücken 5–8; Rudern, Schulterdrücken, Klimmzüge 6–10 */
      repsHeavy: [5, 8] as [number, number],
      reps: [6, 10] as [number, number],
      restUpper: 150,
      restLower: 180,
      rir: 2,
    },
    ergaenzung: { sets: { anfaenger: 3, fortgeschritten: 3, profi: 3 }, minSets: 2, maxSets: 4, reps: [8, 12] as [number, number], restUpper: 90, restLower: 120, rir: 2 },
    isolation: {
      sets: { anfaenger: 2, fortgeschritten: 3, profi: 3 },
      minSets: 2,
      maxSets: 3,
      /** Curls, Trizeps, Beinbeuger/-strecker, Fliegende 10–15; Seitheben, hintere Schulter, Waden, Bauch 12–20 */
      reps: [10, 15] as [number, number],
      repsHigh: [12, 20] as [number, number],
      rest: 75,
      restShort: 60,
      restLong: 90,
      /** Letzter Satz darf bis knapp ans Versagen gehen */
      rir: 1,
    },
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
  /**
   * Wochentypen: Intro, Normal und Overreaching sind Aufbauwochen (Overreaching +1 Satz bei Mehrgelenksübungen),
   * Peak Week ist die Intensivwoche (unteres Ende des Bereichs, weniger RIR), Deload ca. 45 % weniger Sätze bei RIR 3–4.
   */
  weekTypes: {
    intro: { compoundSetsDelta: 0, setsReduction: 0, rirDelta: 1, lowerReps: false },
    normal: { compoundSetsDelta: 0, setsReduction: 0, rirDelta: 0, lowerReps: false },
    overreaching: { compoundSetsDelta: 1, setsReduction: 0, rirDelta: 0, lowerReps: false },
    peak: { compoundSetsDelta: 0, setsReduction: 0, rirDelta: -1, lowerReps: true },
    deload: { compoundSetsDelta: 0, setsReduction: 0.45, rirDelta: 2, lowerReps: false },
  } satisfies Record<WeekType, { compoundSetsDelta: number; setsReduction: number; rirDelta: number; lowerReps: boolean }>,
  /** Deload: Ziel-RIR in diesem Bereich; Intensivwoche: höchstens so viele Steigerungsschritte Gewicht */
  deloadRir: [3, 4] as [number, number],
  peakMaxSteps: 2,
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
  maxSets: 4,
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

/** Bewegungsmuster des Unterkörpers (für +5 kg statt +2,5 kg). */
const LOWER_PATTERNS = new Set<MovementPattern>(['kniebeuge', 'hueftstreckung', 'ausfallschritt', 'glute_bruecke'])

/** Steigerung bei erreichtem oberem Ende: Mehrgelenk Oberkörper 2,5 kg, Unterkörper 5 kg, sonst kleinster Sprung. */
export function weightIncrement(ex: Exercise, role: ExerciseRole | undefined, cfg: ProgressionConfig = PROGRESSION_CONFIG): number {
  const step = ex.gewichtsschritt || 2.5
  if (!role || role === 'isolation' || ex.gewichtsart === 'pro_hand') return step
  const kg = LOWER_PATTERNS.has(ex.muster) ? cfg.doubleProgression.lowerCompoundKg : cfg.doubleProgression.upperCompoundKg
  return Math.max(step, kg)
}

/** Nächstes Gewicht mindestens um `increment` höher (bei verfügbaren Gewichten die passende Stufe). */
export function increasedWeight(w: number, step: number, increment: number, available?: number[]): number {
  if (available && available.length) {
    const higher = [...available].sort((a, b) => a - b).filter((x) => x > w + 1e-9)
    return higher.find((x) => x >= w + increment - 1e-9) ?? higher[higher.length - 1] ?? w
  }
  return round3(w + Math.max(step, Math.ceil(increment / step - 1e-9) * step))
}

/** Deload- und Intensivwochen verändern Gewicht/Wiederholungen bewusst – sie sind keine Basis für die Progression. */
const isRegularWeek = (t?: WeekType) => t !== 'deload' && t !== 'peak'

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
    /** Wochentyp der Einheit (Deload/Peak zählen nicht als Basis) */
    weekType?: WeekType
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
  role?: ExerciseRole
}

export interface BaseResult {
  weight: number | null
  notes: AdjustmentNote[]
  /** Kein eigenes Arbeitsgewicht vorhanden → muss geschätzt werden */
  needsCalibration: boolean
  stagnation: boolean
  /** Gewicht wurde gesteigert → wieder am unteren Ende des Bereichs beginnen */
  resetReps?: boolean
}

/** Verlauf ohne Deload- und Intensivwochen (falls es reguläre Einheiten gibt). */
export function regularHistory(history: ExerciseHistory): ExerciseHistory {
  const regular = history.sessions.filter((s) => isRegularWeek(s.weekType))
  return regular.length ? { sessions: regular } : history
}

export function baseSuggestion(input: BaseInput, cfg: ProgressionConfig = PROGRESSION_CONFIG): BaseResult {
  const { exercise, repMin, repMax, targetRir } = input
  const history = regularHistory(input.history)
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
    const after = increasedWeight(w, step, weightIncrement(exercise, input.role, cfg), input.available)
    if (after > w) {
      return {
        weight: after,
        needsCalibration: false,
        stagnation: false,
        resetReps: true,
        notes: [
          {
            kind: 'progression',
            field: 'weight',
            before: w,
            after,
            title: 'Gewicht erhöht',
            reason: `+${de(after - w)} kg, weil du alle Sätze mit ${repMax} Wdh. geschafft hast. Jetzt wieder mit ${repMin} Wdh. beginnen.`,
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
  peak: { label: 'Peak Week', text: 'Intensivwoche: unteres Ende des Bereichs, weniger Reserve.', reason: 'durch die Peak Week (Intensivwoche)' },
  deload: { label: 'Deload', text: 'Ca. 45 % weniger Sätze, gleiche Übungen, RIR 3–4.', reason: 'durch die Deload-Woche für eine optimale Progression' },
}

export interface Prescription {
  sets: number
  repMin: number
  repMax: number
  targetRir: number
  weight: number | null
  /** Vorgeschlagene Wiederholungen für die Sätze (sonst die der letzten Einheit) */
  targetReps?: number
}

export interface WeekTypeContext {
  role?: ExerciseRole
  /** Maximalkraft der letzten regulären Einheit (für das Gewicht in der Intensivwoche) */
  e1rm?: number | null
  increment?: number
  available?: number[]
}

/** Mindest-RIR in der Intensivwoche: Isolation darf bis 0 gehen, Mehrgelenksübungen bleiben bei ≥ 1. */
const peakMinRir = (role?: ExerciseRole) => (role === 'isolation' ? 0 : 1)

export function applyWeekType(p: Prescription, type: WeekType, step: number, cfg: ProgressionConfig = PROGRESSION_CONFIG, ctx: WeekTypeContext = {}): { p: Prescription; notes: AdjustmentNote[] } {
  const t = cfg.weekTypes[type]
  const notes: AdjustmentNote[] = []
  const compound = ctx.role !== 'isolation'
  let sets = p.sets
  if (t.setsReduction) sets = Math.round(p.sets * (1 - t.setsReduction))
  if (t.compoundSetsDelta && compound) sets += t.compoundSetsDelta
  sets = clamp(sets, cfg.minSets, Math.max(cfg.maxSets, p.sets))
  let rir = clamp(p.targetRir + t.rirDelta, cfg.minRir, cfg.maxRir)
  if (type === 'deload') rir = clamp(rir, cfg.deloadRir[0], cfg.deloadRir[1])
  if (type === 'peak') rir = Math.max(peakMinRir(ctx.role), rir)
  let weight = p.weight
  let targetReps = p.targetReps
  if (t.lowerReps) {
    targetReps = p.repMin
    // Mehrgelenksübungen: etwas mehr Gewicht für das untere Ende (aus der Maximalkraft), höchstens zwei Steigerungsschritte
    if (compound && weight && ctx.e1rm) {
      const inc = ctx.increment ?? step
      const raw = weightForReps(ctx.e1rm, p.repMin, rir)
      const capped = Math.min(raw, weight + cfg.peakMaxSteps * inc)
      const w = roundWeight(capped, step, 'down', ctx.available)
      if (w > weight) weight = w
    }
  }
  const why = WEEK_TYPE_INFO[type].reason
  if (targetReps !== p.targetReps && targetReps !== undefined) {
    notes.push({ kind: 'wochentyp', field: 'reps', before: null, after: targetReps, title: 'Unteres Ende des Bereichs', reason: `Ziel ${targetReps} Wdh. ${why} – schwerer und mit weniger Reserve.` })
  }
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
    notes.push({ kind: 'wochentyp', field: 'weight', before: p.weight, after: weight, title: 'Gewicht angepasst', reason: `+${de((weight ?? 0) - (p.weight ?? 0))} kg ${why}, passend für ${p.repMin} Wdh.` })
  }
  return { p: { ...p, sets, targetRir: rir, weight, targetReps }, notes }
}

/**
 * Satzgrenzen der ganzen Einheit nach dem Wochentyp: höchstens 22 Sätze (Aufbauwochen),
 * in der Deload-Woche insgesamt 40–50 % weniger Sätze als geplant (mind. 1 Satz je Übung).
 * Reihenfolge der Liste = Priorität (Grundübungen zuerst).
 */
export function limitSessionSets(planned: number[], adjusted: number[], type: WeekType, roles: (ExerciseRole | undefined)[], cfg: ProgressionConfig = PROGRESSION_CONFIG): number[] {
  const out = [...adjusted]
  const sum = (a: number[]) => a.reduce((s, x) => s + x, 0)
  const plannedTotal = sum(planned)
  if (type === 'deload') {
    const reduction = cfg.weekTypes.deload.setsReduction
    const target = Math.round(plannedTotal * (1 - reduction))
    const lo = Math.ceil(plannedTotal * 0.5)
    const hi = Math.floor(plannedTotal * 0.6)
    // zu viele Sätze: zuerst bei Isolationsübungen (von hinten) kürzen
    for (let guard = 0; sum(out) > Math.max(target, lo) && guard < 50; guard++) {
      const i = [...out.keys()].reverse().find((k) => out[k] > 1 && roles[k] === 'isolation') ?? [...out.keys()].reverse().find((k) => out[k] > 1)
      if (i === undefined) break
      out[i]--
    }
    // zu wenige: Grundübungen zuerst wieder auffüllen
    for (let guard = 0; sum(out) < Math.min(target, hi) && guard < 50; guard++) {
      const i = out.findIndex((x, k) => x < planned[k])
      if (i < 0) break
      out[i]++
    }
    return out
  }
  for (let guard = 0; sum(out) > Math.max(cfg.planning.maxSessionSets, plannedTotal) && guard < 50; guard++) {
    const i = [...out.keys()].reverse().find((k) => out[k] > planned[k])
    if (i === undefined) break
    out[i]--
  }
  return out
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
  let p: Prescription = { sets: i.plannedSets, repMin: i.repMin, repMax: i.repMax, targetRir: i.targetRir, weight, targetReps: base.resetReps ? i.repMin : undefined }
  const lastRegular = regularHistory(i.history).sessions.at(-1)
  const wt = applyWeekType(p, i.weekType, step, cfg, { role: i.role, e1rm: isEstimate ? null : lastRegular?.e1rm, increment: weightIncrement(i.exercise, i.role, cfg), available: i.available })
  p = wt.p
  notes.push(...wt.notes)
  const ci = applyCheckin(p, i.checkin, i.exercise, step, cfg)
  p = ci.p
  notes.push(...ci.notes)
  return { ...p, notes, isEstimate }
}

// ---------------------------------------------------------------------------
// Empfohlene Wiederholungsbereiche: siehe roles.ts (recommendedRepRanges)

/** Maximalkraft eines geplanten Satzes – für Vorschauen. */
export function plannedE1rm(weight: number | null, reps: number, rir: number): number {
  return weight ? e1rmSet(weight, reps, rir) : 0
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}
