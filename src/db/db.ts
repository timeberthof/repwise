import Dexie, { type EntityTable } from 'dexie'
import type {
  Adjustment,
  BodyEntry,
  CardioEntry,
  Exercise,
  ExerciseSettings,
  KV,
  Plan,
  PlanDay,
  PlanExercise,
  Profile,
  ProgressPhoto,
  Session,
  SessionExercise,
  SetEntry,
  StepsEntry,
  StrengthPoint,
} from './types'

export class RepwiseDB extends Dexie {
  profile!: EntityTable<Profile, 'id'>
  body!: EntityTable<BodyEntry, 'id'>
  steps!: EntityTable<StepsEntry, 'date'>
  plans!: EntityTable<Plan, 'id'>
  planDays!: EntityTable<PlanDay, 'id'>
  planExercises!: EntityTable<PlanExercise, 'id'>
  sessions!: EntityTable<Session, 'id'>
  sessionExercises!: EntityTable<SessionExercise, 'id'>
  sets!: EntityTable<SetEntry, 'id'>
  adjustments!: EntityTable<Adjustment, 'id'>
  strength!: EntityTable<StrengthPoint, 'id'>
  cardio!: EntityTable<CardioEntry, 'id'>
  photos!: EntityTable<ProgressPhoto, 'id'>
  customExercises!: EntityTable<Exercise, 'id'>
  exerciseSettings!: EntityTable<ExerciseSettings, 'exerciseId'>
  kv!: EntityTable<KV, 'key'>

  constructor(name = 'repwise') {
    super(name)
    this.version(1).stores({
      profile: 'id',
      body: '++id, date, kind, [kind+date]',
      steps: 'date',
      plans: '++id, active, startDate',
      planDays: '++id, planId, weekday',
      planExercises: '++id, planDayId, exerciseId',
      sessions: '++id, date, status, planDayId, kind',
      sessionExercises: '++id, sessionId, exerciseId',
      sets: '++id, sessionId, sessionExerciseId, exerciseId, date',
      adjustments: '++id, date, sessionId, exerciseId',
      strength: '++id, exerciseId, date, [exerciseId+date]',
      cardio: '++id, date',
      photos: '++id, date',
      customExercises: 'id',
      exerciseSettings: 'exerciseId',
      kv: 'key',
    })
    // v2: Maximalkraft-Werte nach Einheit auffindbar (Verlauf bearbeiten/löschen)
    this.version(2).stores({
      strength: '++id, exerciseId, date, sessionId, [exerciseId+date]',
    })
  }
}

export const db = new RepwiseDB()

/** Tabellen, die ein Backup umfasst (Reihenfolge = Import-Reihenfolge). */
export const BACKUP_TABLES = [
  'profile',
  'body',
  'steps',
  'plans',
  'planDays',
  'planExercises',
  'sessions',
  'sessionExercises',
  'sets',
  'adjustments',
  'strength',
  'cardio',
  'photos',
  'customExercises',
  'exerciseSettings',
  'kv',
] as const

export async function kvGet<T>(key: string, fallback: T): Promise<T> {
  const row = await db.kv.get(key)
  return row ? (row.value as T) : fallback
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await db.kv.put({ key, value })
}
