import { beforeEach, describe, expect, it } from 'vitest'
import { db, kvGet, kvSet } from '../db'
import { setNow } from '../../logic/dates'
import { addSet, deleteSet, discardWorkout, finishWorkout, lastPerformance, startWorkout, updateSet } from './sessions'
import { deleteExercise, hiddenExerciseIds, myExercises, saveExercise } from './exercises'
import { listTemplates, reorderTemplates, saveTemplate } from './templates'
import { checkinStatus, saveCheckin, attachCheckinPhoto } from './checkin'
import { migrateToErfassung } from './migrate'
import { getExercise } from '../../data/exercises'
import { sessionE1rm } from '../../logic/e1rm'

const photo = { data: new Uint8Array([1, 2, 3]).buffer, thumbData: new Uint8Array([1]).buffer, mime: 'image/jpeg' }

async function fresh(day = new Date(2026, 10, 9, 10, 0)) {
  setNow(day)
  await db.delete()
  await db.open()
}

/** Ein abgeschlossenes Training mit den angegebenen Sätzen. */
async function workout(date: string, exerciseId: string, sets: { weight: number | null; reps: number; rir: number | null }[]) {
  const id = await startWorkout({ name: 'Push', exerciseIds: [exerciseId], date })
  const se = (await db.sessionExercises.where('sessionId').equals(id).first())!
  for (const s of sets) await addSet(se.id!, s)
  await finishWorkout(id)
  return id
}

describe('Training selbst erfassen', () => {
  beforeEach(() => fresh())

  it('startet ohne Vorgaben: keine Sätze, kein Gewicht, keine Ziel-Wiederholungen', async () => {
    const id = await startWorkout({ name: 'Push', exerciseIds: ['bankdruecken', 'brustpresse'] })
    const ses = await db.sessionExercises.where('sessionId').equals(id).sortBy('order')
    expect(ses.map((x) => x.exerciseId)).toEqual(['bankdruecken', 'brustpresse'])
    for (const se of ses) {
      expect(se.weight).toBeNull()
      expect(se.sets).toBe(0)
      expect(se.repMax).toBe(0)
      expect(se.adjustments).toEqual([])
    }
    expect(await db.sets.count()).toBe(0)
    // ein zweiter Start setzt das laufende Training fort
    expect(await startWorkout({ name: 'Pull' })).toBe(id)
  })

  it('Sätze hinzufügen, ändern, löschen – RIR ist optional', async () => {
    const id = await startWorkout({ name: 'Push', exerciseIds: ['bankdruecken'] })
    const se = (await db.sessionExercises.where('sessionId').equals(id).first())!
    const a = await addSet(se.id!, { weight: 80, reps: 8, rir: null })
    const b = await addSet(se.id!, { weight: 80, reps: 7, rir: 1 })
    await addSet(se.id!, { weight: 77.5, reps: 8, rir: 2 })
    await updateSet(b, { weight: 82.5, reps: 6, rir: null })
    await deleteSet(a)
    const sets = await db.sets.where('sessionExerciseId').equals(se.id!).sortBy('index')
    expect(sets.map((x) => [x.index, x.weight, x.reps, x.rir])).toEqual([
      [0, 82.5, 6, null],
      [1, 77.5, 8, 2],
    ])
    expect((await db.sessionExercises.get(se.id!))!.sets).toBe(2)
  })

  it('Beenden entfernt leere Übungen und nicht erledigte Sätze, speichert die Maximalkraft', async () => {
    const id = await startWorkout({ name: 'Push', exerciseIds: ['bankdruecken', 'brustpresse'] })
    const [bank] = await db.sessionExercises.where('sessionId').equals(id).sortBy('order')
    await addSet(bank.id!, { weight: 50, reps: 5, rir: 2 })
    // nicht erledigter Satz aus der früheren Planung
    await db.sets.add({ sessionId: id, sessionExerciseId: bank.id!, exerciseId: 'bankdruecken', date: '2026-11-09', index: 5, weight: 60, reps: 10, rir: 0, done: false })
    expect(await finishWorkout(id)).toBe(true)
    expect((await db.sessions.get(id))!.status).toBe('fertig')
    expect((await db.sessionExercises.where('sessionId').equals(id).toArray()).map((x) => x.exerciseId)).toEqual(['bankdruecken'])
    expect(await db.sets.where('sessionId').equals(id).count()).toBe(1)
    const p = await db.strength.where('sessionId').equals(id).first()
    expect(p?.e1rm).toBeCloseTo(61.67, 2)
  })

  it('ein Training ohne Satz wird beim Beenden verworfen', async () => {
    const id = await startWorkout({ name: 'Leer', exerciseIds: ['bankdruecken'] })
    expect(await finishWorkout(id)).toBe(false)
    expect(await db.sessions.get(id)).toBeUndefined()
  })

  it('Verwerfen löscht nur dieses Training', async () => {
    const old = await workout('2026-11-02', 'bankdruecken', [{ weight: 80, reps: 8, rir: 2 }])
    const id = await startWorkout({ name: 'Push', exerciseIds: ['bankdruecken'] })
    const se = (await db.sessionExercises.where('sessionId').equals(id).first())!
    await addSet(se.id!, { weight: 90, reps: 3, rir: 0 })
    await discardWorkout(id)
    expect(await db.sessions.get(id)).toBeUndefined()
    expect(await db.sets.where('sessionId').equals(old).count()).toBe(1)
  })

  it('„Letztes Mal“ zeigt das letzte abgeschlossene Training dieser Übung', async () => {
    await workout('2026-10-26', 'bankdruecken', [{ weight: 75, reps: 8, rir: 2 }])
    await workout('2026-11-02', 'bankdruecken', [
      { weight: 80, reps: 8, rir: null },
      { weight: 80, reps: 7, rir: 1 },
    ])
    const id = await startWorkout({ name: 'Push', exerciseIds: ['bankdruecken'] })
    const last = await lastPerformance('bankdruecken', id)
    expect(last?.date).toBe('2026-11-02')
    expect(last?.source).toBe('app')
    expect(last?.sets).toEqual([
      { weight: 80, reps: 8, rir: null },
      { weight: 80, reps: 7, rir: 1 },
    ])
    expect(await lastPerformance('brustpresse', id)).toBeNull()
  })

  it('„Letztes Mal“ greift ohne eigenes Training auf die übernommenen Startwerte zurück', async () => {
    await kvSet('startwerte.arbeitsgewichte', { brustpresse: { weight: 70, reps: 10, date: '2026-10-01' } })
    expect(await lastPerformance('brustpresse')).toEqual({ date: '2026-10-01', source: 'mci', sets: [{ weight: 70, reps: 10, rir: null }] })
  })

  it('Maximalkraft ohne RIR rechnet mit RIR 0', () => {
    expect(sessionE1rm([{ weight: 60, reps: 10, rir: null, done: true }])).toBeCloseTo(80, 5)
  })
})

describe('Meine Übungen', () => {
  beforeEach(() => fresh())

  it('enthält trainierte, eigene und Vorlagen-Übungen', async () => {
    await workout('2026-11-02', 'bankdruecken', [{ weight: 80, reps: 8, rir: 2 }])
    await saveTemplate({ name: 'Pull', exerciseIds: ['brustpresse'] })
    const own = await saveExercise({ name: 'Landmine Press', primaer: 'vordere_schulter', hinweise: 'Stand' })
    const ids = (await myExercises()).map((e) => e.id)
    expect(ids).toEqual(expect.arrayContaining(['bankdruecken', 'brustpresse', own.id]))
    expect(ids).toHaveLength(3)
    expect(getExercise(own.id)?.primaer).toBe('vordere_schulter')
  })

  it('bearbeiten behält die ID (Verlauf bleibt verknüpft)', async () => {
    await workout('2026-11-02', 'bankdruecken', [{ weight: 80, reps: 8, rir: 2 }])
    await saveExercise({ id: 'bankdruecken', name: 'Bankdrücken (Gym)', primaer: 'brust' })
    expect(getExercise('bankdruecken')?.name).toBe('Bankdrücken (Gym)')
    expect(await db.sets.where('exerciseId').equals('bankdruecken').count()).toBe(1)
  })

  it('löschen: mit Verlauf nur ausblenden, ohne Verlauf entfernen', async () => {
    await workout('2026-11-02', 'bankdruecken', [{ weight: 80, reps: 8, rir: 2 }])
    const own = await saveExercise({ name: 'Eigene', primaer: 'sonstige' })
    await saveTemplate({ name: 'Push', exerciseIds: ['bankdruecken', own.id] })
    expect(await deleteExercise('bankdruecken')).toBe('ausgeblendet')
    expect(await deleteExercise(own.id)).toBe('geloescht')
    expect((await hiddenExerciseIds()).has('bankdruecken')).toBe(true)
    expect(await db.sets.where('exerciseId').equals('bankdruecken').count()).toBe(1)
    expect(await db.customExercises.get(own.id)).toBeUndefined()
    expect((await listTemplates())[0].exerciseIds).toEqual([])
    expect(await myExercises()).toEqual([])
  })
})

describe('Vorlagen', () => {
  beforeEach(() => fresh())

  it('anlegen, umbenennen, sortieren', async () => {
    const a = await saveTemplate({ name: 'Push', exerciseIds: ['bankdruecken', 'bankdruecken', 'brustpresse'] })
    const b = await saveTemplate({ name: 'Pull', exerciseIds: [] })
    await saveTemplate({ id: a, name: 'Push A', exerciseIds: ['brustpresse'] })
    await reorderTemplates([b, a])
    const list = await listTemplates()
    expect(list.map((t) => t.name)).toEqual(['Pull', 'Push A'])
    expect(list[1].exerciseIds).toEqual(['brustpresse'])
    await expect(saveTemplate({ name: '  ', exerciseIds: [] })).rejects.toThrow()
  })
})

describe('Wöchentlicher Check-in', () => {
  beforeEach(() => fresh())

  it('ist fällig ohne Check-in und wieder nach 7 Tagen', async () => {
    expect((await checkinStatus('2026-11-09')).due).toBe(true)
    const id = await saveCheckin(82.4, '2026-11-09')
    await attachCheckinPhoto(id, photo, '2026-11-09')
    expect(await checkinStatus('2026-11-15')).toMatchObject({ due: false, photoPending: null, nextInDays: 1 })
    expect((await checkinStatus('2026-11-16')).due).toBe(true)
  })

  it('speichert das Gewicht in den bisherigen Gewichtsverlauf', async () => {
    await db.body.add({ date: '2026-10-01', kind: 'weight', value: 84, source: 'mci' })
    await saveCheckin(82.44, '2026-11-09')
    await saveCheckin(82.2, '2026-11-09') // zweiter Check-in am selben Tag ersetzt den ersten
    const w = await db.body.where('kind').equals('weight').sortBy('date')
    expect(w.map((x) => [x.date, x.value])).toEqual([
      ['2026-10-01', 84],
      ['2026-11-09', 82.2],
    ])
    expect(await db.checkins.count()).toBe(1)
    await expect(saveCheckin(0)).rejects.toThrow()
  })

  it('„Später“: Foto bleibt offen, bis eines vorhanden ist', async () => {
    const id = await saveCheckin(82, '2026-11-09')
    expect((await checkinStatus('2026-11-10')).photoPending?.id).toBe(id)
    // auch ein Foto aus „Körper“ ab diesem Tag zählt
    await db.photos.add({ date: '2026-11-11', pose: 'vorne', ...photo })
    expect((await checkinStatus('2026-11-11')).photoPending).toBeNull()
  })

  it('Foto zum Check-in wird mit Datum und Gewicht verknüpft', async () => {
    const id = await saveCheckin(81.5, '2026-11-09')
    const pid = await attachCheckinPhoto(id, photo, '2026-11-10')
    const p = await db.photos.get(pid)
    expect(p).toMatchObject({ date: '2026-11-10', weight: 81.5, checkinId: id })
    expect((await db.checkins.get(id))?.photoId).toBe(pid)
  })
})

describe('Umstellung bestehender Daten', () => {
  beforeEach(() => fresh())

  async function oldPlan() {
    const planId = (await db.plans.add({ createdAt: 1, startDate: '2026-10-19', cycleWeeks: 6, active: 1, split: 'push_pull', weekOverrides: {}, status: 'aktiv', source: 'onboarding' })) as number
    const days = [
      { name: 'Push', weekday: 0, ex: ['bankdruecken', 'brustpresse'] },
      { name: 'Pull', weekday: 2, ex: ['latziehen'] },
      { name: 'Push', weekday: 4, ex: ['kurzhantel-schraegbankdruecken'] },
      { name: 'Mobility', weekday: 5, ex: ['x'], kind: 'mobility' as const },
    ]
    for (const [i, d] of days.entries()) {
      const dayId = (await db.planDays.add({ planId, name: d.name, kind: d.kind ?? 'kraft', weekday: d.weekday, order: i, location: 'gym' })) as number
      for (const [j, e] of d.ex.entries()) await db.planExercises.add({ planDayId: dayId, exerciseId: e, order: j, sets: 3, repMin: 8, repMax: 12, targetRir: 2, restSec: 120 })
    }
    return planId
  }

  it('übernimmt die Trainingstage des Plans als Vorlagen und löscht nichts', async () => {
    await oldPlan()
    await workout('2026-11-02', 'bankdruecken', [{ weight: 80, reps: 8, rir: 2 }])
    await db.adjustments.add({ date: '2026-11-02', kind: 'progression', field: 'weight', before: 77.5, after: 80, title: '+2,5 kg', reason: 'x' })
    await db.steps.put({ date: '2026-11-01', steps: 9000 })
    const before = { plans: await db.plans.count(), days: await db.planDays.count(), pe: await db.planExercises.count(), sets: await db.sets.count(), adj: await db.adjustments.count(), steps: await db.steps.count() }

    expect(await migrateToErfassung()).toBe(2)
    const t = await listTemplates()
    expect(t.map((x) => [x.name, x.exerciseIds])).toEqual([
      ['Push', ['bankdruecken', 'brustpresse']],
      ['Pull', ['latziehen']],
    ])
    expect({ plans: await db.plans.count(), days: await db.planDays.count(), pe: await db.planExercises.count(), sets: await db.sets.count(), adj: await db.adjustments.count(), steps: await db.steps.count() }).toEqual(before)
  })

  it('läuft nur einmal (auch nicht nach Löschen der Vorlagen erneut)', async () => {
    await oldPlan()
    await migrateToErfassung()
    await db.templates.clear()
    expect(await migrateToErfassung()).toBe(0)
    expect(await db.templates.count()).toBe(0)
    expect(await kvGet('migration.erfassung', null)).toBe(1)
  })

  it('legt keine Vorlagen an, wenn schon welche existieren oder kein Plan da ist', async () => {
    expect(await migrateToErfassung()).toBe(0)
    await fresh()
    await oldPlan()
    await saveTemplate({ name: 'Eigene', exerciseIds: [] })
    expect(await migrateToErfassung()).toBe(0)
    expect((await listTemplates()).map((x) => x.name)).toEqual(['Eigene'])
  })
})
