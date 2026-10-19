import { db, kvGet } from '../db'
import type { Exercise, ISODate } from '../types'
import type { ExerciseHistory } from '../../logic/progression'
import { sessionE1rm } from '../../logic/e1rm'
import { diffDays } from '../../logic/dates'
import { allExercises, getExercise } from '../../data/exercises'
import type { WorkingWeight } from './startwerte'

/** Verlauf einer Übung für die Progression: eigene Einheiten (älteste zuerst), sonst importiertes Arbeitsgewicht. */
export async function exerciseHistory(exerciseId: string, beforeDate: ISODate, limit = 8): Promise<{ history: ExerciseHistory; lastDate: ISODate | null }> {
  const items = await db.sessionExercises.where('exerciseId').equals(exerciseId).toArray()
  const rows: ExerciseHistory['sessions'] = []
  for (const se of items) {
    const s = await db.sessions.get(se.sessionId)
    if (!s || s.status !== 'fertig' || s.date >= beforeDate) continue
    const sets = (await db.sets.where('sessionExerciseId').equals(se.id!).sortBy('index')).map((x) => ({ weight: x.weight, reps: x.reps, rir: x.rir, done: x.done }))
    if (!sets.some((x) => x.done)) continue
    const weights = sets.filter((x) => x.done && x.weight).map((x) => x.weight!)
    rows.push({
      date: s.date,
      weight: weights.length ? Math.max(...weights) : se.weight,
      sets,
      repMin: se.repMin,
      repMax: se.repMax,
      targetRir: se.targetRir,
      e1rm: sessionE1rm(sets),
      stagnationReset: se.adjustments.some((a) => a.kind === 'stagnation'),
      weekType: s.kind === 'kraft' ? s.weekType : undefined,
    })
  }
  rows.sort((a, b) => a.date.localeCompare(b.date))
  if (rows.length) return { history: { sessions: rows.slice(-limit) }, lastDate: rows[rows.length - 1].date }

  // Kein eigenes Training: letztes bekanntes Arbeitsgewicht aus den Startwerten
  const ww = (await kvGet<Record<string, WorkingWeight>>('startwerte.arbeitsgewichte', {}))[exerciseId]
  const strength = await db.strength.where('exerciseId').equals(exerciseId).sortBy('date')
  const lastStrength = strength.filter((p) => p.date < beforeDate).at(-1)
  if (ww && ww.date < beforeDate) {
    const sets = ww.reps ? [{ weight: ww.weight, reps: ww.reps, rir: ww.rir ?? 2, done: true }] : []
    return {
      history: { sessions: [{ date: ww.date, weight: ww.weight, sets, repMin: ww.range?.[0] ?? 8, repMax: ww.range?.[1] ?? 12, targetRir: ww.rir ?? 2, e1rm: lastStrength?.e1rm ?? null }] },
      lastDate: lastStrength && lastStrength.date > ww.date ? lastStrength.date : ww.date,
    }
  }
  return { history: { sessions: [] }, lastDate: lastStrength?.date ?? null }
}

/** Letzter Tag vor `beforeDate`, an dem eine der Übungen trainiert wurde (erledigte Sätze). */
export async function lastTrainedDate(exerciseIds: string[], beforeDate: ISODate): Promise<ISODate | null> {
  let last: ISODate | null = null
  for (const id of exerciseIds) {
    const sets = await db.sets.where('exerciseId').equals(id).filter((x) => x.done && x.date < beforeDate).toArray()
    for (const x of sets) if (!last || x.date > last) last = x.date
  }
  return last
}

/** Letzte bekannte Maximalkraft einer Übung (eigene oder importierte Werte). */
export async function lastE1rm(exerciseId: string): Promise<{ value: number; date: ISODate } | null> {
  const list = await db.strength.where('exerciseId').equals(exerciseId).sortBy('date')
  const last = list.at(-1)
  return last ? { value: last.e1rm, date: last.date } : null
}

/** Verwandte Übung mit Maximalkraft: gleicher Hauptmuskel, gleiches Bewegungsmuster bevorzugt. */
export async function relatedE1rm(ex: Exercise): Promise<{ exercise: Exercise; e1rm: number } | null> {
  const candidates = allExercises().filter((e) => e.id !== ex.id && e.primaer === ex.primaer && e.art === ex.art)
  candidates.sort((a, b) => Number(b.muster === ex.muster) - Number(a.muster === ex.muster))
  for (const c of candidates) {
    const v = await lastE1rm(c.id)
    if (v) return { exercise: c, e1rm: v.value }
  }
  return null
}

export function daysBetween(last: ISODate | null, date: ISODate): number | null {
  return last ? diffDays(last, date) : null
}

export function isBodyweight(id: string): boolean {
  const e = getExercise(id)
  return !e || e.gewichtsschritt === 0 || e.gewichtsart === 'koerpergewicht'
}
