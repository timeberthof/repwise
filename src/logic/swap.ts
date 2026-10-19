import type { EquipmentId, Exercise, MuscleId } from '../db/types'
import { isAvailable, isOhneGeraet } from '../data/exercises'

export type EquipmentFilter = 'alle' | 'mit' | 'ohne'

export interface SwapOptions {
  filter: EquipmentFilter
  /** Standard: nur Equipment, das im Onboarding als verfügbar angegeben wurde */
  onlyAvailable: boolean
  available: EquipmentId[]
  excluded?: string[]
  query?: string
  /** Muskel-Filter (Standard: Hauptmuskel der aktuellen Übung) */
  muscle?: MuscleId | null
  art?: 'kraft' | 'mobility'
}

/** Ähnlichkeit zur aktuellen Übung: gleiches Bewegungsmuster zuerst, dann Geräte und Nebenmuskeln. */
export function similarity(a: Exercise, b: Exercise): number {
  let s = 0
  if (a.muster === b.muster) s += 100
  if (a.equipment[0] === b.equipment[0]) s += 20
  s += b.sekundaer.filter((m) => a.sekundaer.includes(m)).length * 5
  s -= Math.abs(a.schwierigkeit - b.schwierigkeit) * 3
  return s
}

/** Alternativen für „Übung tauschen“ – sortiert nach Ähnlichkeit. */
export function swapAlternatives(current: Exercise | null, all: Exercise[], o: SwapOptions): Exercise[] {
  const q = o.query?.trim().toLowerCase() ?? ''
  const muscle = o.muscle === undefined ? current?.primaer : o.muscle
  const art = o.art ?? current?.art ?? 'kraft'
  const list = all.filter((e) => {
    if (current && e.id === current.id) return false
    if (e.art !== art) return false
    if (muscle && !q && e.primaer !== muscle) return false
    if (q && !e.name.toLowerCase().includes(q)) return false
    if (o.excluded?.includes(e.id)) return false
    if (o.filter === 'mit' && isOhneGeraet(e)) return false
    if (o.filter === 'ohne' && !isOhneGeraet(e)) return false
    if (o.onlyAvailable && !isAvailable(e, o.available)) return false
    return true
  })
  if (!current) return list.sort((a, b) => a.name.localeCompare(b.name))
  return list.sort((a, b) => similarity(current, b) - similarity(current, a) || a.name.localeCompare(b.name))
}
