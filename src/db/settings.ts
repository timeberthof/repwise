import { useLiveQuery } from 'dexie-react-hooks'
import { db, kvGet, kvSet } from './db'

/** App-Einstellungen (in der kv-Tabelle unter „settings“). Ältere Felder (z. B. Schritte) bleiben dort unbeachtet. */
export interface AppSettings {
  /** In-App-Hinweise */
  hints: {
    backup: boolean
  }
  /** Erinnerung an ein Backup nach so vielen Tagen */
  backupDays: number
  /** Pausentimer nach jedem eingetragenen Satz starten */
  restTimer: boolean
  /** Pausendauer in Sekunden (je Übung über ⚙ änderbar) */
  restSec: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  hints: { backup: true },
  backupDays: 14,
  restTimer: true,
  restSec: 120,
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
