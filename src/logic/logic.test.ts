import { describe, expect, it } from 'vitest'
import { calculateCalories } from './calories'
import { hrMax, zoneOf, zoneRange, zoneText } from './heartRate'
import { ageOn, addDays, weekdayIndex, formatLong, axisLabel } from './dates'
import { e1rmSet, sessionE1rm } from './e1rm'
import { weekTypeFor, isLastCycleWeek, nextCycleStart, defaultPlanStart } from './cycle'
import { trainingStreak, dayState } from './streak'
import { signed, fmt } from './format'

describe('Daten & Formate', () => {
  it('berechnet das Alter aus dem Geburtsdatum', () => {
    expect(ageOn('1996-05-01', '2026-10-18')).toBe(30)
    expect(ageOn('1996-05-01', '2027-04-30')).toBe(30)
    expect(ageOn('1996-05-01', '2027-05-01')).toBe(31)
  })
  it('kennt Wochentage (Mo = 0)', () => {
    expect(weekdayIndex('2026-10-15')).toBe(3) // Donnerstag
    expect(weekdayIndex('2026-10-18')).toBe(6) // Sonntag
  })
  it('formatiert wie im Original', () => {
    expect(formatLong('2026-10-15')).toBe('15. Okt. 2026')
    expect(axisLabel('2026-09-10')).toEqual(['Sep', '10'])
    expect(fmt(10913)).toBe('10.913')
    expect(fmt(61.666, 2)).toBe('61,67')
    expect(signed(7.61)).toBe('+7,6 kg')
    expect(signed(-0.35)).toBe('-0,3 kg')
  })
})

describe('Maximalkraft', () => {
  it('entspricht den Werten des Originals', () => {
    expect(e1rmSet(50, 5, 2)).toBeCloseTo(61.67, 2)
    expect(e1rmSet(72.5, 9, 2)).toBeCloseTo(99.08, 2)
  })
  it('mittelt über erledigte Sätze', () => {
    expect(sessionE1rm([
      { weight: 50, reps: 5, rir: 2, done: true },
      { weight: 50, reps: 7, rir: 0, done: true },
      { weight: 50, reps: 12, rir: 0, done: false },
    ])).toBeCloseTo(61.67, 2)
  })
})

describe('Kalorien (Mifflin-St-Jeor)', () => {
  it('berechnet Grundumsatz, Gesamtumsatz und Ziel', () => {
    const r = calculateCalories({ sex: 'm', weightKg: 80, heightCm: 180, age: 30, activity: 'moderat', goal: 'fett_verlieren' })
    expect(r.bmr).toBe(1780) // 800 + 1125 − 150 + 5
    expect(r.tdee).toBe(2759) // × 1,55
    expect(r.target).toBe(2207) // − 20 %
    expect(r.steps).toHaveLength(3)
  })
  it('passt sich an Gewicht und Ziel an', () => {
    const a = calculateCalories({ sex: 'm', weightKg: 80, heightCm: 180, age: 30, activity: 'moderat', goal: 'halten' })
    const b = calculateCalories({ sex: 'm', weightKg: 78, heightCm: 180, age: 30, activity: 'moderat', goal: 'halten' })
    expect(a.target).toBe(a.tdee)
    expect(b.target).toBeLessThan(a.target)
  })
})

describe('Herzfrequenz-Zonen', () => {
  it('nutzt Tanaka und erlaubt eine eigene HFmax', () => {
    expect(hrMax(22)).toBe(193)
    expect(hrMax(22, 200)).toBe(200)
    expect(zoneRange(2, 193)).toEqual({ min: 116, max: 135 })
    expect(zoneText(2, 193)).toBe('Zone 2: 116–135 bpm')
  })
  it('nutzt eigene Zonengrenzen und ordnet Pulswerte zu', () => {
    const custom = [100, 120, 140, 160, 175, 195]
    expect(zoneRange(2, 193, custom)).toEqual({ min: 120, max: 140 })
    expect(zoneOf(130, 193, custom)).toBe(2)
    expect(zoneOf(130, 193)).toBe(2)
    expect(zoneOf(90, 193)).toBeNull()
    expect(zoneOf(190, 193)).toBe(5)
  })
})

describe('Mesozyklus', () => {
  const plan = { startDate: '2026-10-19', cycleWeeks: 6, weekOverrides: {} as Record<number, never> }
  it('rotiert die Wochentypen automatisch', () => {
    expect(weekTypeFor(plan, '2026-10-19').type).toBe('intro')
    expect(weekTypeFor(plan, '2026-10-26').type).toBe('normal')
    expect(weekTypeFor(plan, '2026-11-02').type).toBe('normal')
    expect(weekTypeFor(plan, '2026-11-09').type).toBe('overreaching')
    expect(weekTypeFor(plan, '2026-11-16').type).toBe('peak')
    expect(weekTypeFor(plan, '2026-11-23').type).toBe('deload')
    expect(weekTypeFor(plan, '2026-11-30').type).toBe('intro')
  })
  it('manuelle Änderung gilt nur für diese Woche', () => {
    const p = { ...plan, weekOverrides: { 5: 'normal' as const } }
    expect(weekTypeFor(p, '2026-11-23')).toEqual({ type: 'normal', manual: true, index: 5 })
    expect(weekTypeFor(p, '2026-11-30').type).toBe('intro')
  })
  it('erkennt die letzte Woche und den nächsten Start', () => {
    expect(isLastCycleWeek(plan, '2026-11-23')).toBe(true)
    expect(isLastCycleWeek(plan, '2026-11-22')).toBe(false)
    expect(nextCycleStart(plan, '2026-11-01')).toBe(addDays('2026-10-19', 42))
  })
  it('startet einen neuen Plan am Montag', () => {
    expect(defaultPlanStart('2026-10-18', 6)).toBe('2026-10-19')
    expect(defaultPlanStart('2026-10-20', 1)).toBe('2026-10-19')
  })
})

describe('Serie', () => {
  const planned = [0, 1, 2, 3, 4, 5]
  it('reißt am verpassten Freitag (wie im Original: Serie 1)', () => {
    const done = new Set(['2026-10-13', '2026-10-14', '2026-10-15', '2026-10-17'])
    expect(trainingStreak({ today: '2026-10-18', doneDates: done, plannedWeekdays: planned })).toBe(1)
  })
  it('heute noch offen bricht nicht ab', () => {
    const done = new Set(['2026-10-13', '2026-10-14'])
    expect(trainingStreak({ today: '2026-10-15', doneDates: done, plannedWeekdays: planned })).toBe(2)
  })
  it('pausierte Tage zählen nicht als verpasst', () => {
    const done = new Set(['2026-10-13', '2026-10-17'])
    const paused = new Set(['2026-10-14', '2026-10-15', '2026-10-16'])
    expect(trainingStreak({ today: '2026-10-17', doneDates: done, plannedWeekdays: planned, pausedDates: paused })).toBe(2)
  })
  it('liefert Tageszustände', () => {
    const done = new Set(['2026-10-14'])
    expect(dayState('2026-10-14', '2026-10-17', done, planned)).toBe('done')
    expect(dayState('2026-10-16', '2026-10-17', done, planned)).toBe('missed')
    expect(dayState('2026-10-18', '2026-10-17', done, planned)).toBe('rest')
    expect(dayState('2026-10-19', '2026-10-17', done, planned)).toBe('future')
  })
})
