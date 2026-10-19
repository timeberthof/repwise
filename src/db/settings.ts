import { useLiveQuery } from 'dexie-react-hooks'
import { db, kvGet, kvSet } from './db'

/** App-Einstellungen (in der kv-Tabelle unter „settings“). */
export interface AppSettings {
  /** Beim Öffnen nach den Schritten von gestern fragen */
  askSteps: boolean
  stepGoal: number
  /** In-App-Hinweise einzeln an/aus */
  hints: {
    zyklus: boolean
    schritte: boolean
    backup: boolean
    gewicht: boolean
    training: boolean
  }
  /** Erinnerung an ein Backup nach so vielen Tagen */
  backupDays: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  askSteps: true,
  stepGoal: 8000,
  hints: { zyklus: true, schritte: true, backup: true, gewicht: true, training: true },
  backupDays: 14,
}

function merge(s: Partial<AppSettings> | null): AppSettings {
  return { ...DEFAULT_SETTINGS, ...(s ?? {}), hints: { ...DEFAULT_SETTINGS.hints, ...(s?.hints ?? {}) } }
}

export async function getSettings(): Promise<AppSettings> {
  return merge(await kvGet<Partial<AppSettings> | null>('settings', null))
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<void> {
  const cur = await getSettings()
  await kvSet('settings', { ...cur, ...patch, hints: { ...cur.hints, ...(patch.hints ?? {}) } })
}

export function useSettings(): AppSettings | undefined {
  return useLiveQuery(async () => merge(((await db.kv.get('settings'))?.value as Partial<AppSettings>) ?? null), [])
}
