/**
 * „Meine Übungen“: alle Kraftübungen, die Du schon trainiert, selbst angelegt oder in einer Vorlage hast.
 * Die mitgelieferte Bibliothek erscheint nur, soweit Du eine Übung daraus schon benutzt.
 *
 * Löschen: Übungen mit Verlauf werden nur ausgeblendet – Sätze, Maximalkraft und Diagramme bleiben.
 * Übungen ohne Verlauf werden entfernt. Bearbeiten einer mitgelieferten Übung speichert eine eigene Fassung
 * mit derselben ID (der Verlauf bleibt verknüpft).
 */
import { db, kvGet, kvSet } from '../db'
import type { Exercise, MovementPattern, MuscleId } from '../types'
import { allExercises, getExercise, setCustomExercises } from '../../data/exercises'

const HIDDEN_KEY = 'exercises.hidden'

/** Übungen mit gespeicherten Daten (Sätze, Maximalkraft, Arbeitsgewichte aus den Startwerten). */
export async function usedExerciseIds(): Promise<Set<string>> {
  const ids = new Set<string>()
  await db.sets.each((s) => ids.add(s.exerciseId))
  await db.strength.each((p) => ids.add(p.exerciseId))
  const ww = await kvGet<Record<string, unknown>>('startwerte.arbeitsgewichte', {})
  Object.keys(ww).forEach((id) => ids.add(id))
  return ids
}

export async function hiddenExerciseIds(): Promise<Set<string>> {
  return new Set(await kvGet<string[]>(HIDDEN_KEY, []))
}

async function setHidden(id: string, hidden: boolean) {
  const set = await hiddenExerciseIds()
  if (hidden) set.add(id)
  else set.delete(id)
  await kvSet(HIDDEN_KEY, [...set])
}

/** Meine Übungen (nur Kraft), alphabetisch. */
export async function myExercises(): Promise<Exercise[]> {
  const ids = await usedExerciseIds()
  for (const c of await db.customExercises.toArray()) ids.add(c.id)
  for (const t of await db.templates.toArray()) t.exerciseIds.forEach((id) => ids.add(id))
  const hidden = await hiddenExerciseIds()
  return [...ids]
    .filter((id) => !hidden.has(id))
    .map((id) => getExercise(id))
    .filter((e): e is Exercise => !!e && e.art === 'kraft')
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
}

/** Grobes Bewegungsmuster aus der Muskelgruppe (nur für das Symbol der Übung). */
const PATTERN_FOR: Partial<Record<MuscleId, MovementPattern>> = {
  brust: 'horizontal_druecken',
  ruecken: 'horizontal_ziehen',
  unterer_ruecken: 'rueckenstreckung',
  nacken: 'shrug',
  vordere_schulter: 'vertikal_druecken',
  mittlere_schulter: 'seitheben',
  hintere_schulter: 'reverse_fly',
  bizeps: 'bizeps_curl',
  trizeps: 'trizeps_streckung',
  unterarme: 'unterarm',
  bauch: 'rumpfbeuge',
  quadrizeps: 'kniebeuge',
  beinbeuger: 'beinbeugen',
  gesaess: 'glute_bruecke',
  adduktoren: 'adduktion',
  abduktoren: 'abduktion',
  waden: 'wadenheben',
}

export interface ExerciseInput {
  id?: string
  name: string
  primaer: MuscleId
  hinweise?: string
}

/** Übung anlegen oder bearbeiten. */
export async function saveExercise(input: ExerciseInput): Promise<Exercise> {
  const name = input.name.trim()
  if (!name) throw new Error('Name fehlt')
  const base = input.id ? getExercise(input.id) : undefined
  const e: Exercise = base
    ? { ...base, name, primaer: input.primaer, hinweise: input.hinweise?.trim() ?? base.hinweise, muster: base.primaer === input.primaer ? base.muster : (PATTERN_FOR[input.primaer] ?? base.muster) }
    : {
        id: `eigen-${Date.now()}`,
        name,
        art: 'kraft',
        primaer: input.primaer,
        sekundaer: [],
        muster: PATTERN_FOR[input.primaer] ?? 'rumpf_stabilitaet',
        equipment: [],
        schwierigkeit: 1,
        gewichtsschritt: 2.5,
        gewichtsart: 'gesamt',
        gelenke: [],
        hinweise: input.hinweise?.trim() ?? '',
        eigene: true,
      }
  await db.customExercises.put(e)
  await setHidden(e.id, false)
  setCustomExercises(await db.customExercises.toArray())
  return e
}

/** Löschen: mit Verlauf nur ausblenden (Daten bleiben), sonst entfernen. Entfernt die Übung auch aus Vorlagen. */
export async function deleteExercise(id: string): Promise<'ausgeblendet' | 'geloescht'> {
  const used = (await usedExerciseIds()).has(id)
  for (const t of await db.templates.toArray()) {
    if (t.exerciseIds.includes(id)) await db.templates.update(t.id!, { exerciseIds: t.exerciseIds.filter((x) => x !== id) })
  }
  if (used) {
    await setHidden(id, true)
    return 'ausgeblendet'
  }
  const custom = await db.customExercises.get(id)
  if (custom?.eigene) {
    await db.customExercises.delete(id)
    setCustomExercises(await db.customExercises.toArray())
  } else {
    await setHidden(id, true)
  }
  return 'geloescht'
}

export { allExercises }
