import { beforeAll, describe, expect, it } from 'vitest'
import { db } from '../db'
import { setNow } from '../../logic/dates'
import startwerte from '../../data/startwerte.beispiel.json'
import { profileDefaults, type Startwerte } from './startwerte'
import { emptyDraft, finishOnboarding } from '../../features/onboarding/draft'
import { completeSet, dayEntries, ensureSession, finishSession, startSession, swapExercise } from './sessions'
import { cycleWeeks, isoWeek, setWeekOverride } from './cycle'
import { planForDate } from './plan'
import { exerciseDetail } from './stats'
import { adjustmentLog, deleteSessionCompletely, editSet, historyList, sessionDetail } from './journal'
import { weekTypeFor } from '../../logic/cycle'

const s = startwerte as unknown as Startwerte

describe('Phase 4: Zyklus, Detail, Verlauf', () => {
  beforeAll(async () => {
    setNow(new Date(2026, 9, 18, 10, 0))
    await db.delete()
    await db.open()
    await finishOnboarding(emptyDraft({ ...profileDefaults(s), onboardingDone: false, createdAt: 0 }, 80, 18, true), s)
    setNow(new Date(2026, 9, 19, 9, 0))
  })

  it('zeigt den Zyklus mit 6 Wochen und KW', async () => {
    const plan = (await planForDate('2026-10-19'))!
    const weeks = await cycleWeeks(plan, 0)
    expect(weeks.map((w) => w.type)).toEqual(['intro', 'normal', 'normal', 'overreaching', 'peak', 'deload'])
    expect(weeks[0].status).toBe('aktuell')
    expect(weeks[0].kw).toBe(43)
    expect(isoWeek('2026-11-23')).toBe(48)
  })

  it('überspringt den Deload manuell, protokolliert und setzt zurück', async () => {
    let plan = (await planForDate('2026-10-19'))!
    await setWeekOverride(plan, 5, 'normal')
    plan = (await planForDate('2026-10-19'))!
    expect(weekTypeFor(plan, '2026-11-23')).toMatchObject({ type: 'normal', manual: true })
    // Der nächste Zyklus beginnt unverändert mit Intro
    expect(weekTypeFor(plan, '2026-11-30').type).toBe('intro')
    const log = await adjustmentLog()
    expect(log[0].reason).toContain('Deload übersprungen')
    await setWeekOverride(plan, 5, null)
    plan = (await planForDate('2026-10-19'))!
    expect(weekTypeFor(plan, '2026-11-23')).toMatchObject({ type: 'deload', manual: false })
    expect((await adjustmentLog())[0].title).toBe('Wochentyp zurückgesetzt')
  })

  it('berechnet geplante Einheiten einer geänderten Woche neu', async () => {
    const entries = await dayEntries('2026-10-19')
    const id = await ensureSession('2026-10-19', entries[0].planDay!.id!)
    const before = (await db.sessionExercises.where('sessionId').equals(id).toArray())[0].sets
    const plan = (await planForDate('2026-10-19'))!
    await setWeekOverride(plan, 0, 'overreaching')
    const after = (await db.sessionExercises.where('sessionId').equals(id).toArray())[0].sets
    expect(after).toBeGreaterThan(before)
    expect((await db.sessions.get(id))!.weekType).toBe('overreaching')
  })

  it('liefert Detailwerte, Verlauf und Bearbeitung', async () => {
    const entries = await dayEntries('2026-10-19')
    const id = entries[0].session!.id!
    await startSession(id, { skipped: true })
    const se = (await db.sessionExercises.where('sessionId').equals(id).sortBy('order'))[0]
    for (const x of await db.sets.where('sessionExerciseId').equals(se.id!).toArray()) await completeSet(x.id!, { reps: 8, weight: 50, rir: 2 })
    await finishSession(id)

    const detail = await exerciseDetail('bankdruecken-multipresse')
    const own = detail.filter((d) => d.source === 'app')
    expect(own).toHaveLength(1)
    expect(own[0].volume).toBe(50 * 8 * own[0].sets.length)
    expect(own[0].avgReps).toBe(8)
    expect(detail.some((d) => d.source === 'mci' && d.avgWeight === 50)).toBe(true)

    const list = await historyList()
    expect(list[0].type).toBe('training')
    expect(list.some((x) => x.type === 'training' && x.session.imported)).toBe(true)

    const firstSet = (await db.sets.where('sessionExerciseId').equals(se.id!).sortBy('index'))[0]
    const e1Before = (await db.strength.where('sessionId').equals(id).first())!.e1rm
    await editSet(firstSet.id!, { reps: 12, weight: 50, rir: 2 })
    const e1After = (await db.strength.where('sessionId').equals(id).first())!.e1rm
    expect(e1After).toBeGreaterThan(e1Before)
    expect((await adjustmentLog())[0].title).toBe('Satz nachträglich geändert')

    expect((await sessionDetail(id))!.exercises.length).toBeGreaterThan(0)
    await deleteSessionCompletely(id)
    expect(await db.sessions.get(id)).toBeUndefined()
    expect(await db.strength.where('sessionId').equals(id).count()).toBe(0)
  })

  it('protokolliert einen Übungstausch sofort', async () => {
    const entries = await dayEntries('2026-10-21')
    const id = await ensureSession('2026-10-21', entries[0].planDay!.id!)
    const se = (await db.sessionExercises.where('sessionId').equals(id).toArray()).find((x) => x.exerciseId === 'butterfly')!
    await swapExercise(se.id!, 'kabel-crossover', 'heute')
    const log = await adjustmentLog()
    expect(log[0]).toMatchObject({ kind: 'tausch', field: 'uebung' })
    expect(log[0].reason).toBe('Butterfly → Kabel-Crossover')
  })
})
