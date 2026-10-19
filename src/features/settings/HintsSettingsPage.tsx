import { updateSettings, useSettings, type AppSettings } from '../../db/settings'
import { Toggle } from '../../components/ui/Toggle'
import { Group, Row, Section, SettingsLayout } from './SettingsLayout'

const HINTS: { id: keyof AppSettings['hints']; label: string; sub: string }[] = [
  { id: 'zyklus', label: 'Zyklus beenden', sub: 'In der letzten Woche des Mesozyklus: nächsten Zyklus planen' },
  { id: 'schritte', label: 'Schritte von gestern', sub: 'Erinnerung, solange die Schritte von gestern fehlen' },
  { id: 'gewicht', label: 'Weigh-In', sub: 'Erinnerung, das heutige Gewicht einzutragen' },
  { id: 'backup', label: 'Backup', sub: 'Erinnerung, wenn das letzte Backup zu lange her ist' },
  { id: 'training', label: 'Zyklus-Info', sub: 'Wann der nächste Zyklus beginnt' },
]

/** Hinweise: nur In-App-Hinweise (Karussell auf dem Dashboard), einzeln schaltbar. */
export function HintsSettingsPage() {
  const s = useSettings()
  if (!s) return <SettingsLayout title="Hinweise">{null}</SettingsLayout>
  return (
    <SettingsLayout title="Hinweise">
      <Section title="Hinweise im Dashboard" hint="Repwise verschickt keine Push-Benachrichtigungen. Hinweise erscheinen nur in der App im Bereich „Willkommen zurück“.">
        <Group>
          {HINTS.map((h, i) => (
            <Row key={h.id} label={h.label} sub={h.sub} last={i === HINTS.length - 1}>
              <Toggle checked={s.hints[h.id]} onChange={(on) => updateSettings({ hints: { ...s.hints, [h.id]: on } })} label={h.label} />
            </Row>
          ))}
        </Group>
      </Section>
      <Section title="Backup-Erinnerung">
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <button key={d} type="button" onClick={() => updateSettings({ backupDays: d })} className={`h-[44px] flex-1 rounded-md text-[15px] font-semibold ${s.backupDays === d ? 'bg-fg text-fg-inverse' : 'bg-surface-3 text-fg-2'}`}>
              nach {d} Tagen
            </button>
          ))}
        </div>
      </Section>
    </SettingsLayout>
  )
}
