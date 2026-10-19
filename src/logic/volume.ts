/**
 * Wochenvolumen je Muskelgruppe: Zielmuskel = 1 Satz, mitarbeitender Muskel = 0,5 Satz.
 * Ziel 10–20 Sätze pro Woche und mindestens 2 Einheiten pro Woche (Werte in progression.ts → planning).
 */
import type { Exercise, MuscleId } from '../db/types'
import { getExercise } from '../data/exercises'
import { PROGRESSION_CONFIG, type ProgressionConfig } from './progression'

export type VolumeGroup =
  | 'brust'
  | 'ruecken'
  | 'vordere_schulter'
  | 'seitliche_schulter'
  | 'hintere_schulter'
  | 'bizeps'
  | 'trizeps'
  | 'quadrizeps'
  | 'beinbeuger'
  | 'gesaess'
  | 'waden'
  | 'bauch'

export const VOLUME_GROUPS: { id: VolumeGroup; label: string }[] = [
  { id: 'brust', label: 'Brust' },
  { id: 'ruecken', label: 'Oberer Rücken / Lat' },
  { id: 'vordere_schulter', label: 'Vordere Schulter' },
  { id: 'seitliche_schulter', label: 'Seitliche Schulter' },
  { id: 'hintere_schulter', label: 'Hintere Schulter' },
  { id: 'bizeps', label: 'Bizeps' },
  { id: 'trizeps', label: 'Trizeps' },
  { id: 'quadrizeps', label: 'Quadrizeps' },
  { id: 'beinbeuger', label: 'Beinbeuger' },
  { id: 'gesaess', label: 'Gesäß' },
  { id: 'waden', label: 'Waden' },
  { id: 'bauch', label: 'Bauch' },
]

export const groupLabel = (g: VolumeGroup) => VOLUME_GROUPS.find((x) => x.id === g)?.label ?? g

/** Muskel → Gruppe für die Zählung. Nicht gezählt: unterer Rücken, Unterarme, Adduktoren, Mobility. */
const MUSCLE_GROUP: Partial<Record<MuscleId, VolumeGroup>> = {
  brust: 'brust',
  ruecken: 'ruecken',
  nacken: 'ruecken',
  vordere_schulter: 'vordere_schulter',
  mittlere_schulter: 'seitliche_schulter',
  hintere_schulter: 'hintere_schulter',
  bizeps: 'bizeps',
  trizeps: 'trizeps',
  quadrizeps: 'quadrizeps',
  beinbeuger: 'beinbeuger',
  gesaess: 'gesaess',
  abduktoren: 'gesaess',
  waden: 'waden',
  bauch: 'bauch',
}

export const groupOfMuscle = (m: MuscleId): VolumeGroup | null => MUSCLE_GROUP[m] ?? null

/** Oberkörper drückend / ziehend – für das Verhältnis Drücken : Ziehen (Seitheben ist weder noch). */
export const PUSH_GROUPS: VolumeGroup[] = ['brust', 'vordere_schulter', 'trizeps']
export const PULL_GROUPS: VolumeGroup[] = ['ruecken', 'hintere_schulter', 'bizeps']

/**
 * Hauptgruppe einer Übung. Drücken über Kopf zählt für die vordere Schulter
 * (in der Bibliothek steht wie im Original teils „Mittlere Schulter“).
 */
export function primaryGroup(ex: Exercise): VolumeGroup | null {
  if (ex.art !== 'kraft') return null
  if (ex.muster === 'vertikal_druecken' && (ex.primaer === 'mittlere_schulter' || ex.primaer === 'vordere_schulter')) return 'vordere_schulter'
  return MUSCLE_GROUP[ex.primaer] ?? null
}

/** Anteil je Gruppe pro Satz: Zielmuskel 1, jeder mitarbeitende Muskel 0,5 (je Gruppe höchstens 1). */
export function contributions(ex: Exercise, cfg: ProgressionConfig = PROGRESSION_CONFIG): Map<VolumeGroup, number> {
  const out = new Map<VolumeGroup, number>()
  if (ex.art !== 'kraft') return out
  const main = primaryGroup(ex)
  if (main) out.set(main, 1)
  const secondary = [...ex.sekundaer]
  if (ex.muster === 'vertikal_druecken' && ex.primaer === 'mittlere_schulter') secondary.push('mittlere_schulter')
  for (const m of secondary) {
    const g = MUSCLE_GROUP[m]
    if (g && !out.has(g)) out.set(g, cfg.planning.secondaryFactor)
  }
  return out
}

export interface VolumeItem {
  exerciseId: string
  sets: number
}

export interface GroupVolume {
  /** anteilig gezählte Sätze */
  sets: number
  /** Sätze als Zielmuskel */
  direct: number
  /** Sätze als mitarbeitender Muskel (zählen je 0,5) */
  indirect: number
  /** Einheiten mit mindestens `frequencySets` anteiligen Sätzen */
  frequency: number
}

export type WeekVolume = Record<VolumeGroup, GroupVolume>

export function emptyVolume(): WeekVolume {
  return Object.fromEntries(VOLUME_GROUPS.map((g) => [g.id, { sets: 0, direct: 0, indirect: 0, frequency: 0 }])) as WeekVolume
}

/** Anteilige Sätze einer Einheit je Gruppe. */
export function dayVolume(items: VolumeItem[], lookup: (id: string) => Exercise | undefined = getExercise): Map<VolumeGroup, number> {
  const out = new Map<VolumeGroup, number>()
  for (const it of items) {
    const ex = lookup(it.exerciseId)
    if (!ex) continue
    for (const [g, f] of contributions(ex)) out.set(g, (out.get(g) ?? 0) + f * it.sets)
  }
  return out
}

/** Wochenvolumen aus mehreren Einheiten (jede Liste = eine Einheit). */
export function weekVolume(days: VolumeItem[][], lookup: (id: string) => Exercise | undefined = getExercise, cfg: ProgressionConfig = PROGRESSION_CONFIG): WeekVolume {
  const v = emptyVolume()
  for (const items of days) {
    for (const it of items) {
      const ex = lookup(it.exerciseId)
      if (!ex) continue
      for (const [g, f] of contributions(ex, cfg)) {
        v[g].sets += f * it.sets
        if (f === 1) v[g].direct += it.sets
        else v[g].indirect += it.sets
      }
    }
    for (const [g, s] of dayVolume(items, lookup)) if (s >= cfg.planning.frequencySets - 1e-9) v[g].frequency++
  }
  return v
}

export interface Ratios {
  push: number
  pull: number
  quad: number
  ham: number
  /** Drücken : Ziehen (Oberkörper, Zielmuskel-Sätze) */
  pushPull: number | null
  /** Quadrizeps : Beinbeuger (Zielmuskel-Sätze) */
  quadHam: number | null
}

export function ratios(v: WeekVolume): Ratios {
  const push = PUSH_GROUPS.reduce((s, g) => s + v[g].direct, 0)
  const pull = PULL_GROUPS.reduce((s, g) => s + v[g].direct, 0)
  const quad = v.quadrizeps.direct
  const ham = v.beinbeuger.direct
  return { push, pull, quad, ham, pushPull: pull ? push / pull : null, quadHam: ham ? quad / ham : null }
}

export type GroupStatus = 'unter' | 'ok' | 'ueber' | 'nicht_moeglich'

export function groupStatus(g: GroupVolume, possible: boolean, cfg: ProgressionConfig = PROGRESSION_CONFIG): GroupStatus {
  if (!possible) return 'nicht_moeglich'
  if (g.sets < cfg.planning.weeklyMin - 1e-9) return 'unter'
  if (g.sets > cfg.planning.weeklyMax + 1e-9) return 'ueber'
  return 'ok'
}

const de = (n: number) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(n)
export const fmtSets = de

/** Kurze Erklärung eines Wertes, z. B. „12,5 Sätze = 11 als Zielmuskel + 3 × ½ mitarbeitend · 3× trainiert“. */
export function explainVolume(g: GroupVolume): string {
  const parts = [`${de(g.direct)} als Zielmuskel`]
  if (g.indirect) parts.push(`${de(g.indirect)} × ½ mitarbeitend`)
  return `${de(g.sets)} ${g.sets === 1 ? 'Satz' : 'Sätze'} = ${parts.join(' + ')} · ${g.frequency}× trainiert`
}
