import { db, kvGet, kvSet } from '../db/db'
import { setCustomExercises } from '../data/exercises'
import { loadWeightSteps } from '../db/repo/weights'

/** Start: dauerhaften Speicher anfragen, eigene Übungen laden. */
export function initApp() {
  kvGet<number | null>('app.firstStart', null)
    .then((v) => (v === null ? kvSet('app.firstStart', Date.now()) : undefined))
    .catch(() => {})
  // Safari löscht Website-Daten sonst evtl. nach längerer Nichtnutzung
  if (navigator.storage?.persist) {
    navigator.storage.persisted?.().then((already) => {
      if (!already) navigator.storage.persist().catch(() => {})
    })
  }
  db.customExercises
    .toArray()
    .then(setCustomExercises)
    .catch(() => {})
  loadWeightSteps().catch(() => {})
}
