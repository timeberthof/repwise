import { updateSettings, useSettings } from '../../db/settings'
import { Toggle } from '../../components/ui/Toggle'
import { Group, Row, Section, SettingsLayout } from './SettingsLayout'

const SECONDS = [60, 90, 120, 180, 240]

/** Training: Pausentimer nach jedem eingetragenen Satz (an/aus, Dauer). */
export function TrainingSettingsPage() {
  const s = useSettings()
  if (!s) return <SettingsLayout title="Training">{null}</SettingsLayout>
  return (
    <SettingsLayout title="Training">
      <Section title="Pausentimer" hint="Startet nach jedem eingetragenen Satz, mit Ton am Ende. Im Training lässt er sich verlängern oder überspringen.">
        <Group>
          <Row label="Pausentimer" sub="Nach jedem Satz automatisch starten" last>
            <Toggle checked={s.restTimer} onChange={(on) => updateSettings({ restTimer: on })} label="Pausentimer" />
          </Row>
        </Group>
      </Section>
      {s.restTimer && (
        <Section title="Pausendauer">
          <div className="grid grid-cols-5 gap-2">
            {SECONDS.map((sec) => (
              <button key={sec} type="button" onClick={() => updateSettings({ restSec: sec })} className={`h-[44px] rounded-md text-[15px] font-semibold ${s.restSec === sec ? 'bg-fg text-fg-inverse' : 'bg-surface-3 text-fg-2'}`}>
                {sec < 120 ? `${sec} s` : `${sec / 60} min`}
              </button>
            ))}
          </div>
        </Section>
      )}
    </SettingsLayout>
  )
}
