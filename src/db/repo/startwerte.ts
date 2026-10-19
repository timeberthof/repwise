import { db, kvSet } from '../db'
import type { Profile, Session, SplitId, Goal, ActivityLevel, WorkPosition, Experience, TrainingLocation, MuscleId, PainRegion } from '../types'
import { ALL_EQUIPMENT } from '../../data/equipment'

/** Struktur von src/data/startwerte.json */
export interface Startwerte {
  quelle: string
  stand: string
  profil: {
    geschlecht: 'm' | 'w'
    geburtsdatum: string
    groesseCm: number
    ziel: Goal
    aktivitaet: ActivityLevel
    arbeitsposition: WorkPosition
    erfahrung: Experience
    trainingsTage: number
    split: SplitId
    wochentage: number[]
    dauerMin: number
    ort: TrainingLocation
    fokus: MuscleId[]
    schmerzen: { region: PainRegion; stufe: number }[]
    schlaf: number
    planModus: 'auto' | 'keep'
  }
  koerper: { gewicht: { datum: string; wert: number }[]; koerperfett: { datum: string; wert: number }[] }
  maximalkraft: Record<string, [string, number][]>
  arbeitsgewichte: Record<string, { gewicht: number; wdh?: number; rir?: number; datum: string; bereich?: [number, number]; hinweis?: string }>
  trainings: [string, string][]
  trainingAbschluss?: { datum: string; bewegtKg: number; dauerMin: number; saetze: number }
  serie: number
}

export interface WorkingWeight {
  weight: number
  reps?: number
  rir?: number
  date: string
  range?: [number, number]
}

/** Profil-Vorbelegung für das Onboarding aus den Startwerten. */
export function profileDefaults(s: Startwerte): Omit<Profile, 'onboardingDone' | 'createdAt'> {
  const p = s.profil
  return {
    id: 'me',
    sex: p.geschlecht,
    birthDate: p.geburtsdatum,
    heightCm: p.groesseCm,
    goal: p.ziel,
    activity: p.aktivitaet,
    workPosition: p.arbeitsposition,
    experience: p.erfahrung,
    daysPerWeek: p.trainingsTage,
    sessionMinutes: p.dauerMin,
    split: p.split,
    weekdays: p.wochentage,
    location: p.ort,
    equipment: [...ALL_EQUIPMENT],
    focus: p.fokus,
    excludedExercises: [],
    pains: p.schmerzen.map((x) => ({ region: x.region, level: x.stufe })),
    mobility: true,
    planMode: p.planModus,
    sleep: p.schlaf,
    cardioZone: 2,
  }
}

/**
 * Übernimmt die bestätigten Startwerte in die Datenbank: Körperwerte, Maximalkraft-Verläufe,
 * bisherige Trainingstage (für Serie und 30-Tage-Raster) und letzte Arbeitsgewichte.
 * Mehrfaches Ausführen erzeugt keine Duplikate (vorherige MCI-Daten werden ersetzt).
 */
export async function importStartwerte(s: Startwerte, opts: { weightOverride?: number } = {}) {
  await db.transaction('rw', [db.body, db.strength, db.sessions, db.kv], async () => {
    await db.body.filter((b) => b.source === 'mci').delete()
    await db.strength.filter((p) => p.source === 'mci').delete()
    await db.sessions.filter((x) => !!x.imported).delete()

    const body = [
      ...s.koerper.gewicht.map((g) => ({ date: g.datum, kind: 'weight' as const, value: g.wert, source: 'mci' as const })),
      ...(s.koerper.koerperfett ?? []).map((g) => ({ date: g.datum, kind: 'bodyfat' as const, value: g.wert, source: 'mci' as const })),
    ]
    if (opts.weightOverride) {
      const last = body.filter((b) => b.kind === 'weight').sort((a, b) => a.date.localeCompare(b.date)).pop()
      if (last) last.value = opts.weightOverride
    }
    await db.body.bulkAdd(body)

    const points = Object.entries(s.maximalkraft).flatMap(([exerciseId, list]) => list.map(([date, e1rm]) => ({ exerciseId, date, e1rm, source: 'mci' as const })))
    await db.strength.bulkAdd(points)

    const sessions: Session[] = s.trainings.map(([date, name]) => ({
      date,
      name,
      kind: 'kraft',
      weekType: 'normal',
      status: 'fertig',
      location: 'gym',
      imported: true,
    }))
    await db.sessions.bulkAdd(sessions)

    const ww: Record<string, WorkingWeight> = {}
    for (const [id, v] of Object.entries(s.arbeitsgewichte ?? {})) ww[id] = { weight: v.gewicht, reps: v.wdh, rir: v.rir, date: v.datum, range: v.bereich }
    await kvSet('startwerte.arbeitsgewichte', ww)
    if (s.trainingAbschluss) await kvSet('startwerte.abschluss', s.trainingAbschluss)
    await kvSet('startwerte.importiert', { stand: s.stand, quelle: s.quelle, am: Date.now() })
  })
}

/**
 * Persönliche Startwerte aus `privat/startwerte.json` – nur in der Entwicklung (npm run dev) und nur,
 * wenn die Datei lokal existiert. Der Ordner steht in .gitignore, und kein Build enthält ihn: Die
 * veröffentlichte App (GitHub Pages) hat keine persönlichen Daten, dort werden die Startwerte im
 * Onboarding als Datei geladen.
 */
export async function loadBundledStartwerte(): Promise<Startwerte | null> {
  if (!import.meta.env.DEV) return null
  const mods = import.meta.glob('/privat/startwerte.json')
  const loader = Object.values(mods)[0]
  if (!loader) return null
  const mod = (await loader()) as { default: Startwerte }
  return mod.default
}

/** Prüft, ob ein Objekt eine Startwerte-Datei ist (Import im Onboarding). */
export function isStartwerte(d: unknown): d is Startwerte {
  const s = d as Partial<Startwerte> | null
  return (
    !!s &&
    typeof s === 'object' &&
    !!s.profil &&
    typeof s.profil.geburtsdatum === 'string' &&
    !!s.koerper &&
    Array.isArray(s.koerper.gewicht) &&
    !!s.maximalkraft &&
    typeof s.maximalkraft === 'object' &&
    Array.isArray(s.trainings)
  )
}
