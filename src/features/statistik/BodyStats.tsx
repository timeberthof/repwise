import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { db } from '../../db/db'
import { useCalories } from '../../db/derived'
import { useSettings } from '../../db/settings'
import { stepsLastDays } from '../../db/repo/stats'
import { axisLabel } from '../../logic/dates'
import { fmt } from '../../logic/format'
import { Button } from '../../components/ui/Button'
import { WeightSheet } from '../body/WeightSheet'
import { StepsSheet } from '../body/StepsSheet'
import { BodyFatSheet } from '../body/BodyFatSheet'
import { DayBarChart, ValueLineChart } from './charts'
import { Delta, StatCard } from './StatCard'

/** Statistik › Körper (ersetzt „Ernährung“): Gewicht, Körperfett, Schritte, Kalorienbedarf. */
export function BodyStats() {
  const navigate = useNavigate()
  const [sheet, setSheet] = useState<'gewicht' | 'schritte' | 'fett' | null>(null)
  const weights = useLiveQuery(() => db.body.where('kind').equals('weight').sortBy('date'), [])
  const fats = useLiveQuery(() => db.body.where('kind').equals('bodyfat').sortBy('date'), [])
  const steps = useLiveQuery(() => stepsLastDays(7), [])
  const cal = useCalories()
  const settings = useSettings()

  const w = (weights ?? []).slice(-7).map((b) => ({ date: b.date, value: b.value }))
  const f = (fats ?? []).slice(-7).map((b) => ({ date: b.date, value: b.value }))
  const stepValues = (steps ?? []).filter((s) => s.value > 0)
  const avgSteps = stepValues.length ? Math.round(stepValues.reduce((a, b) => a + b.value, 0) / stepValues.length) : null

  return (
    <div className="flex flex-col gap-[14px] px-4 pb-4">
      <StatCard
        title={
          <>
            Körpergewicht <span className="text-fg-2">{w.length ? `${fmt(w[w.length - 1].value, 1)} kg` : ''}</span>
          </>
        }
        sub={`Gewogener Wert · letzte ${w.length || 7} Einträge`}
        right={w.length > 1 ? <Delta value={w[w.length - 1].value - w[0].value} invert /> : undefined}
        onClick={() => setSheet('gewicht')}
      >
        {w.length ? <ValueLineChart points={w} color="#5bbd52" /> : <p className="px-4 pb-4 pt-2 text-body text-fg-2">Noch kein Gewicht eingetragen.</p>}
      </StatCard>

      <StatCard
        title={
          <>
            Körperfettanteil <span className="text-fg-2">{f.length ? `${fmt(f[f.length - 1].value, 1)} %` : ''}</span>
          </>
        }
        sub="Eigene Schätzung · letzte Einträge"
        right={f.length > 1 ? <Delta value={f[f.length - 1].value - f[0].value} unit="%" invert /> : undefined}
        onClick={() => setSheet('fett')}
      >
        {f.length ? <ValueLineChart points={f} color="#5bbd52" unit="%" /> : <p className="px-4 pb-4 pt-2 text-body text-fg-2">Noch kein Wert.</p>}
      </StatCard>

      <StatCard
        title={
          <>
            Schritte <span className="text-fg-2">{avgSteps !== null ? `Ø ${fmt(avgSteps)}` : ''}</span>
          </>
        }
        sub="Schritte pro Tag (von Hand eingetragen) · letzte 7 Tage, Ø nur Tage mit Eintrag"
        onClick={() => setSheet('schritte')}
      >
        <DayBarChart data={(steps ?? []).map((s) => ({ date: s.date, label: axisLabel(s.date), value: s.value }))} color="#613cb0" unit="Schritte" target={settings?.stepGoal} />
        {settings && <p className="px-4 pb-3 text-[12.5px] text-fg-2">Gestrichelt: Schrittziel {fmt(settings.stepGoal)} (Einstellungen → Schritte)</p>}
      </StatCard>

      {cal && (
        <StatCard title="Kalorienbedarf" sub={`Zielkalorien pro Tag · berechnet aus ${fmt(cal.weight, 1)} kg und Deinem Ziel`} onClick={() => navigate('/einstellungen/ziele')}>
          <div className="flex items-end justify-between px-4 pb-4 pt-2">
            <span>
              <span className="text-[30px] font-extrabold">{fmt(cal.target)}</span> <span className="text-body text-fg-2">kcal</span>
            </span>
            <span className="text-right text-label text-fg-2">
              Grundumsatz {fmt(cal.bmr)}
              <br />
              Gesamtumsatz {fmt(cal.tdee)}
            </span>
          </div>
        </StatCard>
      )}

      <Button variant="secondary" icon="add" onClick={() => setSheet('gewicht')}>
        Gewicht eintragen
      </Button>

      <WeightSheet open={sheet === 'gewicht'} onClose={() => setSheet(null)} />
      <StepsSheet open={sheet === 'schritte'} onClose={() => setSheet(null)} />
      <BodyFatSheet open={sheet === 'fett'} onClose={() => setSheet(null)} />
    </div>
  )
}
