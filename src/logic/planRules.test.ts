import { describe, expect, it } from 'vitest'
import type { EquipmentId, Pain, SplitId } from '../db/types'
import { LIBRARY, getExercise } from '../data/exercises'
import { ALL_EQUIPMENT } from '../data/equipment'
import { generatePlanWithReport, suggestAlternative, type PlanInput } from './planGenerator'
import { trimDay, balanceWeek, daySets, draftFor, type DraftDay } from './planBalance'
import { contributions, weekVolume, primaryGroup } from './volume'
import { orderRank, roleOf, setRange } from './roles'
import { changesBetween, occurrenceIndex, resolveVariants, rotating } from './variants'
import { applyWeekType, baseSuggestion, increasedWeight, limitSessionSets, PROGRESSION_CONFIG, regularHistory, weightIncrement, type ExerciseHistory } from './progression'
import { allowedExercises, possibleGroups } from './selection'

const P = PROGRESSION_CONFIG.planning

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
  mobility: false,
  preferred: ['bankdruecken-multipresse', 'sitzendes-kurzhantel-schulterdruecken', 'butterfly', 'trizepsdruecken', 'beinpresse', 'latzug', 'kabelrudern', 'kurzhantel-kreuzheben-gestreckt', 'cable-curls', 'butterfly-reverse', 'beinbeuger-liegend', 'bauchpresse'],
  library: LIBRARY,
}

const weekdaysFor = (n: number) => ({ 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] })[n]!
const HOME: EquipmentId[] = ['kurzhantel', 'bank', 'widerstandsband', 'koerpergewicht', 'klimmzugstange']

function variantsOfAll(input: PlanInput) {
  const out: { split: SplitId; days: number; input: PlanInput }[] = []
  for (const split of ['push_pull', 'upper_lower', 'push_pull_legs', 'ganzkoerper'] as SplitId[])
    for (const days of [2, 3, 4, 5, 6, 7])
      for (const variant of [
        {},
        { pains: [] as Pain[] },
        { location: 'zuhause' as const, equipment: HOME, preferred: [] },
        { location: 'ohne_geraete' as const, equipment: ['koerpergewicht'] as EquipmentId[], preferred: [] },
        { experience: 'anfaenger' as const, focus: [] },
        { experience: 'profi' as const, sessionMinutes: 45 },
      ])
        out.push({ split, days, input: { ...input, split, weekdays: weekdaysFor(days), ...variant } })
  return out
}

describe('Harte Grenzen pro Einheit', () => {
  const all = variantsOfAll(base)

  it('nie mehr als 7 Übungen – für alle Splits, Tage, Equipment und Erfahrungen', () => {
    for (const { input } of all) {
      for (const d of generatePlanWithReport(input).days.filter((x) => x.kind === 'kraft')) expect(d.exercises.length).toBeLessThanOrEqual(P.maxExercises)
    }
  })

  it('2–4 Arbeitssätze pro Übung im Bereich ihrer Rolle, höchstens 22 Sätze pro Einheit', () => {
    for (const { input } of all) {
      for (const d of generatePlanWithReport(input).days.filter((x) => x.kind === 'kraft')) {
        for (const e of d.exercises) {
          const [lo, hi] = setRange(e.role)
          expect(e.sets).toBeGreaterThanOrEqual(Math.max(P.minSetsPerExercise, lo))
          expect(e.sets).toBeLessThanOrEqual(Math.min(P.maxSetsPerExercise, hi))
        }
        expect(d.exercises.reduce((s, e) => s + e.sets, 0)).toBeLessThanOrEqual(P.maxSessionSets)
      }
    }
  })

  it('mindestens 14 Sätze pro Einheit im Studio bei 75 Minuten', () => {
    for (const split of ['push_pull', 'upper_lower', 'push_pull_legs'] as SplitId[]) {
      for (const d of generatePlanWithReport({ ...base, split, pains: [] }).days.filter((x) => x.kind === 'kraft')) {
        expect(d.exercises.reduce((s, e) => s + e.sets, 0)).toBeGreaterThanOrEqual(P.minSessionSets)
      }
    }
  })

  it('Reihenfolge: Grundübungen → Ergänzung → Isolation', () => {
    for (const { input } of all.slice(0, 40)) {
      for (const d of generatePlanWithReport(input).days.filter((x) => x.kind === 'kraft')) {
        const ranks = d.exercises.map((e) => orderRank(getExercise(e.exerciseId)!, e.role, e.anchor))
        expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
      }
    }
  })

  it('höchstens 2 Anker je Einheit, Anker sind Mehrgelenksübungen ohne Rotation', () => {
    for (const d of generatePlanWithReport(base).days) {
      const anchors = d.exercises.filter((e) => e.anchor)
      expect(anchors.length).toBeLessThanOrEqual(P.maxAnchors)
      for (const a of anchors) {
        expect(a.role).not.toBe('isolation')
        expect(a.variants).toEqual([a.exerciseId])
      }
    }
  })

  it('Vorgaben nach Rolle: Wiederholungen, Pause, RIR', () => {
    const days = generatePlanWithReport({ ...base, pains: [] }).days
    const all2 = days.flatMap((d) => d.exercises)
    const bench = all2.find((e) => e.exerciseId === 'bankdruecken-multipresse')!
    expect([bench.repMin, bench.repMax, bench.targetRir]).toEqual([5, 8, 2])
    expect(bench.restSec).toBeGreaterThanOrEqual(120)
    const curls = all2.find((e) => e.exerciseId === 'cable-curls')!
    expect([curls.repMin, curls.repMax, curls.targetRir]).toEqual([10, 15, 1])
    expect(curls.restSec).toBeLessThanOrEqual(90)
    const pulldown = all2.find((e) => e.exerciseId === 'latzug')!
    expect([pulldown.repMin, pulldown.repMax]).toEqual([8, 12])
  })
})

describe('Wochenvolumen', () => {
  it('zählt anteilig: Bankdrücken = Brust 1, Trizeps 0,5, vordere Schulter 0,5', () => {
    const c = contributions(getExercise('bankdruecken')!)
    expect(c.get('brust')).toBe(1)
    expect(c.get('trizeps')).toBe(0.5)
    expect(c.get('vordere_schulter')).toBe(0.5)
    const v = weekVolume([[{ exerciseId: 'bankdruecken', sets: 3 }]])
    expect(v.brust).toMatchObject({ sets: 3, direct: 3, indirect: 0, frequency: 1 })
    expect(v.trizeps).toMatchObject({ sets: 1.5, direct: 0, indirect: 3 })
  })

  it('Schulterdrücken zählt für die vordere Schulter', () => {
    expect(primaryGroup(getExercise('sitzendes-kurzhantel-schulterdruecken')!)).toBe('vordere_schulter')
    expect(contributions(getExercise('sitzendes-kurzhantel-schulterdruecken')!).get('seitliche_schulter')).toBe(0.5)
  })

  for (const cfg of [
    { split: 'push_pull' as SplitId, days: 6, pains: base.pains },
    { split: 'push_pull' as SplitId, days: 6, pains: [] },
    { split: 'push_pull_legs' as SplitId, days: 6, pains: [] },
  ]) {
    it(`${cfg.split} an ${cfg.days} Tagen: jede mögliche Gruppe 10–20 Sätze und mindestens 2× pro Woche`, () => {
      const { report } = generatePlanWithReport({ ...base, split: cfg.split, weekdays: weekdaysFor(cfg.days), pains: cfg.pains })
      expect(report.problems).toEqual([])
      for (const [g, v] of Object.entries(report.volume)) {
        if (report.impossible.includes(g as never)) continue
        expect(v.sets, g).toBeGreaterThanOrEqual(P.weeklyMin)
        expect(v.sets, g).toBeLessThanOrEqual(P.weeklyMax)
        expect(v.frequency, g).toBeGreaterThanOrEqual(P.minFrequency)
      }
    })
  }

  it('Drücken : Ziehen und Quadrizeps : Beinbeuger etwa 1 : 1', () => {
    const { report } = generatePlanWithReport({ ...base, pains: [] })
    expect(report.ratios.pushPull!).toBeGreaterThan(0.75)
    expect(report.ratios.pushPull!).toBeLessThan(1.35)
    expect(report.ratios.quadHam!).toBeGreaterThan(0.75)
    expect(report.ratios.quadHam!).toBeLessThan(1.35)
  })

  it('Waden bei Schmerzen im Sprunggelenk: als „nicht möglich“ erkannt, kein Fehler', () => {
    const { report } = generatePlanWithReport(base)
    expect(report.impossible).toContain('waden')
    expect(report.problems.join()).not.toContain('Waden')
  })

  it('macht einen Vorschlag, wenn der Split die Grenze nicht erreicht, statt sie zu überschreiten', () => {
    const input = { ...base, split: 'ganzkoerper' as SplitId, weekdays: [0, 2, 4], pains: [] }
    const { days, report } = generatePlanWithReport(input)
    expect(report.ok).toBe(false)
    for (const d of days) expect(d.exercises.length).toBeLessThanOrEqual(7)
    const s = suggestAlternative(input)
    expect(s).not.toBeNull()
    expect(s!.weekdays.length).toBeGreaterThan(3)
  })

  it('nutzt nur verfügbares Equipment', () => {
    const { days } = generatePlanWithReport({ ...base, location: 'ohne_geraete', equipment: ['koerpergewicht'], preferred: [] })
    for (const e of days.flatMap((d) => d.exercises.flatMap((x) => x.variants ?? [x.exerciseId]))) {
      expect(getExercise(e)!.equipment.every((q) => q === 'koerpergewicht')).toBe(true)
    }
  })
})

describe('Bestehende Einheiten kürzen', () => {
  const sel = { equipment: ALL_EQUIPMENT, excluded: [], pains: [], location: 'gym' as const, experience: 'fortgeschritten' as const, preferred: [], library: LIBRARY }
  const pool = allowedExercises(sel)
  const ctx = { lookup: getExercise, pick: () => undefined, experience: 'fortgeschritten' as const, focus: [], possible: possibleGroups(pool), log: [] as string[] }
  const mk = (ids: string[], anchors: string[] = []): DraftDay => ({
    name: 'Push',
    weekday: 0,
    groups: ['brust', 'vordere_schulter', 'seitliche_schulter', 'trizeps', 'quadrizeps', 'waden', 'bauch'],
    exercises: ids.map((id) => draftFor(getExercise(id)!, ctx, { anchor: anchors.includes(id) })),
  })

  it('kürzt auf 7, behält Grundübungen und streicht zuerst nicht gezählte bzw. überversorgte Muskeln', () => {
    const day = mk(['bankdruecken-multipresse', 'sitzendes-kurzhantel-schulterdruecken', 'beinpresse', 'butterfly', 'kabel-crossover', 'sitzendes-seitheben', 'trizepsdruecken', 'beinstrecker', 'adduktorenmaschine'], ['bankdruecken-multipresse', 'sitzendes-kurzhantel-schulterdruecken'])
    const before = daySets(day)
    const removed = trimDay(day, [day], ctx)
    expect(day.exercises.length).toBe(7)
    const ids = day.exercises.map((e) => e.exerciseId)
    expect(ids).toContain('bankdruecken-multipresse')
    expect(ids).toContain('sitzendes-kurzhantel-schulterdruecken')
    // Adduktoren werden nicht gezählt → zuerst gestrichen; danach die doppelte Brust-Isolation
    expect(removed[0]).toBe('adduktorenmaschine')
    expect(removed).toHaveLength(2)
    // Sätze umverteilt, ohne Grenzen zu verletzen
    expect(daySets(day)).toBeLessThanOrEqual(Math.min(before, P.maxSessionSets))
    for (const e of day.exercises) expect(e.sets).toBeLessThanOrEqual(setRange(e.role)[1])
  })

  it('der Ausgleich hält eine Woche mit zu vielen Übungen danach in allen Grenzen', () => {
    const week = [0, 2, 4].map((wd) => ({ ...mk(['bankdruecken-multipresse', 'sitzendes-kurzhantel-schulterdruecken', 'beinpresse', 'butterfly', 'kabel-crossover', 'sitzendes-seitheben', 'trizepsdruecken', 'beinstrecker', 'adduktorenmaschine'], ['bankdruecken-multipresse']), weekday: wd }))
    balanceWeek(week, ctx)
    for (const d of week) {
      expect(d.exercises.length).toBeLessThanOrEqual(7)
      expect(daySets(d)).toBeLessThanOrEqual(22)
    }
  })
})

describe('Variation von Training zu Training', () => {
  const day = generatePlanWithReport({ ...base, pains: [] }).days[0]

  it('Ergänzungs-/Isolationsübungen haben 2–3 Varianten mit gleichem Muster, Zielmuskel und Rolle', () => {
    for (const e of day.exercises.filter((x) => !x.anchor)) {
      const ex = getExercise(e.exerciseId)!
      expect(e.variants!.length).toBeLessThanOrEqual(P.maxVariants)
      for (const v of e.variants!) {
        const ve = getExercise(v)!
        expect(ve.muster).toBe(ex.muster)
        expect(ve.primaer).toBe(ex.primaer)
        expect(roleOf(ve)).toBe(roleOf(ex))
      }
    }
  })

  it('rotiert im Wechsel: Einheit A Variante 1, nächste gleiche Einheit Variante 2 …', () => {
    const list = [{ exerciseId: 'seitheben-kabel', variants: ['seitheben-kabel', 'seitheben-stehend'] }]
    expect([0, 1, 2, 3].map((k) => resolveVariants(list, k)[0])).toEqual(['seitheben-kabel', 'seitheben-stehend', 'seitheben-kabel', 'seitheben-stehend'])
  })

  it('pro Einheit wechseln höchstens 3 Übungen, Anker und fixierte Übungen nie', () => {
    const list = [
      { exerciseId: 'a', variants: ['a'], anchor: true },
      { exerciseId: 'b', variants: ['b', 'b2'] },
      { exerciseId: 'c', variants: ['c', 'c2'] },
      { exerciseId: 'd', variants: ['d', 'd2', 'd3'] },
      { exerciseId: 'e', variants: ['e', 'e2'] },
      { exerciseId: 'f', variants: ['f', 'f2'], pinned: true },
      { exerciseId: 'g', variants: ['g', 'g2'] },
    ]
    expect(rotating(list)).toHaveLength(5)
    for (let k = 1; k < 12; k++) {
      const changes = changesBetween(list, k)
      expect(changes).toBeGreaterThan(0)
      expect(changes).toBeLessThanOrEqual(P.maxRotationsPerSession)
      const ids = resolveVariants(list, k)
      expect(ids[0]).toBe('a')
      expect(ids[5]).toBe('f')
    }
  })

  it('zählt Einheiten seit Planstart; in der Deload-Woche bleibt die Variante der letzten Einheit', () => {
    const weekTypeOf = (d: string) => (d >= '2026-11-02' && d <= '2026-11-08' ? 'deload' : 'normal') as 'deload' | 'normal'
    const opts = { startDate: '2026-10-19', weekdays: [0, 2, 4], weekTypeOf }
    expect(occurrenceIndex({ ...opts, date: '2026-10-19' })).toBe(0)
    expect(occurrenceIndex({ ...opts, date: '2026-10-21' })).toBe(1)
    expect(occurrenceIndex({ ...opts, date: '2026-10-30' })).toBe(5)
    // Deload: gleiche Übungen wie zuletzt
    expect(occurrenceIndex({ ...opts, date: '2026-11-02' })).toBe(5)
    expect(occurrenceIndex({ ...opts, date: '2026-11-06' })).toBe(5)
    // danach geht es weiter, ohne dass die Deload-Einheiten mitzählen
    expect(occurrenceIndex({ ...opts, date: '2026-11-09' })).toBe(6)
  })
})

describe('Progression', () => {
  const hist = (weight: number, reps: number[], rir = 2, weekType?: 'normal' | 'deload' | 'peak'): ExerciseHistory['sessions'][number] => ({
    date: '2026-10-10',
    weight,
    sets: reps.map((r) => ({ weight, reps: r, rir, done: true })),
    repMin: 5,
    repMax: 8,
    targetRir: 2,
    e1rm: weight * (1 + (reps[0] + rir) / 30),
    weekType,
  })

  it('Grundübung Oberkörper +2,5 kg, Unterkörper +5 kg, Isolation kleinster Sprung', () => {
    expect(weightIncrement(getExercise('bankdruecken')!, 'grund')).toBe(2.5)
    expect(weightIncrement(getExercise('kniebeuge')!, 'grund')).toBe(5)
    expect(weightIncrement(getExercise('beinpresse')!, 'ergaenzung')).toBe(5)
    expect(weightIncrement(getExercise('butterfly')!, 'isolation')).toBe(getExercise('butterfly')!.gewichtsschritt)
    expect(increasedWeight(100, 2.5, 5)).toBe(105)
    expect(increasedWeight(50, 2.5, 2.5, [50, 52, 54, 56])).toBe(54)
  })

  it('alle Sätze am oberen Ende → Gewicht hoch und wieder am unteren Ende beginnen', () => {
    const r = baseSuggestion({ exercise: getExercise('kniebeuge')!, repMin: 5, repMax: 8, targetRir: 2, plannedSets: 3, role: 'grund', history: { sessions: [hist(100, [8, 8, 8])] } })
    expect(r.weight).toBe(105)
    expect(r.resetReps).toBe(true)
  })

  it('Deload- und Intensivwochen sind keine Basis für die Progression', () => {
    const h: ExerciseHistory = { sessions: [hist(100, [8, 8, 8]), { ...hist(110, [5, 5]), weekType: 'peak' }, { ...hist(100, [6, 6]), weekType: 'deload' }] }
    expect(regularHistory(h).sessions).toHaveLength(1)
    const r = baseSuggestion({ exercise: getExercise('kniebeuge')!, repMin: 5, repMax: 8, targetRir: 2, plannedSets: 3, role: 'grund', history: h })
    expect(r.weight).toBe(105)
  })
})

describe('Wochentypen im Zyklus', () => {
  const p = { sets: 3, repMin: 5, repMax: 8, targetRir: 2, weight: 100 }

  it('Intensivwoche: unteres Ende des Bereichs, weniger RIR, etwas mehr Gewicht (höchstens 2 Schritte)', () => {
    const r = applyWeekType(p, 'peak', 2.5, undefined, { role: 'grund', e1rm: 130, increment: 5 })
    expect(r.p.targetReps).toBe(5)
    expect(r.p.targetRir).toBe(1)
    expect(r.p.weight).toBeGreaterThan(100)
    expect(r.p.weight).toBeLessThanOrEqual(110)
    // Isolation: RIR darf bis 0
    expect(applyWeekType({ ...p, targetRir: 1 }, 'peak', 2.5, undefined, { role: 'isolation' }).p.targetRir).toBe(0)
  })

  it('Deload: RIR 3–4 und 40–50 % weniger Sätze in der ganzen Einheit, gleiche Übungen', () => {
    const r = applyWeekType(p, 'deload', 2.5, undefined, { role: 'grund' })
    expect(r.p.targetRir).toBeGreaterThanOrEqual(3)
    expect(r.p.targetRir).toBeLessThanOrEqual(4)
    expect(r.p.weight).toBe(100)
    const planned = [4, 3, 3, 3, 2, 2, 2]
    const adjusted = planned.map((s) => applyWeekType({ ...p, sets: s }, 'deload', 2.5).p.sets)
    const roles = ['grund', 'grund', 'ergaenzung', 'isolation', 'isolation', 'isolation', 'isolation'] as const
    const limited = limitSessionSets(planned, adjusted, 'deload', [...roles])
    const total = planned.reduce((s, x) => s + x, 0)
    const after = limited.reduce((s, x) => s + x, 0)
    expect(after / total).toBeGreaterThanOrEqual(0.5)
    expect(after / total).toBeLessThanOrEqual(0.6)
    expect(limited.every((x) => x >= 1)).toBe(true)
  })

  it('Overreaching: +1 Satz bei Mehrgelenksübungen, aber nie über 22 Sätze pro Einheit', () => {
    const planned = [4, 4, 3, 3, 3, 3, 2]
    const roles = ['grund', 'grund', 'ergaenzung', 'ergaenzung', 'isolation', 'isolation', 'isolation'] as const
    const adjusted = planned.map((s, i) => applyWeekType({ ...p, sets: s }, 'overreaching', 2.5, undefined, { role: roles[i] }).p.sets)
    const limited = limitSessionSets(planned, adjusted, 'overreaching', [...roles])
    expect(limited.reduce((s, x) => s + x, 0)).toBeLessThanOrEqual(22)
    expect(limited.every((x) => x <= 4)).toBe(true)
  })
})
