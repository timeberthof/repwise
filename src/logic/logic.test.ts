import { describe, expect, it } from 'vitest'
import { hrMax, zoneOf, zoneRange, zoneText } from './heartRate'
import { ageOn, weekdayIndex, formatLong, axisLabel } from './dates'
import { e1rmSet, sessionE1rm } from './e1rm'
import { weeklyStreak, dayState, weekStart } from './streak'
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

describe('Serie (Wochen in Folge mit Training)', () => {
  it('beginnt die Woche am Montag', () => {
    expect(weekStart('2026-11-09')).toBe('2026-11-09') // Montag
    expect(weekStart('2026-11-15')).toBe('2026-11-09') // Sonntag
  })
  it('zählt aufeinanderfolgende Wochen', () => {
    const done = new Set(['2026-10-20', '2026-10-28', '2026-11-03', '2026-11-05'])
    expect(weeklyStreak('2026-11-06', done)).toBe(3)
  })
  it('eine noch leere laufende Woche bricht die Serie nicht ab', () => {
    const done = new Set(['2026-10-28', '2026-11-03'])
    expect(weeklyStreak('2026-11-10', done)).toBe(2)
  })
  it('eine Woche ohne Training beendet die Serie', () => {
    const done = new Set(['2026-10-20', '2026-11-03'])
    expect(weeklyStreak('2026-11-04', done)).toBe(1)
    expect(weeklyStreak('2026-11-18', done)).toBe(0)
  })
  it('liefert Tageszustände ohne Plan', () => {
    const done = new Set(['2026-10-14', '2026-10-17'])
    expect(dayState('2026-10-14', '2026-10-17', done)).toBe('done')
    expect(dayState('2026-10-17', '2026-10-17', done)).toBe('today')
    expect(dayState('2026-10-16', '2026-10-17', done)).toBe('rest')
    expect(dayState('2026-10-19', '2026-10-17', done)).toBe('future')
  })
})
