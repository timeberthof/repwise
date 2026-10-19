import { db, kvGet } from '../db'
import type { AdjustmentNote, ISODate, StrengthPoint } from '../types'
import type { WorkingWeight } from './startwerte'
import { sessionE1rm } from '../../logic/e1rm'
import { getExercise } from '../../data/exercises'
import { MUSCLES, type StatGroup } from '../../data/muskeln'
import { addDays, diffDays, startOfWeek, today } from '../../logic/dates'

export interface ExerciseStat {
  exerciseId: string
  name: string
  group: StatGroup
  points: { date: ISODate; value: number }[]
  delta: number
  best: number
  lastDate: ISODate
}

/** Maximalkraft je Übung: ein Wert pro Tag (eigene Werte haben Vorrang vor importierten). */
export function dedupe(points: StrengthPoint[]): { date: ISODate; value: number }[] {
  const byDate = new Map<ISODate, StrengthPoint>()
  for (const p of points.sort((a, b) => a.date.localeCompare(b.date))) {
    const cur = byDate.get(p.date)
    if (!cur || (cur.source === 'mci' && p.source === 'app') || (cur.source === p.source && (p.id ?? 0) > (cur.id ?? 0))) byDate.set(p.date, p)
  }
  return [...byDate.values()].map((p) => ({ date: p.date, value: Math.round(p.e1rm * 100) / 100 }))
}

/** Statistik-Karten „letzte N Trainings“ je Übung, gruppiert wie im Original. */
export async function exerciseStats(limit = 7): Promise<ExerciseStat[]> {
  const all = await db.strength.toArray()
  const byEx = new Map<string, StrengthPoint[]>()
  for (const p of all) byEx.set(p.exerciseId, [...(byEx.get(p.exerciseId) ?? []), p])
  const out: ExerciseStat[] = []
  for (const [id, list] of byEx) {
    const ex = getExercise(id)
    if (!ex || ex.art !== 'kraft') continue
    const pts = dedupe(list)
    const last = pts.slice(-limit)
    out.push({
      exerciseId: id,
      name: ex.name,
      group: MUSCLES[ex.primaer].stat,
      points: last,
      delta: last.length > 1 ? last[last.length - 1].value - last[0].value : 0,
      best: Math.max(...pts.map((p) => p.value)),
      lastDate: pts[pts.length - 1].date,
    })
  }
  // Zuletzt trainierte Übungen zuerst
  return out.sort((a, b) => b.lastDate.localeCompare(a.lastDate) || a.name.localeCompare(b.name))
}

/** Kennzahlen einer Übung in einer Einheit (eigene Einheit oder importierter Wert). */
export interface SessionMetric {
  date: ISODate
  sessionId?: number
  sessionName?: string
  source: 'app' | 'mci'
  /** Ø Maximalkraft der Arbeitssätze */
  e1rm: number | null
  /** Ø Gewicht der erledigten Sätze */
  avgWeight: number | null
  maxWeight: number | null
  /** Ø Wiederholungen pro Satz */
  avgReps: number | null
  maxReps: number | null
  maxRepsWeight: number | null
  /** Summe Gewicht × Wiederholungen */
  volume: number | null
  sets: { weight: number | null; reps: number; rir: number | null }[]
  notes: AdjustmentNote[]
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const r2 = (n: number | null) => (n === null ? null : Math.round(n * 100) / 100)

/** Alle Einheiten einer Übung (älteste zuerst) – eigene Trainings plus importierte Maximalkraft-Werte. */
export async function exerciseDetail(exerciseId: string): Promise<SessionMetric[]> {
  const out: SessionMetric[] = []
  const appDates = new Set<ISODate>()
  for (const se of await db.sessionExercises.where('exerciseId').equals(exerciseId).toArray()) {
    const s = await db.sessions.get(se.sessionId)
    if (!s || s.status !== 'fertig') continue
    const sets = (await db.sets.where('sessionExerciseId').equals(se.id!).sortBy('index')).filter((x) => x.done)
    if (!sets.length) continue
    const weights = sets.filter((x) => x.weight).map((x) => x.weight!)
    const reps = sets.map((x) => x.reps)
    const maxReps = Math.max(...reps)
    out.push({
      date: s.date,
      sessionId: s.id,
      sessionName: s.name,
      source: 'app',
      e1rm: sessionE1rm(sets),
      avgWeight: r2(avg(weights)),
      maxWeight: weights.length ? Math.max(...weights) : null,
      avgReps: r2(avg(reps)),
      maxReps,
      maxRepsWeight: sets.find((x) => x.reps === maxReps)?.weight ?? null,
      volume: Math.round(sets.reduce((sum, x) => sum + (x.weight ?? 0) * x.reps, 0)),
      sets: sets.map((x) => ({ weight: x.weight, reps: x.reps, rir: x.rir })),
      notes: se.adjustments,
    })
    appDates.add(s.date)
  }
  const ww = (await kvGet<Record<string, WorkingWeight>>('startwerte.arbeitsgewichte', {}))[exerciseId]
  for (const p of dedupe((await db.strength.where('exerciseId').equals(exerciseId).toArray()).filter((x) => x.source === 'mci'))) {
    if (appDates.has(p.date)) continue
    const w = ww && ww.date === p.date ? ww : null
    out.push({
      date: p.date,
      source: 'mci',
      e1rm: p.value,
      avgWeight: w?.weight ?? null,
      maxWeight: w?.weight ?? null,
      avgReps: w?.reps ?? null,
      maxReps: w?.reps ?? null,
      maxRepsWeight: w?.reps ? w.weight : null,
      volume: null,
      sets: [],
      notes: [],
    })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

export async function exerciseFullHistory(exerciseId: string) {
  const pts = dedupe(await db.strength.where('exerciseId').equals(exerciseId).toArray())
  const sessionEx = await db.sessionExercises.where('exerciseId').equals(exerciseId).toArray()
  const sessions: { date: ISODate; sessionId: number; sets: { weight: number | null; reps: number; rir: number | null }[]; notes: string[] }[] = []
  for (const se of sessionEx) {
    const s = await db.sessions.get(se.sessionId)
    if (!s || s.status !== 'fertig') continue
    const sets = (await db.sets.where('sessionExerciseId').equals(se.id!).sortBy('index')).filter((x) => x.done)
    if (!sets.length) continue
    sessions.push({ date: s.date, sessionId: s.id!, sets: sets.map((x) => ({ weight: x.weight, reps: x.reps, rir: x.rir })), notes: se.adjustments.map((a) => a.reason) })
  }
  sessions.sort((a, b) => b.date.localeCompare(a.date))
  const adjustments = (await db.adjustments.where('exerciseId').equals(exerciseId).toArray()).sort((a, b) => b.date.localeCompare(a.date))
  return { points: pts, sessions, adjustments }
}

/** Trainings je Woche (letzte n Wochen) und Ø Dauer. */
export async function trainingSummary(weeks = 8) {
  const t = today()
  const from = addDays(startOfWeek(t), -7 * (weeks - 1))
  const done = await db.sessions.where('date').between(from, t, true, true).filter((s) => s.status === 'fertig' && s.kind === 'kraft').toArray()
  const perWeek = Array.from({ length: weeks }, (_, i) => {
    const ws = addDays(from, i * 7)
    return { date: ws, value: done.filter((s) => s.date >= ws && s.date < addDays(ws, 7)).length }
  })
  const withTime = done.filter((s) => s.startedAt && s.endedAt)
  const avgMin = withTime.length ? Math.round(withTime.reduce((sum, s) => sum + (s.endedAt! - s.startedAt!) / 60000, 0) / withTime.length) : null
  const sets = await db.sets.where('date').between(addDays(t, -27), t, true, true).filter((x) => x.done).toArray()
  const volume = Math.round(sets.reduce((sum, x) => sum + (x.weight ?? 0) * x.reps, 0))
  return { perWeek, avgMin, total4w: done.filter((s) => diffDays(s.date, t) < 28).length, sets4w: sets.length, volume4w: volume }
}

export async function stepsLastDays(days = 7) {
  const t = today()
  const list = Array.from({ length: days }, (_, i) => addDays(t, i - days))
  const entries = await db.steps.where('date').between(list[0], list[list.length - 1], true, true).toArray()
  return list.map((d) => ({ date: d, value: entries.find((e) => e.date === d)?.steps ?? 0 }))
}

export async function cardioWeeks(weeks = 6) {
  const t = today()
  const from = addDays(startOfWeek(t), -7 * (weeks - 1))
  const list = await db.cardio.where('date').between(from, t, true, true).toArray()
  return Array.from({ length: weeks }, (_, i) => {
    const ws = addDays(from, i * 7)
    const inWeek = list.filter((c) => c.date >= ws && c.date < addDays(ws, 7))
    return { date: ws, value: inWeek.reduce((s, c) => s + c.durationMin, 0), count: inWeek.length }
  })
}
