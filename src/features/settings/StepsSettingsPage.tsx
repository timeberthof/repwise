import { updateSettings, useSettings } from '../../db/settings'
import { Toggle } from '../../components/ui/Toggle'
import { StepperField } from '../../components/ui/Stepper'
import { Group, Row, Section, SettingsLayout } from './SettingsLayout'

/** Schritte: Abfrage der Vortagsschritte beim Start, Schrittziel. */
export function StepsSettingsPage() {
  const s = useSettings()
  if (!s) return <SettingsLayout title="Schritte">{null}</SettingsLayout>
  return (
    <SettingsLayout title="Schritte">
      <Section title="Abfrage" hint="Beim ersten Öffnen am Tag fragt Repwise nach den Schritten von gestern, falls sie noch fehlen. Überspringen und Nachtragen geht jederzeit über die Schritte-Kachel.">
        <Group>
          <Row label="Nach Schritten von gestern fragen" last>
            <Toggle checked={s.askSteps} onChange={(askSteps) => updateSettings({ askSteps })} label="Nach Schritten fragen" />
          </Row>
        </Group>
      </Section>
      <Section title="Schrittziel" hint="Erscheint als Ziellinie im Schritte-Diagramm.">
        <div className="rounded-xl bg-surface">
          <StepperField value={s.stepGoal} onChange={(stepGoal) => updateSettings({ stepGoal })} step={500} min={1000} max={40000} digits={0} />
        </div>
      </Section>
    </SettingsLayout>
  )
}
