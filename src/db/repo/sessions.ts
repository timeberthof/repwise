/**
 * Manuelle Trainingserfassung: Training starten (leer oder aus einer eigenen Vorlage), Übungen und Sätze
 * selbst eintragen, ändern, löschen. Es gibt keine Vorgaben – nur zur Orientierung „Letztes Mal“.
 *
 * Datenmodell wie bisher (Session → SessionExercise → SetEntry), damit alte und neue Einträge in Verlauf und
 * Diagrammen gleich behandelt werden. Felder aus der früheren Planung (Wiederholungsbereich, Ziel-RIR …)
 * bleiben bei neuen Einträgen neutral.
 */
import { db, kvGet } from '../db'
import type { ISODate, Session, SessionExercise, SetEntry } from '../types'
import { getExercise } from '../../data/exercises'
import { sessionE1rm } from '../../logic/e1rm'
import { today } from '../../logic/dates'
import { getSettings } from '../settings'

export interface SetValues {
  weight: number | null
  reps: number
  /** optional */
  rir: number | null
}

/** Laufendes Training (es gibt höchstens eins). */
export async function runningSession(): Promise<Session | undefined> {
  const list = await db.sessions.where('status').equals('laeuft').toArray()
  return list.sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))[0]
}

function newSessionExercise(sessionId: number, exerciseId: string, order: number, restSec: number): SessionExercise {
  return { sessionId, exerciseId, order, sets: 0, repMin: 0, repMax: 0, targetRir: 0, restSec, weight: null, weightIsEstimate: false, adjustments: [] }
}

/** Training starten: leer oder mit den Übungen einer Vorlage (ohne Werte). */
export async function startWorkout(opts: { name: string; exerciseIds?: string[]; date?: ISODate }): Promise<number> {
  const running = await runningSession()
  if (running?.id) return running.id
  const { restSec } = await getSettings()
  return db.transaction('rw', [db.sessions, db.sessionExercises], async () => {
    const sessionId = (await db.sessions.add({
      date: opts.date ?? today(),
      name: opts.name.trim() || 'Training',
      kind: 'kraft',
      weekType: 'normal',
      status: 'laeuft',
      location: 'gym',
      startedAt: Date.now(),
    })) as number
    const ids = [...new Set(opts.exerciseIds ?? [])]
    await db.sessionExercises.bulkAdd(ids.map((id, i) => newSessionExercise(sessionId, id, i, restSec)))
    return sessionId
  })
}

export async function addExercise(sessionId: number, exerciseId: string): Promise<number> {
  const count = await db.sessionExercises.where('sessionId').equals(sessionId).count()
  const { restSec } = await getSettings()
  return (await db.sessionExercises.add(newSessionExercise(sessionId, exerciseId, count, restSec))) as number
}

export async function removeExercise(sessionExerciseId: number) {
  await db.transaction('rw', [db.sets, db.sessionExercises], async () => {
    await db.sets.where('sessionExerciseId').equals(sessionExerciseId).delete()
    await db.sessionExercises.delete(sessionExerciseId)
  })
}

/** Reihenfolge der Übungen im Training ändern. */
export async function moveExercise(sessionExerciseId: number, dir: -1 | 1) {
  const se = await db.sessionExercises.get(sessionExerciseId)
  if (!se) return
  const list = await db.sessionExercises.where('sessionId').equals(se.sessionId).sortBy('order')
  const i = list.findIndex((x) => x.id === sessionExerciseId)
  const j = i + dir
  if (j < 0 || j >= list.length) return
  ;[list[i], list[j]] = [list[j], list[i]]
  await db.transaction('rw', db.sessionExercises, async () => {
    for (const [k, x] of list.entries()) await db.sessionExercises.update(x.id!, { order: k })
  })
}

function clean(v: SetValues): SetValues {
  const weight = v.weight === null || Number.isNaN(v.weight) ? null : Math.max(0, Math.round(v.weight * 100) / 100)
  const reps = Math.max(0, Math.round(v.reps))
  const rir = v.rir === null || Number.isNaN(v.rir) ? null : Math.max(0, Math.round(v.rir))
  return { weight, reps, rir }
}

/** Satz eintragen. */
export async function addSet(sessionExerciseId: number, values: SetValues): Promise<number> {
  const se = await db.sessionExercises.get(sessionExerciseId)
  const s = se ? await db.sessions.get(se.sessionId) : undefined
  if (!se || !s) throw new Error('Übung nicht gefunden')
  const index = await db.sets.where('sessionExerciseId').equals(sessionExerciseId).count()
  const id = (await db.sets.add({ sessionId: s.id!, sessionExerciseId, exerciseId: se.exerciseId, date: s.date, index, ...clean(values), done: true, doneAt: Date.now() })) as number
  await db.sessionExercises.update(sessionExerciseId, { sets: index + 1 })
  return id
}

export async function updateSet(setId: number, values: SetValues) {
  await db.sets.update(setId, { ...clean(values), done: true })
}

/** Satz löschen und die übrigen Sätze neu durchnummerieren. */
export async function deleteSet(setId: number) {
  const set = await db.sets.get(setId)
  if (!set) return
  await db.transaction('rw', [db.sets, db.sessionExercises], async () => {
    await db.sets.delete(setId)
    const rest = await db.sets.where('sessionExerciseId').equals(set.sessionExerciseId).sortBy('index')
    for (const [i, x] of rest.entries()) if (x.index !== i) await db.sets.update(x.id!, { index: i })
    await db.sessionExercises.update(set.sessionExerciseId, { sets: rest.length })
  })
}

/** Maximalkraft (Ø je Einheit) für alle Übungen einer Einheit neu speichern. */
export async function saveStrength(sessionId: number) {
  const s = await db.sessions.get(sessionId)
  if (!s) return
  const list = await db.sessionExercises.where('sessionId').equals(sessionId).toArray()
  await db.strength.where('sessionId').equals(sessionId).delete()
  for (const se of list) {
    const sets = await db.sets.where('sessionExerciseId').equals(se.id!).toArray()
    const v = sessionE1rm(sets)
    if (v) await db.strength.add({ exerciseId: se.exerciseId, date: s.date, e1rm: v, source: 'app', sessionId })
  }
}

/**
 * Training beenden: Übungen ohne Satz entfernen, Maximalkraft speichern.
 * Ohne einen einzigen Satz wird das Training verworfen (Rückgabe false).
 */
export async function finishWorkout(sessionId: number): Promise<boolean> {
  const s = await db.sessions.get(sessionId)
  if (!s) return false
  // nicht erledigte Sätze (aus der früheren Planung) gehören nicht zum Training
  await db.sets.where('sessionId').equals(sessionId).filter((x) => !x.done).delete()
  const list = await db.sessionExercises.where('sessionId').equals(sessionId).toArray()
  let total = 0
  for (const se of list) {
    const n = await db.sets.where('sessionExerciseId').equals(se.id!).count()
    if (n === 0) await db.sessionExercises.delete(se.id!)
    else await db.sessionExercises.update(se.id!, { sets: n })
    total += n
  }
  if (total === 0) {
    await deleteSession(sessionId)
    return false
  }
  await db.sessions.update(sessionId, { status: 'fertig', endedAt: Date.now() })
  await saveStrength(sessionId)
  return true
}

/** Laufendes Training verwerfen (alle Einträge dieses Trainings werden gelöscht). */
export async function discardWorkout(sessionId: number) {
  await deleteSession(sessionId)
}

export async function deleteSession(sessionId: number) {
  await db.transaction('rw', [db.sessions, db.sessionExercises, db.sets, db.strength], async () => {
    await db.sets.where('sessionId').equals(sessionId).delete()
    await db.sessionExercises.where('sessionId').equals(sessionId).delete()
    await db.strength.where('sessionId').equals(sessionId).delete()
    await db.sessions.delete(sessionId)
  })
}

// ---------------------------------------------------------------------------
// „Letztes Mal“ – reine Information, keine Empfehlung

export interface LastPerformance {
  date: ISODate
  sets: SetValues[]
  /** app = eigenes Training, mci = aus den übernommenen Startwerten */
  source: 'app' | 'mci'
}

/** Was Du beim letzten Mal bei dieser Übung gemacht hast (vor dem angegebenen Training). */
export async function lastPerformance(exerciseId: string, beforeSessionId?: number): Promise<LastPerformance | null> {
  const before = beforeSessionId ? await db.sessions.get(beforeSessionId) : undefined
  const ses = await db.sessionExercises.where('exerciseId').equals(exerciseId).toArray()
  let best: { date: ISODate; started: number; sets: SetEntry[] } | null = null
  for (const se of ses) {
    if (se.sessionId === beforeSessionId) continue
    const s = await db.sessions.get(se.sessionId)
    if (!s || s.status !== 'fertig') continue
    if (before && (s.date > before.date || (s.date === before.date && (s.startedAt ?? 0) > (before.startedAt ?? 0)))) continue
    const sets = (await db.sets.where('sessionExerciseId').equals(se.id!).sortBy('index')).filter((x) => x.done)
    if (!sets.length) continue
    const started = s.startedAt ?? 0
    if (!best || s.date > best.date || (s.date === best.date && started > best.started)) best = { date: s.date, started, sets }
  }
  if (best) return { date: best.date, source: 'app', sets: best.sets.map((x) => ({ weight: x.weight, reps: x.reps, rir: x.rir })) }
  const ww = (await kvGet<Record<string, { weight: number; reps?: number; rir?: number; date: ISODate }>>('startwerte.arbeitsgewichte', {}))[exerciseId]
  if (ww) return { date: ww.date, source: 'mci', sets: [{ weight: ww.weight, reps: ww.reps ?? 0, rir: ww.rir ?? null }] }
  return null
}

// ---------------------------------------------------------------------------
// Abschluss

export interface FinishSummary {
  sessionId: number
  movedKg: number
  minutes: number
  sets: number
  strength: { exerciseId: string; before: number | null; after: number; record: boolean; history: { date: ISODate; e1rm: number }[] }[]
  muscles: string[]
}

export async function finishSummary(sessionId: number): Promise<FinishSummary | null> {
  const s = await db.sessions.get(sessionId)
  if (!s) return null
  const list = await db.sessionExercises.where('sessionId').equals(sessionId).sortBy('order')
  const sets = await db.sets.where('sessionId').equals(sessionId).filter((x) => x.done).toArray()
  const movedKg = sets.reduce((sum, x) => sum + (x.weight ?? 0) * x.reps, 0)
  const strength: FinishSummary['strength'] = []
  const muscles = new Set<string>()
  for (const se of list) {
    const ex = getExercise(se.exerciseId)
    if (ex) {
      muscles.add(ex.primaer)
      ex.sekundaer.forEach((m) => muscles.add(m))
    }
    const all = await db.strength.where('exerciseId').equals(se.exerciseId).sortBy('date')
    const cur = all.filter((p) => p.sessionId === sessionId).at(-1)
    if (!cur) continue
    const before = all.filter((p) => p.date < s.date || (p.date === s.date && p.sessionId !== sessionId))
    const prevBest = before.length ? Math.max(...before.map((p) => p.e1rm)) : 0
    strength.push({
      exerciseId: se.exerciseId,
      before: before.at(-1)?.e1rm ?? null,
      after: cur.e1rm,
      record: before.length > 0 && cur.e1rm > prevBest,
      history: [...before.slice(-6), cur].map((p) => ({ date: p.date, e1rm: p.e1rm })),
    })
  }
  return {
    sessionId,
    movedKg: Math.round(movedKg),
    minutes: s.startedAt && s.endedAt ? Math.round((s.endedAt - s.startedAt) / 60000) : 0,
    sets: sets.length,
    strength,
    muscles: [...muscles],
  }
}
