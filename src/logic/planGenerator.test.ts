import { describe, expect, it } from 'vitest'
import { generatePlan, recommendedSplits, dayNamesFor, estimateMinutes, type PlanInput } from './planGenerator'
import { LIBRARY, getExercise } from '../data/exercises'
import { ALL_EQUIPMENT } from '../data/equipment'

const base: PlanInput = {
  split: 'push_pull',
  weekdays: [0, 1, 2, 3, 4, 5],
  sessionMinutes: 75,
  experience: 'fortgeschritten',
  focus: ['trizeps', 'ruecken'],
  equipment: ALL_EQUIPMENT,
  excluded: [],
  pains: [{ region: 'sprunggelenk_rechts', level: 7 }],
  location: 'gym',
  mobility: true,
  preferred: ['bankdruecken-multipresse', 'butterfly', 'trizepsdruecken', 'latzug', 'kabelrudern', 'beinpresse', 'cable-curls'],
  library: LIBRARY,
}

describe('Planerstellung', () => {
  it('erstellt Push/Pull an 6 Tagen mit Mobility', () => {
    const plan = generatePlan(base)
    const kraft = plan.filter((d) => d.kind === 'kraft')
    expect(kraft.map((d) => d.name)).toEqual(['Push', 'Pull', 'Push', 'Pull', 'Push', 'Pull'])
    expect(plan.filter((d) => d.kind === 'mobility')).toHaveLength(6)
  })

  it('bevorzugt Übungen mit Verlauf', () => {
    const push = generatePlan(base)[0]
    const ids = push.exercises.map((e) => e.exerciseId)
    expect(ids).toContain('bankdruecken-multipresse')
    expect(ids).toContain('trizepsdruecken')
  })

  it('hält die Dauer ein', () => {
    for (const d of generatePlan(base).filter((x) => x.kind === 'kraft')) {
      expect(estimateMinutes(d.exercises)).toBeLessThanOrEqual(75 + 12)
      expect(d.exercises.length).toBeGreaterThanOrEqual(4)
    }
  })

  it('schont das schmerzende Sprunggelenk', () => {
    const all = generatePlan(base).filter((d) => d.kind === 'kraft').flatMap((d) => d.exercises)
    for (const e of all) expect(getExercise(e.exerciseId)!.gelenke).not.toContain('sprunggelenk')
  })

  it('Mobility zielt auf die Problemzone', () => {
    const mob = generatePlan(base).find((d) => d.kind === 'mobility')!
    const regions = mob.exercises.map((e) => getExercise(e.exerciseId)!.primaer)
    expect(regions).toContain('sprunggelenk')
    expect(mob.exercises.every((e) => e.superset)).toBe(true)
  })

  it('nutzt nur verfügbares Equipment', () => {
    const plan = generatePlan({ ...base, location: 'ohne_geraete', equipment: ['koerpergewicht'], preferred: [] })
    for (const e of plan.flatMap((d) => d.exercises)) {
      expect(getExercise(e.exerciseId)!.equipment.every((q) => q === 'koerpergewicht')).toBe(true)
    }
  })

  it('beachtet ausgeschlossene Übungen', () => {
    const plan = generatePlan({ ...base, excluded: ['bankdruecken-multipresse'] })
    expect(plan.flatMap((d) => d.exercises).map((e) => e.exerciseId)).not.toContain('bankdruecken-multipresse')
  })

  it('Volumen passt zur Erfahrung', () => {
    const sets = (exp: PlanInput['experience']) => generatePlan({ ...base, experience: exp, focus: [] }).flatMap((d) => d.kind === 'kraft' ? d.exercises : []).reduce((s, e) => s + e.sets, 0)
    expect(sets('anfaenger')).toBeLessThan(sets('profi'))
  })

  it('empfiehlt Splits passend zu den Tagen', () => {
    expect(recommendedSplits(2)).toEqual(['ganzkoerper'])
    expect(recommendedSplits(6)).toContain('push_pull')
    expect(dayNamesFor('push_pull_legs', [0, 2, 4])).toEqual({ 0: 'Push', 2: 'Pull', 4: 'Legs' })
  })
})
