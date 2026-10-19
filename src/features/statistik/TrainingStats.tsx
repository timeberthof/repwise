import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { exerciseStats, trainingSummary } from '../../db/repo/stats'
import { STAT_GROUPS, type StatGroup } from '../../data/muskeln'
import { SectionLabel } from '../../components/ui/SectionLabel'
import { useToast } from '../../components/ui/Toast'
import { fmt } from '../../logic/format'
import { ValueLineChart, DayBarChart } from './charts'
import { Delta, Kpi, StatCard } from './StatCard'
import { formatDayMonth } from '../../logic/dates'

export const STRENGTH_HINT = 'Maximalkraft = geschätztes Gewicht für 1 Wiederholung: Gewicht × (1 + (Wdh + RIR) / 30), Durchschnitt aller Arbeitssätze einer Einheit.'

/** Statistik › Training (S07–S13): Kennzahlen + Maximalkraft je Übung, gruppiert nach Muskelbereich. */
export function TrainingStats() {
  const navigate = useNavigate()
  const toast = useToast()
  const stats = useLiveQuery(() => exerciseStats(7), [])
  const summary = useLiveQuery(() => trainingSummary(8), [])
  const [collapsed, setCollapsed] = useState<Partial<Record<StatGroup, boolean>>>({})

  return (
    <div className="flex flex-col pb-4">
      {summary && (
        <>
          <div className="flex gap-2 px-4">
            <Kpi value={summary.total4w} label="Trainings" hint="abgeschlossen, letzte 4 Wochen" />
            <Kpi value={summary.sets4w} label="Sätze" hint="erledigt, letzte 4 Wochen" />
            <Kpi value={`${fmt(Math.round(summary.volume4w / 1000), 0)} t`} label="Volumen" hint="Gewicht × Wdh, letzte 4 Wochen" />
          </div>
          <div className="mt-[14px] px-4">
            <StatCard title="Trainings pro Woche" sub={`Abgeschlossene Krafttrainings je Woche · letzte 8 Wochen${summary.avgMin ? ` · Ø ${summary.avgMin} Min pro Einheit` : ''}`}>
              <DayBarChart data={summary.perWeek.map((w) => ({ date: w.date, label: ['', ''], value: w.value }))} color="#ed774d" unit="Trainings" weekLabels />
            </StatCard>
          </div>
        </>
      )}

      <button type="button" onClick={() => toast('Maximalkraft', STRENGTH_HINT)} className="mx-5 mt-[18px] text-left text-[13.5px] leading-snug text-fg-2">
        ⓘ {STRENGTH_HINT}
      </button>

      {STAT_GROUPS.map((g) => {
        const list = (stats ?? []).filter((s) => s.group === g.id)
        if (!list.length) return null
        const isCollapsed = collapsed[g.id]
        return (
          <section key={g.id} className="mt-[26px]">
            <SectionLabel chevron onClick={() => setCollapsed({ ...collapsed, [g.id]: !isCollapsed })}>
              {g.label}
            </SectionLabel>
            {!isCollapsed && (
              <div className="mt-[11px] flex flex-col gap-[14px] px-4">
                {list.map((s) => (
                  <StatCard
                    key={s.exerciseId}
                    title={s.name}
                    sub={`Ø Maximalkraft · letzte ${s.points.length} ${s.points.length === 1 ? 'Training' : 'Trainings'}`}
                    right={s.points.length > 1 ? <Delta value={s.delta} /> : undefined}
                    onClick={() => navigate(`/statistik/uebung/${s.exerciseId}`)}
                  >
                    <ValueLineChart points={s.points} />
                  </StatCard>
                ))}
              </div>
            )}
          </section>
        )
      })}
      {stats && !stats.length && <p className="px-5 pt-8 text-center text-body text-fg-2">Noch keine Trainingswerte – nach dem ersten Training erscheinen hier Deine Verläufe.</p>}
      <p className="mt-6 px-5 text-center text-[12.5px] text-fg-3">Werte bis {stats?.[0] ? formatDayMonth(stats[0].lastDate) : '–'}</p>
    </div>
  )
}
