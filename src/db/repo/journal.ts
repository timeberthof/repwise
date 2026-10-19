import { db } from '../db'
import type { Adjustment, AdjustmentKind, CardioEntry, ISODate, Session, SessionExercise, SetEntry } from '../types'
import { sessionE1rm } from '../../logic/e1rm'
import { getExercise } from '../../data/exercises'
import { formatDate, today } from '../../logic/dates'
import { fmt } from '../../logic/format'

export type HistoryItem =
  | { type: 'training'; date: ISODate; session: Session; minutes: number | null; exercises: number; sets: number; volume: number; names: string[] }
  | { type: 'cardio'; date: ISODate; entry: CardioEntry }

/** Chronologische Liste aller absolvierten Trainings und Cardio-Einheiten (neueste zuerst). */
export async function historyList(): Promise<HistoryItem[]> {
  // Wenige große Abfragen statt vieler kleiner (IndexedDB ist pro Abfrage langsam)
  const [sessions, allSes, allSets, cardio] = await Promise.all([db.sessions.where('status').equals('fertig').toArray(), db.sessionExercises.toArray(), db.sets.toArray(), db.cardio.toArray()])
  const sesBy = new Map<number, SessionExercise[]>()
  for (const se of allSes) sesBy.set(se.sessionId, [...(sesBy.get(se.sessionId) ?? []), se])
  const setsBy = new Map<number, SetEntry[]>()
  for (const x of allSets) if (x.done) setsBy.set(x.sessionId, [...(setsBy.get(x.sessionId) ?? []), x])
  const items: HistoryItem[] = []
  for (const s of sessions) {
    const ses = (sesBy.get(s.id!) ?? []).sort((a, b) => a.order - b.order)
    const sets = setsBy.get(s.id!) ?? []
    items.push({
      type: 'training',
      date: s.date,
      session: s,
      minutes: s.startedAt && s.endedAt ? Math.round((s.endedAt - s.startedAt) / 60000) : null,
      exercises: ses.length,
      sets: sets.length,
      volume: Math.round(sets.reduce((sum, x) => sum + (x.weight ?? 0) * x.reps, 0)),
      names: ses.map((x) => getExercise(x.exerciseId)?.name ?? x.exerciseId),
    })
  }
  for (const c of cardio) items.push({ type: 'cardio', date: c.date, entry: c })
  return items.sort((a, b) => b.date.localeCompare(a.date) || ((b.type === 'training' ? b.session.endedAt : b.entry.createdAt) ?? 0) - ((a.type === 'training' ? a.session.endedAt : a.entry.createdAt) ?? 0))
}

export interface SessionDetail {
  session: Session
  exercises: (SessionExercise & { setList: SetEntry[] })[]
  adjustments: Adjustment[]
  /** Importierte Einheit: Maximalkraft-Werte dieses Tages */
  imported: { exerciseId: string; e1rm: number }[]
}

export async function sessionDetail(sessionId: number): Promise<SessionDetail | null> {
  const session = await db.sessions.get(sessionId)
  if (!session) return null
  const ses = await db.sessionExercises.where('sessionId').equals(sessionId).sortBy('order')
  const exercises = []
  for (const se of ses) exercises.push({ ...se, setList: await db.sets.where('sessionExerciseId').equals(se.id!).sortBy('index') })
  const adjustments = (await db.adjustments.where('sessionId').equals(sessionId).toArray()).sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
  const imported = session.imported ? (await db.strength.where('date').equals(session.date).filter((p) => p.source === 'mci').toArray()).map((p) => ({ exerciseId: p.exerciseId, e1rm: p.e1rm })) : []
  return { session, exercises, adjustments, imported }
}

/** Maximalkraft-Werte einer Einheit nach Änderungen neu berechnen. */
export async function recalcSessionStrength(sessionId: number) {
  const s = await db.sessions.get(sessionId)
  if (!s || s.status !== 'fertig') return
  await db.strength.where('sessionId').equals(sessionId).delete()
  for (const se of await db.sessionExercises.where('sessionId').equals(sessionId).toArray()) {
    const v = sessionE1rm(await db.sets.where('sessionExerciseId').equals(se.id!).toArray())
    if (v) await db.strength.add({ exerciseId: se.exerciseId, date: s.date, e1rm: v, source: 'app', sessionId })
  }
}

const setText = (x: { reps: number; weight: number | null; rir: number | null }) => `${x.reps} × ${x.weight ? `${fmt(x.weight)} kg` : 'KG'}${x.rir !== null ? ` (RIR ${x.rir})` : ''}`

/** Satz nachträglich ändern (wird protokolliert). */
export async function editSet(setId: number, values: { reps: number; weight: number | null; rir: number | null }) {
  const old = await db.sets.get(setId)
  if (!old) return
  await db.sets.update(setId, { ...values, done: true })
  const s = await db.sessions.get(old.sessionId)
  await db.adjustments.add({
    date: today(),
    sessionId: old.sessionId,
    exerciseId: old.exerciseId,
    kind: 'manuell',
    field: 'reps',
    before: null,
    after: null,
    title: 'Satz nachträglich geändert',
    reason: `${getExercise(old.exerciseId)?.name ?? ''}, Training vom ${s ? formatDate(s.date) : '?'}: Satz ${old.index + 1} ${setText(old)} → ${setText(values)}`,
  })
  await recalcSessionStrength(old.sessionId)
}

export async function addSetAfter(sessionExerciseId: number) {
  const se = await db.sessionExercises.get(sessionExerciseId)
  const s = se ? await db.sessions.get(se.sessionId) : undefined
  if (!se || !s) return
  const sets = await db.sets.where('sessionExerciseId').equals(sessionExerciseId).sortBy('index')
  const last = sets.at(-1)
  await db.sets.add({ sessionId: s.id!, sessionExerciseId, exerciseId: se.exerciseId, date: s.date, index: sets.length, weight: last?.weight ?? se.weight, reps: last?.reps ?? se.repMin, rir: last?.rir ?? se.targetRir, done: true, doneAt: Date.now() })
  await recalcSessionStrength(s.id!)
}

export async function deleteSet(setId: number) {
  const old = await db.sets.get(setId)
  if (!old) return
  await db.sets.delete(setId)
  const rest = await db.sets.where('sessionExerciseId').equals(old.sessionExerciseId).sortBy('index')
  for (let i = 0; i < rest.length; i++) if (rest[i].index !== i) await db.sets.update(rest[i].id!, { index: i })
  await recalcSessionStrength(old.sessionId)
}

/** Einheit inklusive Sätzen, Maximalkraft-Werten und Protokolleinträgen löschen. */
export async function deleteSessionCompletely(sessionId: number) {
  await db.transaction('rw', [db.sessions, db.sessionExercises, db.sets, db.strength, db.adjustments], async () => {
    await db.sets.where('sessionId').equals(sessionId).delete()
    await db.sessionExercises.where('sessionId').equals(sessionId).delete()
    await db.strength.where('sessionId').equals(sessionId).delete()
    await db.adjustments.where('sessionId').equals(sessionId).delete()
    await db.sessions.delete(sessionId)
  })
}

export const ADJUSTMENT_KINDS: { id: AdjustmentKind; label: string; auto: boolean }[] = [
  { id: 'progression', label: 'Steigerung', auto: true },
  { id: 'reduktion', label: 'Reduktion', auto: true },
  { id: 'stagnation', label: 'Stagnation', auto: true },
  { id: 'wochentyp', label: 'Wochentyp', auto: true },
  { id: 'erholung', label: 'Erholung', auto: true },
  { id: 'muskelkater', label: 'Muskelkater', auto: true },
  { id: 'pause', label: 'Trainingspause', auto: true },
  { id: 'kalibrierung', label: 'Kalibrierung', auto: true },
  { id: 'tausch', label: 'Übungstausch', auto: false },
  { id: 'manuell', label: 'Manuell', auto: false },
  { id: 'plan', label: 'Plan', auto: true },
]

export async function adjustmentLog(): Promise<Adjustment[]> {
  return (await db.adjustments.toArray()).sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0))
}
