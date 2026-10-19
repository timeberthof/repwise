import { useEffect, useState } from 'react'
import { db } from '../../db/db'
import { useProfile } from '../../db/hooks'
import { ageOn } from '../../logic/dates'
import { defaultZoneBounds, hrMax, ZONES, type ZoneNumber } from '../../logic/heartRate'
import { Toggle } from '../../components/ui/Toggle'
import { StepperField } from '../../components/ui/Stepper'
import { Button } from '../../components/ui/Button'
import { Group, Row, Section, SettingsLayout } from './SettingsLayout'

/** Cardio: maximale Herzfrequenz, Zonengrenzen, Standard-Zielzone. */
export function CardioSettingsPage() {
  const profile = useProfile()
  const [bounds, setBounds] = useState<number[] | null>(null)
  useEffect(() => {
    if (profile && !bounds) setBounds(profile.hrZones ?? null)
  }, [profile, bounds])
  if (!profile) return <SettingsLayout title="Cardio">{null}</SettingsLayout>
  const age = ageOn(profile.birthDate)
  const auto = hrMax(age)
  const max = hrMax(age, profile.hrMaxOverride)
  const custom = !!profile.hrZones
  const shown = bounds ?? defaultZoneBounds(max)

  const setBound = (i: number, v: number) => {
    const next = [...shown]
    next[i] = v
    // Grenzen aufsteigend halten
    for (let j = i + 1; j < next.length; j++) if (next[j] <= next[j - 1]) next[j] = next[j - 1] + 1
    for (let j = i - 1; j >= 0; j--) if (next[j] >= next[j + 1]) next[j] = next[j + 1] - 1
    setBounds(next)
  }

  return (
    <SettingsLayout title="Cardio">
      <Section title="Maximale Herzfrequenz" hint={`Automatisch nach Tanaka: 208 − 0,7 × Alter (${age} Jahre) = ${auto} bpm. Kennst Du Deinen echten Maximalpuls (z. B. aus der Garmin), trag ihn ein.`}>
        <Group>
          <Row label="Eigener Maximalpuls" last>
            <Toggle checked={!!profile.hrMaxOverride} onChange={(on) => db.profile.update('me', { hrMaxOverride: on ? auto : undefined, hrZones: undefined }).then(() => setBounds(null))} label="Eigener Maximalpuls" />
          </Row>
        </Group>
        {profile.hrMaxOverride && (
          <div className="mt-2 rounded-xl bg-surface">
            <StepperField value={profile.hrMaxOverride} onChange={(v) => db.profile.update('me', { hrMaxOverride: v, hrZones: undefined }).then(() => setBounds(null))} min={140} max={230} digits={0} suffix="bpm" />
          </div>
        )}
      </Section>

      <Section title="Standard-Zielzone" hint="Diese Zone schlägt Repwise beim Cardio-Eintrag vor (änderbar je Einheit).">
        <div className="grid grid-cols-5 gap-2">
          {ZONES.map((z) => (
            <button key={z.zone} type="button" onClick={() => db.profile.update('me', { cardioZone: z.zone as ZoneNumber })} className={`h-[44px] rounded-md text-[16px] font-semibold ${profile.cardioZone === z.zone ? 'bg-[#8a5ad6] text-white' : 'bg-surface-3 text-fg-2'}`}>
              Z{z.zone}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Zonengrenzen" hint={custom ? 'Eigene Grenzen aktiv.' : 'Standard: Prozent der maximalen Herzfrequenz (50/60/70/80/90 %). Tippe auf − / + für eigene Grenzen.'}>
        <Group>
          {ZONES.map((z, i) => (
            <Row key={z.zone} label={`${z.label} · ${z.name}`} sub={`${shown[i]}–${shown[i + 1]} bpm`} last={i === ZONES.length - 1}>
              <span className="flex items-center gap-1">
                <button type="button" aria-label="Untergrenze senken" onClick={() => setBound(i, shown[i] - 1)} className="h-9 w-9 rounded-md bg-surface-3 text-[18px]">
                  −
                </button>
                <span className="w-[38px] text-center text-[15px]">{shown[i]}</span>
                <button type="button" aria-label="Untergrenze erhöhen" onClick={() => setBound(i, shown[i] + 1)} className="h-9 w-9 rounded-md bg-surface-3 text-[18px]">
                  +
                </button>
              </span>
            </Row>
          ))}
        </Group>
        <div className="mt-3 flex gap-3">
          {(custom || bounds) && (
            <Button
              variant="secondary"
              onClick={async () => {
                await db.profile.update('me', { hrZones: undefined })
                setBounds(null)
              }}
            >
              Standard
            </Button>
          )}
          {bounds && JSON.stringify(bounds) !== JSON.stringify(profile.hrZones ?? null) && <Button onClick={() => db.profile.update('me', { hrZones: bounds })}>Grenzen speichern</Button>}
        </div>
      </Section>
    </SettingsLayout>
  )
}
