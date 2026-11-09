import { db, kvGet, kvSet } from '../db/db'
import { setCustomExercises } from '../data/exercises'

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
    // Umstellung auf reine Erfassung: bisherigen Plan einmalig als Vorlagen übernehmen (nichts wird gelöscht)
    .then(() => import('../db/repo/migrate').then((m) => m.migrateToErfassung()))
    .catch(() => {})
}
