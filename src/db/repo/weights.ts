import { db, kvGet, kvSet } from '../db'
import type { EquipmentId, Exercise, WeightRow } from '../types'

// ---------------------------------------------------------------------------
// Gewichtssprünge je Gerätetyp (Einstellungen → Training)

export const STEP_EQUIPMENT: { id: EquipmentId; label: string; default: number }[] = [
  { id: 'langhantel', label: 'Langhantel', default: 2.5 },
  { id: 'sz_stange', label: 'SZ-Stange', default: 2.5 },
  { id: 'kurzhantel', label: 'Kurzhanteln (je Hand)', default: 2.5 },
  { id: 'maschine', label: 'Maschinen', default: 2.5 },
  { id: 'kabelzug', label: 'Kabelzug', default: 2.5 },
  { id: 'multipresse', label: 'Multipresse', default: 2.5 },
  { id: 'kettlebell', label: 'Kettlebell', default: 4 },
]

let stepOverrides: Partial<Record<EquipmentId, number>> = {}

export async function loadWeightSteps() {
  stepOverrides = await kvGet<Partial<Record<EquipmentId, number>>>('weights.steps', {})
  return stepOverrides
}

export async function saveWeightSteps(steps: Partial<Record<EquipmentId, number>>) {
  stepOverrides = steps
  await kvSet('weights.steps', steps)
}

/** Kleinster Gewichtsschritt einer Übung: eigener Wert für den Gerätetyp, sonst der Wert aus der Bibliothek. */
export function stepFor(ex: Exercise): number {
  if (!ex.gewichtsschritt) return 0
  const main = ex.equipment.find((e) => e !== 'bank') ?? ex.equipment[0]
  return stepOverrides[main] ?? ex.gewichtsschritt
}

/** Übung mit dem wirksamen Gewichtsschritt (für die Progressionslogik). */
export function withStep(ex: Exercise): Exercise {
  const s = stepFor(ex)
  return s === ex.gewichtsschritt ? ex : { ...ex, gewichtsschritt: s }
}

// ---------------------------------------------------------------------------
// Verfügbare Gewichte je Übung (S34)

export const DEFAULT_WEIGHT_ROWS: WeightRow[] = [{ from: 2.5, to: 300, step: 2.5 }]

export function expandRows(rows: WeightRow[]): number[] {
  const out = new Set<number>()
  for (const r of rows) {
    if (r.step <= 0 || r.to < r.from) continue
    for (let w = r.from; w <= r.to + 1e-9; w = Math.round((w + r.step) * 1000) / 1000) out.add(Math.round(w * 1000) / 1000)
  }
  return [...out].sort((a, b) => a - b)
}

export async function getWeightConfig(exerciseId?: string): Promise<{ rows: WeightRow[]; custom: number[] | null; unit: 'kg' | 'lb'; individual: boolean; own: boolean }> {
  const unit = await kvGet<'kg' | 'lb'>('units.weight', 'kg')
  if (exerciseId) {
    const s = await db.exerciseSettings.get(exerciseId)
    if (s?.customWeights?.length) return { rows: s.weightRows ?? DEFAULT_WEIGHT_ROWS, custom: s.customWeights, unit, individual: true, own: true }
    if (s?.weightRows?.length) return { rows: s.weightRows, custom: null, unit, individual: false, own: true }
  }
  return { rows: DEFAULT_WEIGHT_ROWS, custom: null, unit, individual: false, own: false }
}

/**
 * Verfügbare Gewichte für eine Übung – nur wenn für die Übung eigene Gewichte eingestellt sind.
 * Ohne eigene Einstellung gilt der Gewichtsschritt (null).
 */
export async function availableWeights(exerciseId: string): Promise<number[] | null> {
  const c = await getWeightConfig(exerciseId)
  if (!c.own) return null
  return c.custom ?? expandRows(c.rows)
}

export async function saveWeightConfig(exerciseId: string, rows: WeightRow[], custom: number[] | null) {
  const existing = (await db.exerciseSettings.get(exerciseId)) ?? { exerciseId }
  await db.exerciseSettings.put({ ...existing, weightRows: rows, customWeights: custom ?? undefined })
}

export async function resetWeightConfig(exerciseId: string) {
  const existing = await db.exerciseSettings.get(exerciseId)
  if (existing) await db.exerciseSettings.put({ ...existing, weightRows: undefined, customWeights: undefined })
}
