import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { useProfile } from '../../db/hooks'
import { useCalories } from '../../db/derived'
import { BodyDataEditor } from '../flow/steps/BodySteps'
import { WeightSheet } from '../body/WeightSheet'
import { BodyFatSheet } from '../body/BodyFatSheet'
import { Button } from '../../components/ui/Button'
import { ConfirmSheet } from '../../components/ui/ConfirmSheet'
import { Icon } from '../../components/icons/Icon'
import { formatLong } from '../../logic/dates'
import { fmt } from '../../logic/format'
import type { BodyEntry } from '../../db/types'
import { Group, Row, Section, SettingsLayout } from './SettingsLayout'

/** Profil: Geburtsdatum, Geschlecht, Größe, Gewicht mit Verlauf. Kalorien werden live neu berechnet. */
export function ProfilePage() {
  const profile = useProfile()
  const cal = useCalories()
  const weights = useLiveQuery(() => db.body.where('kind').equals('weight').reverse().sortBy('date'), [])
  const fats = useLiveQuery(() => db.body.where('kind').equals('bodyfat').reverse().sortBy('date'), [])
  const [sheet, setSheet] = useState<'gewicht' | 'fett' | null>(null)
  const [del, setDel] = useState<BodyEntry | null>(null)
  const [all, setAll] = useState(false)
  if (!profile) return <SettingsLayout title="Profil">{null}</SettingsLayout>
  const current = weights?.[0]?.value ?? 80

  return (
    <SettingsLayout title="Profil">
      <div className="px-4">
        <BodyDataEditor
          sex={profile.sex}
          birthDate={profile.birthDate}
          heightCm={profile.heightCm}
          weight={current}
          onWeightClick={() => setSheet('gewicht')}
          onChange={async (p) => {
            await db.profile.update('me', { ...(p.sex ? { sex: p.sex } : {}), ...(p.birthDate ? { birthDate: p.birthDate } : {}), ...(p.heightCm ? { heightCm: p.heightCm } : {}) })
          }}
        />
      </div>
      {cal && (
        <Section title="Kalorienbedarf" hint="Wird automatisch neu berechnet, sobald sich Gewicht, Größe, Alter, Ziel oder Aktivität ändern.">
          <Group>
            <Row label="Zielkalorien" sub={`Grundumsatz ${fmt(cal.bmr)} · Gesamtumsatz ${fmt(cal.tdee)} kcal`}>
              <span className="text-[18px] font-bold">{fmt(cal.target)} kcal</span>
            </Row>
          </Group>
        </Section>
      )}

      <Section title="Gewicht">
        <Group>
          {(all ? weights : weights?.slice(0, 8))?.map((w, i, arr) => (
            <Row key={w.id} label={`${fmt(w.value, 1)} kg`} sub={`${formatLong(w.date)}${w.source === 'mci' ? ' · aus bisheriger App' : ''}`} last={i === arr.length - 1}>
              {i < arr.length - 1 && <span className="text-[13px] text-fg-2">{w.value - arr[i + 1].value === 0 ? '±0' : `${w.value - arr[i + 1].value > 0 ? '+' : '−'}${fmt(Math.abs(w.value - arr[i + 1].value), 1)}`}</span>}
              <button type="button" aria-label="Eintrag löschen" onClick={() => setDel(w)} className="p-1 text-fg-2">
                <Icon name="delete" size={20} />
              </button>
            </Row>
          ))}
        </Group>
        {(weights?.length ?? 0) > 8 && (
          <button type="button" onClick={() => setAll(!all)} className="mt-2 w-full text-center text-[14px] font-semibold text-amber">
            {all ? 'Weniger anzeigen' : `Alle ${weights!.length} Einträge`}
          </button>
        )}
        <div className="mt-3">
          <Button variant="secondary" icon="add" onClick={() => setSheet('gewicht')}>
            Gewicht eintragen
          </Button>
        </div>
      </Section>

      <Section title="Körperfettanteil">
        <Group>
          {fats?.slice(0, 5).map((f, i, arr) => (
            <Row key={f.id} label={`${fmt(f.value, 1)} %`} sub={formatLong(f.date)} last={i === arr.length - 1}>
              <button type="button" aria-label="Eintrag löschen" onClick={() => setDel(f)} className="p-1 text-fg-2">
                <Icon name="delete" size={20} />
              </button>
            </Row>
          ))}
          <Row label="Neuen Wert eintragen" onClick={() => setSheet('fett')} last>
            <Icon name="add" size={22} />
          </Row>
        </Group>
      </Section>

      <WeightSheet open={sheet === 'gewicht'} onClose={() => setSheet(null)} />
      <BodyFatSheet open={sheet === 'fett'} onClose={() => setSheet(null)} />
      <ConfirmSheet
        open={!!del}
        onClose={() => setDel(null)}
        title="Eintrag löschen?"
        text={del ? `${fmt(del.value, 1)} ${del.kind === 'weight' ? 'kg' : '%'} vom ${formatLong(del.date)} wird gelöscht.` : ''}
        confirmLabel="Löschen"
        onConfirm={() => del?.id && db.body.delete(del.id)}
      />
    </SettingsLayout>
  )
}
