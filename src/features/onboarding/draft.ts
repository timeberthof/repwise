import type { ActivityLevel, EquipmentId, Experience, Goal, MuscleId, Pain, Profile, SplitId, TrainingLocation, WorkPosition } from '../../db/types'
import { db } from '../../db/db'
import { importStartwerte, type Startwerte } from '../../db/repo/startwerte'
import { createPlanFromProfile } from '../../db/repo/plan'
import { ALL_EQUIPMENT } from '../../data/equipment'
import { today } from '../../logic/dates'

/** Antworten des Onboardings (werden am Ende ins Profil übernommen). */
export interface Draft {
  goal: Goal
  experience: Experience
  daysPerWeek: number
  split: SplitId
  weekdays: number[]
  sessionMinutes: number
  location: TrainingLocation
  equipment: EquipmentId[]
  sex: 'm' | 'w'
  birthDate: string
  heightCm: number
  weight: number
  bodyFat: number | null
  activity: ActivityLevel
  workPosition: WorkPosition
  focus: MuscleId[]
  pains: Pain[]
  excluded: string[]
  mobility: boolean
  useStartwerte: boolean
}

export function emptyDraft(p: Omit<Profile, 'onboardingDone' | 'createdAt'> | Profile | null, weight: number, bodyFat: number | null, hasStartwerte: boolean): Draft {
  return {
    goal: p?.goal ?? 'rekomposition',
    experience: p?.experience ?? 'fortgeschritten',
    daysPerWeek: p?.daysPerWeek ?? 3,
    split: p?.split ?? 'ganzkoerper',
    weekdays: p?.weekdays ?? [0, 2, 4],
    sessionMinutes: p?.sessionMinutes ?? 60,
    location: p?.location ?? 'gym',
    equipment: p?.equipment ?? ALL_EQUIPMENT,
    sex: p?.sex ?? 'm',
    birthDate: p?.birthDate ?? '1995-01-01',
    heightCm: p?.heightCm ?? 180,
    weight,
    bodyFat,
    activity: p?.activity ?? 'moderat',
    workPosition: p?.workPosition ?? 'sitzend',
    focus: p?.focus ?? [],
    pains: p?.pains ?? [],
    excluded: p?.excludedExercises ?? [],
    mobility: p?.mobility ?? true,
    useStartwerte: hasStartwerte,
  }
}

/** Speichert Profil, Körperwerte und (optional) Startwerte und erzeugt den Plan. Gibt die Plan-ID zurück. */
export async function finishOnboarding(d: Draft, startwerte: Startwerte | null): Promise<number> {
  if (startwerte) await importStartwerte(startwerte)
  const t = today()
  const upsert = async (kind: 'weight' | 'bodyfat', value: number) => {
    const existing = await db.body.where('[kind+date]').equals([kind, t]).first()
    if (existing?.id) await db.body.update(existing.id, { value, source: 'app' })
    else await db.body.add({ date: t, kind, value, source: 'app' })
  }
  const weights = await db.body.where('kind').equals('weight').sortBy('date')
  if (weights.at(-1)?.value !== d.weight) await upsert('weight', d.weight)
  const fats = await db.body.where('kind').equals('bodyfat').sortBy('date')
  if (d.bodyFat !== null && fats.at(-1)?.value !== d.bodyFat) await upsert('bodyfat', d.bodyFat)

  const old = await db.profile.get('me')
  const profile: Profile = {
    id: 'me',
    sex: d.sex,
    birthDate: d.birthDate,
    heightCm: d.heightCm,
    goal: d.goal,
    activity: d.activity,
    workPosition: d.workPosition,
    experience: d.experience,
    daysPerWeek: d.weekdays.length,
    sessionMinutes: d.sessionMinutes,
    split: d.split,
    weekdays: [...d.weekdays].sort((a, b) => a - b),
    location: d.location,
    equipment: d.equipment,
    focus: d.focus,
    excludedExercises: d.excluded,
    pains: d.pains,
    mobility: d.mobility,
    planMode: old?.planMode ?? 'auto',
    sleep: old?.sleep,
    hrMaxOverride: old?.hrMaxOverride,
    cardioZone: old?.cardioZone ?? 2,
    onboardingDone: false,
    createdAt: old?.createdAt ?? Date.now(),
  }
  await db.profile.put(profile)
  const planId = await createPlanFromProfile(profile, 'onboarding')
  await db.profile.update('me', { onboardingDone: true })
  return planId
}
