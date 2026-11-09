import { useLiveQuery } from 'dexie-react-hooks'
import { db, kvGet } from '../../db/db'
import { getSettings } from '../../db/settings'
import { checkinStatus } from '../../db/repo/checkin'
import { runningSession } from '../../db/repo/sessions'
import { diffDays, formatDate, toISO, today } from '../../logic/dates'

export interface Hint {
  id: string
  title: string
  text: string
  action: 'backup' | 'koerper' | 'training' | 'workout'
  graphic?: 'trend' | 'backup' | 'scale'
}

/**
 * Hinweise für das Karussell „WILLKOMMEN ZURÜCK“ – nur Erinnerungen, keine Empfehlungen.
 * Der Backup-Hinweis lässt sich in den Einstellungen abschalten.
 */
export function useHints(): Hint[] | undefined {
  return useLiveQuery(async () => {
    const s = await getSettings()
    const hints: Hint[] = []
    const t = today()
    // abhängig von Check-ins/Fotos/Trainings, damit die Hinweise nach dem Speichern verschwinden
    await Promise.all([db.checkins.count(), db.photos.count(), db.sessions.count()])

    const running = await runningSession()
    if (running) hints.push({ id: 'workout', title: `${running.name} läuft`, text: 'Tippe hier, um Dein laufendes Training fortzusetzen.', action: 'workout', graphic: 'trend' })

    const st = await checkinStatus(t)
    if (st.due) hints.push({ id: 'checkin', title: 'Wöchentlicher Check-in', text: 'Trag Dein Körpergewicht ein und mach ein Fortschrittsfoto.', action: 'koerper', graphic: 'scale' })
    else if (st.photoPending) hints.push({ id: 'foto', title: 'Fortschrittsfoto fehlt', text: `Zum Check-in vom ${formatDate(st.photoPending.date)} fehlt noch ein Foto.`, action: 'koerper', graphic: 'scale' })

    const lastBackup = await kvGet<number | null>('backup.last', null)
    const installed = await kvGet<number | null>('app.firstStart', null)
    const since = lastBackup ?? installed
    if (s.hints.backup && since !== null && diffDays(toISO(new Date(since)), t) >= s.backupDays) {
      hints.push({
        id: 'backup',
        title: 'Backup erstellen',
        text: lastBackup ? `Dein letztes Backup ist ${diffDays(toISO(new Date(lastBackup)), t)} Tage her. Sichere Deine Daten als Datei.` : 'Du hast noch kein Backup. Sichere Deine Daten als Datei – z. B. in iCloud Drive.',
        action: 'backup',
        graphic: 'backup',
      })
    }
    if (!hints.length) {
      hints.push({ id: 'willkommen', title: 'Willkommen bei Repwise', text: 'Starte ein Training aus Deinen Vorlagen und trag Gewicht und Wiederholungen selbst ein.', action: 'training', graphic: 'trend' })
    }
    return hints
  }, [])
}
