/**
 * Umstellung auf reine Erfassung (09.11.2026).
 *
 * Es wird nichts gelöscht: Pläne, Anpassungsprotokoll, Schritte und alle Trainingsdaten bleiben in der Datenbank
 * und im Backup. Einmalig werden die Trainingstage des bisherigen Plans als eigene Vorlagen übernommen
 * (je Name die erste Einheit, z. B. „Push“ und „Pull“) – danach gehören sie Dir und lassen sich frei ändern.
 *
 * Läuft beim App-Start und nach jedem Backup-Import (alte Backups bekommen so ebenfalls Vorlagen).
 */
import { db, kvGet, kvSet } from '../db'

const FLAG = 'migration.erfassung'

let running: Promise<number> | null = null

/** Gibt die Anzahl angelegter Vorlagen zurück. Mehrfaches Aufrufen ist unbedenklich. */
export function migrateToErfassung(): Promise<number> {
  running ??= run().finally(() => (running = null))
  return running
}

async function run(): Promise<number> {
  if (await kvGet<number | null>(FLAG, null)) return 0
  let created = 0
  if ((await db.templates.count()) === 0) {
    const plans = await db.plans.toArray()
    // aktiver Plan mit dem spätesten Start; sonst der neueste
    const plan = [...plans].sort((a, b) => b.active - a.active || b.startDate.localeCompare(a.startDate) || b.createdAt - a.createdAt)[0]
    if (plan?.id) {
      const days = (await db.planDays.where('planId').equals(plan.id).toArray()).filter((d) => d.kind === 'kraft').sort((a, b) => a.weekday - b.weekday || a.order - b.order)
      const seen = new Set<string>()
      for (const d of days) {
        if (seen.has(d.name)) continue
        seen.add(d.name)
        const pes = await db.planExercises.where('planDayId').equals(d.id!).sortBy('order')
        const exerciseIds = [...new Set(pes.map((p) => p.exerciseId))]
        if (!exerciseIds.length) continue
        await db.templates.add({ name: d.name, exerciseIds, order: ++created, createdAt: Date.now() })
      }
    }
  }
  await kvSet(FLAG, 1)
  return created
}
