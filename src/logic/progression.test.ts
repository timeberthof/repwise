import { describe, expect, it } from 'vitest'
import { getExercise } from '../data/exercises'
import {
  PROGRESSION_CONFIG,
  applyCheckin,
  applyWeekType,
  baseSuggestion,
  calibrationWeight,
  detectStagnation,
  nextWeight,
  pauseReduction,
  prescribe,
  roundWeight,
  type ExerciseHistory,
} from './progression'

const bench = getExercise('bankdruecken-multipresse')!
const pushups = getExercise('liegestuetze')!
const curls = getExercise('cable-curls')!

const sets = (weight: number, reps: number[], rir = 2) => reps.map((r) => ({ weight, reps: r, rir, done: true }))
function hist(...sessions: { weight: number; reps: number[]; rir?: number; e1rm?: number; reset?: boolean }[]): ExerciseHistory {
  return {
    sessions: sessions.map((s, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      weight: s.weight,
      sets: sets(s.weight, s.reps, s.rir ?? 2),
      repMin: 8,
      repMax: 12,
      targetRir: 2,
      e1rm: s.e1rm ?? s.weight * (1 + (Math.min(...s.reps) + 2) / 30),
      stagnationReset: s.reset,
    })),
  }
}

describe('Gewichte runden', () => {
  it('rundet auf den Schritt', () => {
    expect(roundWeight(51.3, 2.5, 'down')).toBe(50)
    expect(roundWeight(51.3, 2.5, 'up')).toBe(52.5)
    expect(roundWeight(51.3, 2.5)).toBe(52.5)
  })
  it('nutzt verfügbare Gewichte', () => {
    expect(nextWeight(20, 2.5, 1, [18, 20, 22, 24])).toBe(22)
    expect(roundWeight(23, 2.5, 'down', [18, 20, 22, 24])).toBe(22)
  })
})

describe('Doppelte Progression', () => {
  it('erhöht das Gewicht, wenn alle Sätze das obere Ende beim Ziel-RIR schaffen', () => {
    const r = baseSuggestion({ exercise: bench, repMin: 8, repMax: 12, targetRir: 2, plannedSets: 3, history: hist({ weight: 50, reps: [12, 12, 12] }) })
    expect(r.weight).toBe(52.5)
    expect(r.notes[0].reason).toBe('+2,5 kg, weil du alle Sätze mit 12 Wdh. geschafft hast. Jetzt wieder mit 8 Wdh. beginnen.')
  })

  it('erhöht nicht, wenn das Ziel-RIR unterschritten wurde', () => {
    const r = baseSuggestion({ exercise: bench, repMin: 8, repMax: 12, targetRir: 2, plannedSets: 3, history: hist({ weight: 50, reps: [12, 12, 12], rir: 0 }) })
    expect(r.weight).toBe(50)
  })

  it('hält das Gewicht beim ersten Mal unter dem Bereich', () => {
    const r = baseSuggestion({ exercise: bench, repMin: 8, repMax: 12, targetRir: 2, plannedSets: 3, history: hist({ weight: 50, reps: [9, 8, 7] }) })
    expect(r.weight).toBe(50)
    expect(r.notes[0].title).toBe('Gewicht bleibt')
  })

  it('reduziert um 5–10 % beim zweiten Mal in Folge unter dem Bereich', () => {
    const r = baseSuggestion({ exercise: bench, repMin: 8, repMax: 12, targetRir: 2, plannedSets: 3, history: hist({ weight: 50, reps: [8, 7, 7] }, { weight: 50, reps: [8, 7, 6] }) })
    expect(r.weight).toBe(45)
    expect(r.weight! / 50).toBeGreaterThanOrEqual(0.9)
  })

  it('schlägt bei Körpergewicht mehr Wiederholungen vor', () => {
    const r = baseSuggestion({ exercise: pushups, repMin: 8, repMax: 12, targetRir: 2, plannedSets: 3, history: { sessions: [{ date: '2026-10-01', weight: null, sets: [{ weight: null, reps: 12, rir: 2, done: true }], repMin: 8, repMax: 12, targetRir: 2, e1rm: null }] } })
    expect(r.notes[0].field).toBe('reps')
    expect(r.weight).toBeNull()
  })

  it('braucht Kalibrierung ohne Verlauf', () => {
    const r = baseSuggestion({ exercise: bench, repMin: 8, repMax: 12, targetRir: 2, plannedSets: 3, history: { sessions: [] } })
    expect(r.needsCalibration).toBe(true)
  })
})

describe('Stagnation', () => {
  it('erkennt 3 Einheiten ohne Fortschritt', () => {
    const h = hist({ weight: 50, reps: [10, 10, 10], e1rm: 66 }, { weight: 50, reps: [10, 10, 9], e1rm: 65 }, { weight: 50, reps: [10, 9, 9], e1rm: 64 }, { weight: 50, reps: [10, 10, 9], e1rm: 65 })
    expect(detectStagnation(h)).toBe(true)
    const r = baseSuggestion({ exercise: bench, repMin: 8, repMax: 12, targetRir: 2, plannedSets: 3, history: h })
    expect(r.weight).toBe(45)
    expect(r.stagnation).toBe(true)
  })
  it('zählt eine neue Bestleistung als Fortschritt', () => {
    const h = hist({ weight: 50, reps: [10, 10, 10], e1rm: 66 }, { weight: 50, reps: [10, 10, 9], e1rm: 65 }, { weight: 50, reps: [11, 11, 11], e1rm: 67 }, { weight: 50, reps: [10, 10, 9], e1rm: 65 })
    expect(detectStagnation(h)).toBe(false)
  })
  it('wartet nach einem Reset erneut 3 Einheiten', () => {
    const h = hist({ weight: 50, reps: [10], e1rm: 66 }, { weight: 45, reps: [10], e1rm: 60, reset: true }, { weight: 45, reps: [10], e1rm: 60 }, { weight: 45, reps: [10], e1rm: 60 })
    expect(detectStagnation(h)).toBe(false)
  })
})

describe('Kalibrierung', () => {
  it('schätzt aus der eigenen Maximalkraft', () => {
    const c = calibrationWeight({ exercise: bench, repMax: 8, targetRir: 2, ownE1rm: 61.67 })
    // 61,67 / (1 + 10/30) = 46,25 × 0,95 = 43,9 → 42,5
    expect(c.weight).toBe(42.5)
    expect(c.note.title).toBe('Schätzung')
  })
  it('schätzt vorsichtig aus einer verwandten Übung', () => {
    const c = calibrationWeight({ exercise: getExercise('kurzhantel-bankdruecken')!, repMax: 12, targetRir: 2, related: { exercise: bench, e1rm: 61.67 } })
    expect(c.weight).toBeGreaterThan(0)
    expect(c.weight).toBeLessThan(25)
    expect(c.note.reason).toContain('Bankdrücken an der Multipresse')
  })
  it('ohne Daten: kein Gewicht, aber Hinweis', () => {
    const c = calibrationWeight({ exercise: bench, repMax: 12, targetRir: 2 })
    expect(c.weight).toBeNull()
  })
})

describe('Trainingspause', () => {
  it('reduziert nach 14, 28 und 56 Tagen', () => {
    expect(pauseReduction(10, 50, 2.5).weight).toBe(50)
    expect(pauseReduction(15, 50, 2.5).weight).toBe(45)
    expect(pauseReduction(30, 50, 2.5).weight).toBe(40)
    expect(pauseReduction(60, 50, 2.5).weight).toBe(35)
    expect(pauseReduction(60, 50, 2.5).note?.reason).toContain('60 Tagen')
  })
})

describe('Wochentypen', () => {
  const base = { sets: 4, repMin: 8, repMax: 12, targetRir: 2, weight: 50 }
  it('Deload halbiert die Sätze (wie im Original 4 → 2)', () => {
    const r = applyWeekType(base, 'deload', 2.5)
    expect(r.p.sets).toBe(2)
    expect(r.notes[0].reason).toBe('Die Anzahl deiner Sätze wurde durch die Deload-Woche für eine optimale Progression angepasst.')
  })
  it('Overreaching +1 Satz bei Mehrgelenksübungen (höchstens 4), Intro gibt mehr Reserve', () => {
    expect(applyWeekType({ ...base, sets: 3 }, 'overreaching', 2.5, undefined, { role: 'ergaenzung' }).p.sets).toBe(4)
    expect(applyWeekType(base, 'overreaching', 2.5, undefined, { role: 'grund' }).p.sets).toBe(4)
    expect(applyWeekType({ ...base, sets: 3 }, 'overreaching', 2.5, undefined, { role: 'isolation' }).p.sets).toBe(3)
    const intro = applyWeekType(base, 'intro', 2.5)
    expect(intro.p.sets).toBe(4)
    expect(intro.p.targetRir).toBe(3)
  })
  it('Peak Week senkt die Reserve', () => {
    expect(applyWeekType(base, 'peak', 2.5).p.targetRir).toBe(1)
  })
  it('Normal ändert nichts', () => {
    const r = applyWeekType(base, 'normal', 2.5)
    expect(r.p).toEqual(base)
    expect(r.notes).toHaveLength(0)
  })
  it('folgt der Zyklus-Reihenfolge', () => {
    expect(PROGRESSION_CONFIG.cycle).toEqual(['intro', 'normal', 'normal', 'overreaching', 'peak', 'deload'])
  })
})

describe('Erholungs-Check-in', () => {
  const base = { sets: 3, repMin: 8, repMax: 12, targetRir: 2, weight: 50 }
  it('senkt Volumen bei wenig Energie', () => {
    const r = applyCheckin(base, { energy: 2, sleep: 8 }, bench, 2.5)
    expect(r.p.sets).toBe(2)
    expect(r.p.targetRir).toBe(3)
  })
  it('senkt Volumen bei starkem Muskelkater des Zielmuskels', () => {
    const r = applyCheckin(base, { energy: 8, soreness: { brust: 8 } }, bench, 2.5)
    expect(r.p.sets).toBe(2)
    expect(r.p.weight).toBe(50)
  })
  it('senkt bei sehr starkem Muskelkater auch das Gewicht', () => {
    const r = applyCheckin(base, { soreness: { brust: 10 } }, bench, 2.5)
    expect(r.p.weight).toBe(45)
  })
  it('steigert nie – auch bei bester Erholung', () => {
    const r = applyCheckin(base, { energy: 10, sleep: 10, soreness: { brust: 0 } }, bench, 2.5)
    expect(r.p).toEqual(base)
  })
  it('ignoriert Muskelkater anderer Muskeln', () => {
    const r = applyCheckin(base, { soreness: { bizeps: 10 } }, bench, 2.5)
    expect(r.p.sets).toBe(3)
  })
  it('übersprungener Check-in ändert nichts', () => {
    expect(applyCheckin(base, { skipped: true, energy: 0 }, bench, 2.5).p).toEqual(base)
  })
  it('geht nie unter einen Satz', () => {
    const r = applyCheckin({ ...base, sets: 1 }, { energy: 0, soreness: { brust: 10 } }, bench, 2.5)
    expect(r.p.sets).toBe(1)
  })
})

describe('Gesamte Vorgabe', () => {
  it('kombiniert Progression und Deload', () => {
    const r = prescribe({ exercise: curls, repMin: 8, repMax: 12, targetRir: 2, plannedSets: 4, history: hist({ weight: 30, reps: [12, 12, 12, 12] }), weekType: 'deload', daysSinceLast: 3 })
    expect(r.weight).toBe(32.5)
    expect(r.sets).toBe(2)
    expect(r.notes.map((n) => n.kind)).toEqual(['progression', 'wochentyp', 'wochentyp'])
  })
  it('markiert Schätzungen', () => {
    const r = prescribe({ exercise: bench, repMin: 8, repMax: 12, targetRir: 2, plannedSets: 3, history: { sessions: [] }, weekType: 'normal', daysSinceLast: null, calibration: { ownE1rm: 61.67 } })
    expect(r.isEstimate).toBe(true)
    // 61,67 / (1 + 14/30) × 0,95 = 39,95 → abgerundet 37,5
    expect(r.weight).toBe(37.5)
  })
})
