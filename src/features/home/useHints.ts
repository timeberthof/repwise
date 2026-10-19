import { useLiveQuery } from 'dexie-react-hooks'
import { db, kvGet } from '../../db/db'
import { getSettings } from '../../db/settings'
import { addDays, diffDays, formatLong, toISO, today } from '../../logic/dates'
import { isLastCycleWeek, nextCycleStart } from '../../logic/cycle'
import { planForDate, upcomingPlan } from '../../db/repo/plan'

export interface Hint {
  id: string
  title: string
  text: string
  action: 'zyklus' | 'schritte' | 'backup' | 'gewicht' | 'training'
  graphic?: 'trend' | 'steps' | 'backup' | 'scale'
}

/**
 * Hinweise für das Karussell „WILLKOMMEN ZURÜCK“ – ersetzt Push-Benachrichtigungen
 * (DECISIONS.md, Frage 8). Jeder Hinweis lässt sich in den Einstellungen abschalten.
 */
export function useHints(): Hint[] | undefined {
  return useLiveQuery(async () => {
    const s = await getSettings()
    const hints: Hint[] = []
    const t = today()
    const plan = await planForDate(t)
    const next = await upcomingPlan(t)
    if (s.hints.zyklus && plan && plan.startDate <= t && !next && isLastCycleWeek(plan, t)) {
      hints.push({
        id: 'zyklus',
        title: 'Trainingsplan optimieren',
        text: `Du bist in der letzten Woche des Mesozyklus angekommen. Starte die Evaluation und gib Deine Präferenzen an.`,
        action: 'zyklus',
        graphic: 'trend',
      })
    }
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
    const yesterday = addDays(t, -1)
    if (s.hints.schritte && !(await db.steps.get(yesterday))) {
      hints.push({ id: 'schritte', title: 'Schritte von gestern', text: `Trag Deine Schritte vom ${formatLong(yesterday)} ein, solange Du sie noch weißt.`, action: 'schritte', graphic: 'steps' })
    }
    if (s.hints.gewicht && !(await db.body.where('[kind+date]').equals(['weight', t]).first())) {
      hints.push({ id: 'gewicht', title: 'Weigh-In', text: 'Trag Dein heutiges Gewicht ein – Kalorienbedarf und Plan passen sich automatisch an.', action: 'gewicht', graphic: 'scale' })
    }
    if (s.hints.training && plan && !hints.some((h) => h.id === 'zyklus')) {
      const start = next?.startDate ?? (plan.startDate > t ? plan.startDate : nextCycleStart(plan, t))
      hints.push({
        id: 'training',
        title: next ? 'Neuer Plan steht bereit' : plan.startDate > t ? 'Dein Plan startet bald' : 'Dein Mesozyklus',
        text: next
          ? `Dein optimierter Trainingsplan startet am ${formatLong(start)}.`
          : plan.startDate > t
            ? `Dein Trainingsplan startet am ${formatLong(start)} mit einer Intro-Woche.`
            : `Der nächste Trainingszyklus beginnt am ${formatLong(start)}. Bis dahin passt Repwise Dein Training Woche für Woche an.`,
        action: 'training',
        graphic: 'trend',
      })
    }
    if (!hints.length) {
      hints.push({ id: 'willkommen', title: 'Willkommen bei Repwise', text: 'Dein Training passt sich nach jeder Einheit automatisch an. Wisch nach rechts zu Deinem Plan.', action: 'training', graphic: 'trend' })
    }
    return hints
  }, [])
}
