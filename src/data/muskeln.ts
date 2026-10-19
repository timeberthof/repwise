import type { MuscleId, PainRegion, Joint } from '../db/types'

/** Gruppen wie in Statistik › Training des Originals. */
export type StatGroup = 'ruecken' | 'brust' | 'schultern' | 'arme' | 'beine' | 'core' | 'mobility'

/** Muskelgruppen aus CLAUDE.md (für Volumen, Bibliothek, Schwerpunkte). */
export type MainGroup =
  | 'Brust'
  | 'Rücken'
  | 'Schultern'
  | 'Bizeps'
  | 'Trizeps'
  | 'Unterarme'
  | 'Bauch'
  | 'Quadrizeps'
  | 'Beinbeuger'
  | 'Gesäß'
  | 'Waden'
  | 'Mobility'

export interface MuscleMeta {
  id: MuscleId
  label: string
  stat: StatGroup
  main: MainGroup
  /** Drückende (push) oder ziehende (pull) Muskulatur – für Push/Pull-Splits. */
  side: 'push' | 'pull' | 'beine' | 'core' | 'mobility'
  /** Oberkörper / Unterkörper – für Upper/Lower. */
  half: 'upper' | 'lower' | 'core' | 'mobility'
}

export const MUSCLES: Record<MuscleId, MuscleMeta> = {
  brust: { id: 'brust', label: 'Brust', stat: 'brust', main: 'Brust', side: 'push', half: 'upper' },
  ruecken: { id: 'ruecken', label: 'Rücken', stat: 'ruecken', main: 'Rücken', side: 'pull', half: 'upper' },
  unterer_ruecken: { id: 'unterer_ruecken', label: 'Unterer Rücken', stat: 'ruecken', main: 'Rücken', side: 'pull', half: 'lower' },
  nacken: { id: 'nacken', label: 'Nacken', stat: 'ruecken', main: 'Rücken', side: 'pull', half: 'upper' },
  vordere_schulter: { id: 'vordere_schulter', label: 'Vordere Schulter', stat: 'schultern', main: 'Schultern', side: 'push', half: 'upper' },
  mittlere_schulter: { id: 'mittlere_schulter', label: 'Mittlere Schulter', stat: 'schultern', main: 'Schultern', side: 'push', half: 'upper' },
  hintere_schulter: { id: 'hintere_schulter', label: 'Hintere Schulter', stat: 'schultern', main: 'Schultern', side: 'pull', half: 'upper' },
  bizeps: { id: 'bizeps', label: 'Bizeps', stat: 'arme', main: 'Bizeps', side: 'pull', half: 'upper' },
  trizeps: { id: 'trizeps', label: 'Trizeps', stat: 'arme', main: 'Trizeps', side: 'push', half: 'upper' },
  unterarme: { id: 'unterarme', label: 'Unterarme', stat: 'arme', main: 'Unterarme', side: 'pull', half: 'upper' },
  bauch: { id: 'bauch', label: 'Bauch', stat: 'core', main: 'Bauch', side: 'core', half: 'core' },
  quadrizeps: { id: 'quadrizeps', label: 'Quadrizeps', stat: 'beine', main: 'Quadrizeps', side: 'push', half: 'lower' },
  beinbeuger: { id: 'beinbeuger', label: 'Beinbeuger', stat: 'beine', main: 'Beinbeuger', side: 'pull', half: 'lower' },
  gesaess: { id: 'gesaess', label: 'Gesäß', stat: 'beine', main: 'Gesäß', side: 'pull', half: 'lower' },
  adduktoren: { id: 'adduktoren', label: 'Adduktoren', stat: 'beine', main: 'Gesäß', side: 'push', half: 'lower' },
  abduktoren: { id: 'abduktoren', label: 'Abduktoren', stat: 'beine', main: 'Gesäß', side: 'pull', half: 'lower' },
  waden: { id: 'waden', label: 'Waden', stat: 'beine', main: 'Waden', side: 'push', half: 'lower' },
  huefte: { id: 'huefte', label: 'Hüfte', stat: 'mobility', main: 'Mobility', side: 'mobility', half: 'mobility' },
  sprunggelenk: { id: 'sprunggelenk', label: 'Sprunggelenk', stat: 'mobility', main: 'Mobility', side: 'mobility', half: 'mobility' },
  fuesse: { id: 'fuesse', label: 'Füße', stat: 'mobility', main: 'Mobility', side: 'mobility', half: 'mobility' },
  brustwirbelsaeule: { id: 'brustwirbelsaeule', label: 'Brustwirbelsäule', stat: 'mobility', main: 'Mobility', side: 'mobility', half: 'mobility' },
  schultergelenk: { id: 'schultergelenk', label: 'Schultergelenk', stat: 'mobility', main: 'Mobility', side: 'mobility', half: 'mobility' },
}

export const STAT_GROUPS: { id: StatGroup; label: string }[] = [
  { id: 'ruecken', label: 'Rücken' },
  { id: 'brust', label: 'Brust' },
  { id: 'schultern', label: 'Schultern' },
  { id: 'arme', label: 'Arme' },
  { id: 'beine', label: 'Beine' },
  { id: 'core', label: 'Core' },
]

export const MAIN_GROUPS: MainGroup[] = [
  'Brust',
  'Rücken',
  'Schultern',
  'Bizeps',
  'Trizeps',
  'Unterarme',
  'Bauch',
  'Quadrizeps',
  'Beinbeuger',
  'Gesäß',
  'Waden',
]

/** Muskeln, die als Schwerpunkt (Fokus) wählbar sind. */
export const FOCUS_OPTIONS: MuscleId[] = [
  'brust',
  'ruecken',
  'nacken',
  'vordere_schulter',
  'mittlere_schulter',
  'hintere_schulter',
  'bizeps',
  'trizeps',
  'unterarme',
  'bauch',
  'quadrizeps',
  'beinbeuger',
  'gesaess',
  'waden',
]

export const muscleLabel = (id: MuscleId) => MUSCLES[id]?.label ?? id

export const PAIN_REGIONS: { id: PainRegion; label: string; joints: Joint[]; mobility: MuscleId[] }[] = [
  { id: 'nacken', label: 'Nacken', joints: ['schulter'], mobility: ['brustwirbelsaeule'] },
  { id: 'schulter_links', label: 'Linke Schulter', joints: ['schulter'], mobility: ['schultergelenk', 'brustwirbelsaeule'] },
  { id: 'schulter_rechts', label: 'Rechte Schulter', joints: ['schulter'], mobility: ['schultergelenk', 'brustwirbelsaeule'] },
  { id: 'ellenbogen', label: 'Ellenbogen', joints: ['ellenbogen'], mobility: [] },
  { id: 'handgelenk', label: 'Handgelenk', joints: ['handgelenk'], mobility: [] },
  { id: 'unterer_ruecken', label: 'Unterer Rücken', joints: ['lws'], mobility: ['huefte', 'brustwirbelsaeule'] },
  { id: 'huefte', label: 'Hüfte', joints: ['huefte'], mobility: ['huefte'] },
  { id: 'knie_links', label: 'Linkes Knie', joints: ['knie'], mobility: ['huefte', 'sprunggelenk'] },
  { id: 'knie_rechts', label: 'Rechtes Knie', joints: ['knie'], mobility: ['huefte', 'sprunggelenk'] },
  { id: 'sprunggelenk_links', label: 'Linkes Fußgelenk', joints: ['sprunggelenk'], mobility: ['sprunggelenk', 'fuesse'] },
  { id: 'sprunggelenk_rechts', label: 'Rechtes Fußgelenk', joints: ['sprunggelenk'], mobility: ['sprunggelenk', 'fuesse'] },
]

export const painLabel = (id: PainRegion) => PAIN_REGIONS.find((p) => p.id === id)?.label ?? id
