import { beforeAll, describe, expect, it } from 'vitest'
import { db } from '../db'
import { setNow } from '../../logic/dates'
import startwerte from '../../data/startwerte.beispiel.json'
import type { Startwerte } from './startwerte'
import { profileDefaults } from './startwerte'
import { emptyDraft, finishOnboarding } from '../../features/onboarding/draft'
import { completeSet, dayEntries, ensureSession, finishSession, finishSummary, startSession, swapExercise } from './sessions'
import { computeStreak } from '../derived'

const s = startwerte as unknown as Startwerte

describe('Einheiten (Datenbank)', () => {
  beforeAll(async () => {
    setNow(new Date(2026, 9, 18, 10, 0))
    await db.delete()
    await db.open()
    const d = emptyDraft({ ...profileDefaults(s), onboardingDone: false, createdAt: 0 }, 80, 18, true)
    await finishOnboarding(d, s)
  })

  it('übernimmt Startwerte und Serie', async () => {
    expect(await db.strength.count()).toBeGreaterThan(80)
    const profile = (await db.profile.get('me'))!
    const plan = (await db.plans.where('active').equals(1).first())!
    expect(plan.startDate).toBe('2026-10-19')
    expect(await computeStreak(profile, plan)).toBe(1)
  })

  it('zeigt am Montag Push + Mobility in der Intro-Woche', async () => {
    const entries = await dayEntries('2026-10-19')
    expect(entries.map((e) => e.name)).toEqual(['Push', 'Mobility'])
    expect(entries[0].weekType).toBe('intro')
  })

  it('legt eine Einheit mit Vorgaben an', async () => {
    const entries = await dayEntries('2026-10-19')
    const id = await ensureSession('2026-10-19', entries[0].planDay!.id!)
    const list = await db.sessionExercises.where('sessionId').equals(id).sortBy('order')
    const bench = list.find((x) => x.exerciseId === 'bankdruecken-multipresse')!
    // Letztes Arbeitsgewicht 50 kg mit 5 Wdh im Bereich 5–8 → Gewicht bleibt
    expect(bench.weight).toBe(50)
    // Intro-Woche: ein Satz weniger als geplant
    expect(bench.adjustments.some((a) => a.kind === 'wochentyp' && a.field === 'sets')).toBe(true)
    const butterfly = list.find((x) => x.exerciseId === 'butterfly')!
    expect(butterfly.weight).toBe(77.5)
    const leg = list.find((x) => x.exerciseId === 'beinpresse')!
    expect(leg.weightIsEstimate).toBe(true)
    expect(leg.weight).toBeGreaterThan(100)
  })

  it('startet, protokolliert Sätze und schließt ab', async () => {
    const entries = await dayEntries('2026-10-19')
    const id = entries[0].session!.id!
    await startSession(id, { energy: 9, sleep: 9, soreness: { brust: 2 } })
    const se = (await db.sessionExercises.where('sessionId').equals(id).sortBy('order'))[0]
    const sets = await db.sets.where('sessionExerciseId').equals(se.id!).sortBy('index')
    expect(sets.length).toBe(se.sets)
    for (const x of sets) await completeSet(x.id!, { reps: 8, weight: 50, rir: 2 })
    await finishSession(id)
    const sum = (await finishSummary(id))!
    expect(sum.sets).toBe(se.sets)
    expect(sum.strength[0].after).toBeCloseTo(50 * (1 + 10 / 30), 1)
    expect(sum.strength[0].record).toBe(true)
    expect(await db.adjustments.count()).toBeGreaterThan(0)
  })

  it('steigert beim nächsten Push, weil alle Sätze das obere Ende erreicht haben', async () => {
    const entries = await dayEntries('2026-10-21')
    const id = await ensureSession('2026-10-21', entries[0].planDay!.id!)
    const bench = (await db.sessionExercises.where('sessionId').equals(id).toArray()).find((x) => x.exerciseId === 'bankdruecken-multipresse')!
    expect(bench.weight).toBe(52.5)
    expect(bench.adjustments.find((a) => a.kind === 'progression')?.reason).toBe('+2,5 kg, weil du alle Sätze mit 8 Wdh. geschafft hast.')
  })

  it('tauscht eine Übung nur heute oder dauerhaft', async () => {
    const entries = await dayEntries('2026-10-23')
    const id = await ensureSession('2026-10-23', entries[0].planDay!.id!)
    const se = (await db.sessionExercises.where('sessionId').equals(id).toArray()).find((x) => x.exerciseId === 'butterfly')!
    await swapExercise(se.id!, 'kabel-crossover', 'heute')
    expect((await db.sessionExercises.get(se.id!))!.exerciseId).toBe('kabel-crossover')
    const planHas = await db.planExercises.filter((p) => p.exerciseId === 'butterfly').count()
    expect(planHas).toBeGreaterThan(0)
    await swapExercise(se.id!, 'kurzhantel-fliegende', 'dauerhaft')
    expect(await db.planExercises.filter((p) => p.exerciseId === 'butterfly').count()).toBe(0)
  })
})
