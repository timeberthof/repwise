import { updateSettings, useSettings } from '../../db/settings'
import { Toggle } from '../../components/ui/Toggle'
import { Group, Row, Section, SettingsLayout } from './SettingsLayout'

/** Hinweise: nur In-App-Hinweise (Karussell auf dem Dashboard). Der wöchentliche Check-in erscheint immer. */
export function HintsSettingsPage() {
  const s = useSettings()
  if (!s) return <SettingsLayout title="Hinweise">{null}</SettingsLayout>
  return (
    <SettingsLayout title="Hinweise">
      <Section title="Hinweise im Dashboard" hint="Repwise verschickt keine Push-Benachrichtigungen. Hinweise erscheinen nur in der App im Bereich „Willkommen zurück“. Der wöchentliche Check-in erscheint beim Öffnen der App.">
        <Group>
          <Row label="Backup" sub="Erinnerung, wenn das letzte Backup zu lange her ist" last>
            <Toggle checked={s.hints.backup} onChange={(on) => updateSettings({ hints: { ...s.hints, backup: on } })} label="Backup" />
          </Row>
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
