// Datenmodell von Repwise. Alle Daten liegen lokal in IndexedDB (siehe db.ts).

/** Kalendertag im Format JJJJ-MM-TT (lokale Zeit). */
export type ISODate = string

export type MuscleId =
  | 'brust'
  | 'ruecken'
  | 'unterer_ruecken'
  | 'nacken'
  | 'vordere_schulter'
  | 'mittlere_schulter'
  | 'hintere_schulter'
  | 'bizeps'
  | 'trizeps'
  | 'unterarme'
  | 'bauch'
  | 'quadrizeps'
  | 'beinbeuger'
  | 'gesaess'
  | 'adduktoren'
  | 'abduktoren'
  | 'waden'
  // Mobility-Regionen
  | 'huefte'
  | 'sprunggelenk'
  | 'fuesse'
  | 'brustwirbelsaeule'
  | 'schultergelenk'

export type EquipmentId =
  | 'langhantel'
  | 'sz_stange'
  | 'kurzhantel'
  | 'kettlebell'
  | 'maschine'
  | 'kabelzug'
  | 'multipresse'
  | 'klimmzugstange'
  | 'dipbarren'
  | 'bank'
  | 'widerstandsband'
  | 'koerpergewicht'

export type MovementPattern =
  | 'horizontal_druecken'
  | 'vertikal_druecken'
  | 'horizontal_ziehen'
  | 'vertikal_ziehen'
  | 'brust_isolation'
  | 'seitheben'
  | 'frontheben'
  | 'reverse_fly'
  | 'shrug'
  | 'bizeps_curl'
  | 'trizeps_streckung'
  | 'unterarm'
  | 'kniebeuge'
  | 'ausfallschritt'
  | 'beinstrecken'
  | 'hueftstreckung'
  | 'beinbeugen'
  | 'glute_bruecke'
  | 'adduktion'
  | 'abduktion'
  | 'wadenheben'
  | 'rumpfbeuge'
  | 'rumpf_stabilitaet'
  | 'rotation'
  | 'rueckenstreckung'
  | 'mobilisation'
  | 'dehnung'
  | 'balance'

export type Joint = 'schulter' | 'ellenbogen' | 'handgelenk' | 'lws' | 'huefte' | 'knie' | 'sprunggelenk'

export interface Exercise {
  id: string
  name: string
  art: 'kraft' | 'mobility'
  primaer: MuscleId
  sekundaer: MuscleId[]
  muster: MovementPattern
  /** Erstes Element = Haupt-Equipment. */
  equipment: EquipmentId[]
  schwierigkeit: 1 | 2 | 3
  /** Kleinster sinnvoller Gewichtsschritt in kg (0 = Körpergewicht). */
  gewichtsschritt: number
  gewichtsart: 'gesamt' | 'pro_hand' | 'koerpergewicht' | 'zusatzgewicht'
  /** Belastete Gelenke – für die Rücksicht auf Schmerzen. */
  gelenke: Joint[]
  /** Mobility: Wiederholungen oder Sekunden je Satz. */
  einheit?: 'wdh' | 'sekunden'
  hinweise: string
  eigene?: boolean
}

export type WeekType = 'intro' | 'normal' | 'overreaching' | 'peak' | 'deload'
export type Goal = 'muskelaufbau' | 'fett_verlieren' | 'halten' | 'rekomposition'
export type Experience = 'anfaenger' | 'fortgeschritten' | 'profi'
export type ActivityLevel = 'wenig' | 'leicht' | 'moderat' | 'sehr' | 'extrem'
export type SplitId = 'ganzkoerper' | 'upper_lower' | 'push_pull' | 'push_pull_legs'
export type TrainingLocation = 'gym' | 'zuhause' | 'ohne_geraete'
export type WorkPosition = 'sitzend' | 'stehend' | 'koerperlich'
export type PainRegion =
  | 'schulter_links'
  | 'schulter_rechts'
  | 'ellenbogen'
  | 'handgelenk'
  | 'unterer_ruecken'
  | 'huefte'
  | 'knie_links'
  | 'knie_rechts'
  | 'sprunggelenk_links'
  | 'sprunggelenk_rechts'
  | 'nacken'

export interface Pain {
  region: PainRegion
  /** 0–10 */
  level: number
}

export interface Profile {
  id: 'me'
  sex: 'm' | 'w'
  birthDate: ISODate
  heightCm: number
  goal: Goal
  activity: ActivityLevel
  workPosition: WorkPosition
  experience: Experience
  daysPerWeek: number
  sessionMinutes: number
  split: SplitId
  /** Trainingstage 0 = Montag … 6 = Sonntag */
  weekdays: number[]
  location: TrainingLocation
  equipment: EquipmentId[]
  focus: MuscleId[]
  excludedExercises: string[]
  pains: Pain[]
  mobility: boolean
  /** „Repwise entscheidet“ oder „Anpassungen beibehalten“ (Zyklusplanung) */
  planMode: 'auto' | 'keep'
  sleep?: number
  hrMaxOverride?: number
  /** Eigene Zonengrenzen in bpm: Untergrenzen Zone 1–5 und Obergrenze Zone 5 (6 Werte) */
  hrZones?: number[]
  cardioZone: 1 | 2 | 3 | 4 | 5
  onboardingDone: boolean
  createdAt: number
}

export interface BodyEntry {
  id?: number
  date: ISODate
  kind: 'weight' | 'bodyfat'
  value: number
  source?: 'mci' | 'app'
}

export interface StepsEntry {
  date: ISODate
  steps: number | null
  skipped?: boolean
}

export interface Plan {
  id?: number
  createdAt: number
  startDate: ISODate
  cycleWeeks: number
  active: 0 | 1
  split: SplitId
  /** Woche (0-basiert) → manuell gewählter Typ */
  weekOverrides: Record<number, WeekType>
  status: 'aktiv' | 'pausiert'
  pausedSince?: ISODate
  source: 'onboarding' | 'zyklus' | 'manuell'
}

export interface PlanDay {
  id?: number
  planId: number
  name: string
  kind: 'kraft' | 'mobility'
  weekday: number
  order: number
  location: TrainingLocation
}

export interface PlanExercise {
  id?: number
  planDayId: number
  exerciseId: string
  order: number
  sets: number
  repMin: number
  repMax: number
  targetRir: number
  restSec: number
  superset?: boolean
}

export interface Checkin {
  /** 0–10, Total K.O. → Sehr fit */
  energy?: number
  /** 0–10, Schlaflosigkeit → Sehr gut */
  sleep?: number
  /** Muskel → 0–10 */
  soreness?: Partial<Record<MuscleId, number>>
  skipped?: boolean
}

export interface AdjustmentNote {
  kind: AdjustmentKind
  /** Was geändert wurde; „woche“/„uebung“/„plan“ für Wochentyp, Tausch und neue Pläne */
  field: 'weight' | 'sets' | 'reps' | 'rir' | 'woche' | 'uebung' | 'plan'
  before: number | null
  after: number | null
  reason: string
  title: string
}

export type AdjustmentKind =
  | 'progression'
  | 'reduktion'
  | 'stagnation'
  | 'wochentyp'
  | 'erholung'
  | 'muskelkater'
  | 'pause'
  | 'kalibrierung'
  | 'tausch'
  | 'manuell'
  | 'plan'

export type SessionStatus = 'geplant' | 'laeuft' | 'fertig' | 'uebersprungen'

export interface Session {
  id?: number
  date: ISODate
  planId?: number
  planDayId?: number
  name: string
  kind: 'kraft' | 'mobility'
  weekType: WeekType
  weekTypeManual?: boolean
  status: SessionStatus
  location: TrainingLocation
  startedAt?: number
  endedAt?: number
  checkin?: Checkin
  currentExercise?: number
  imported?: boolean
  /** Ursprünglich geplanter Tag, falls die Einheit verschoben wurde */
  plannedDate?: ISODate
  /** Minuten-Schätzung zum Zeitpunkt der Planung */
  estMinutes?: number
}

export interface SessionExercise {
  id?: number
  sessionId: number
  exerciseId: string
  order: number
  sets: number
  repMin: number
  repMax: number
  targetRir: number
  restSec: number
  weight: number | null
  weightIsEstimate: boolean
  swappedFrom?: string
  superset?: boolean
  adjustments: AdjustmentNote[]
  note?: string
}

export interface SetEntry {
  id?: number
  sessionId: number
  sessionExerciseId: number
  exerciseId: string
  date: ISODate
  index: number
  weight: number | null
  reps: number
  rir: number | null
  done: boolean
  doneAt?: number
}

export interface Adjustment extends AdjustmentNote {
  id?: number
  date: ISODate
  sessionId?: number
  exerciseId?: string
  overridden?: boolean
  overrideValue?: number | null
}

/** Maximalkraft (Ø je Einheit) – importiert aus MCI oder berechnet nach einem Training. */
export interface StrengthPoint {
  id?: number
  exerciseId: string
  date: ISODate
  e1rm: number
  source: 'mci' | 'app'
  sessionId?: number
}

export type CardioActivity =
  | 'laufen'
  | 'radfahren'
  | 'gehen'
  | 'schwimmen'
  | 'rudern'
  | 'crosstrainer'
  | 'wandern'
  | 'sonstiges'

export interface CardioEntry {
  id?: number
  date: ISODate
  activity: CardioActivity
  activityText?: string
  durationMin: number
  zone: 1 | 2 | 3 | 4 | 5
  targetHrMin: number
  targetHrMax: number
  avgHr?: number
  maxHr?: number
  timeInZoneMin?: number
  distanceKm?: number
  calories?: number
  intensity: 'leicht' | 'moderat' | 'intensiv'
  note?: string
  createdAt?: number
}

export type PhotoPose = 'vorne' | 'seitlich' | 'hinten'

export interface ProgressPhoto {
  id?: number
  date: ISODate
  pose: PhotoPose
  /** Bilddaten als ArrayBuffer (Blobs in IndexedDB sind in manchen WebKit-Versionen unzuverlässig) */
  data: ArrayBuffer
  thumbData: ArrayBuffer
  mime: string
  width?: number
  height?: number
  weight?: number
  note?: string
  createdAt?: number
}

export interface ExerciseSettings {
  exerciseId: string
  restSec?: number
  weightRows?: WeightRow[]
  customWeights?: number[]
  note?: string
}

export interface WeightRow {
  from: number
  to: number
  step: number
}

export interface KV {
  key: string
  value: unknown
}
