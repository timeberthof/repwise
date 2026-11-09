import type { Profile } from '../../db/types'
import { db } from '../../db/db'
import { importStartwerte, type Startwerte } from '../../db/repo/startwerte'
import { ALL_EQUIPMENT } from '../../data/equipment'

/** Antworten des Onboardings (werden am Ende ins Profil übernommen). */
export interface Draft {
  sex: 'm' | 'w'
  birthDate: string
  heightCm: number
}

export function emptyDraft(p: Pick<Profile, 'sex' | 'birthDate' | 'heightCm'> | null): Draft {
  return { sex: p?.sex ?? 'm', birthDate: p?.birthDate ?? '1995-01-01', heightCm: p?.heightCm ?? 180 }
}

/**
 * Speichert das Profil und übernimmt (optional) die Startwerte aus der bisherigen App. Es wird kein Plan erzeugt –
 * Trainings legst Du selbst an. Felder aus der früheren Planung behalten ihren bisherigen Wert (oder neutrale Standardwerte),
 * damit alte Backups und Daten gültig bleiben.
 */
export async function finishOnboarding(d: Draft, startwerte: Startwerte | null): Promise<void> {
  if (startwerte) await importStartwerte(startwerte)
  const old = await db.profile.get('me')
  const profile: Profile = {
    goal: 'rekomposition',
    activity: 'moderat',
    workPosition: 'sitzend',
    experience: 'fortgeschritten',
    daysPerWeek: 3,
    sessionMinutes: 60,
    split: 'ganzkoerper',
    weekdays: [],
    location: 'gym',
    equipment: ALL_EQUIPMENT,
    focus: [],
    excludedExercises: [],
    pains: [],
    mobility: false,
    planMode: 'keep',
    cardioZone: 2,
    ...old,
    id: 'me',
    sex: d.sex,
    birthDate: d.birthDate,
    heightCm: d.heightCm,
    onboardingDone: true,
    createdAt: old?.createdAt ?? Date.now(),
  }
  await db.profile.put(profile)
}
