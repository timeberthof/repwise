import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { SubHeader } from '../../components/layout/PageHeader'
import { Chip } from '../../components/ui/Chip'
import { Icon } from '../../components/icons/Icon'
import { ExerciseGlyph } from '../../components/ui/ExerciseGlyph'
import { db } from '../../db/db'
import { planForDate } from '../../db/repo/plan'
import { prescribeExercise } from '../../db/repo/sessions'
import { setWeekOverride } from '../../db/repo/cycle'
import { getExercise } from '../../data/exercises'
import { muscleLabel } from '../../data/muskeln'
import { autoWeekType, weekTypeFor } from '../../logic/cycle'
import { formatLong } from '../../logic/dates'
import { fmt } from '../../logic/format'
import { estimateMinutes } from '../../logic/planGenerator'
import { WEEK_TYPE_INFO } from '../../logic/progression'
import { WEEK_TYPE_STYLE } from './weekTypeStyle'
import { WeekTypeSheet } from './WeekTypeSheet'

/** Vorschau einer zukünftigen Einheit: geplante Übungen mit voraussichtlichen Gewichten (nichts wird gespeichert). */
export default function PreviewScreen() {
  const { date = '', dayId = '' } = useParams()
  const navigate = useNavigate()
  const [sheet, setSheet] = useState(false)
  const data = useLiveQuery(async () => {
    const day = await db.planDays.get(Number(dayId))
    const plan = await planForDate(date)
    if (!day || !plan) return null
    const wt = weekTypeFor(plan, date)
    const type = day.kind === 'kraft' ? wt.type : 'normal'
    const pes = await db.planExercises.where('planDayId').equals(day.id!).sortBy('order')
    const items = await Promise.all(pes.map(async (pe) => ({ pe, p: await prescribeExercise(pe, date, type) })))
    return { day, plan, wt, type, items }
  }, [date, dayId])

  if (data === undefined) return <div className="h-dvh bg-bg" />
  if (data === null) {
    return (
      <div className="h-dvh bg-bg">
        <SubHeader title="Vorschau" />
        <p className="p-6 text-fg-2">Diese Einheit ist nicht mehr im Plan.</p>
      </div>
    )
  }
  const { day, plan, wt, type, items } = data
  const style = WEEK_TYPE_STYLE[type]
  return (
    <div className="min-h-dvh bg-bg pb-16">
      <SubHeader title={day.name} onBack={() => navigate(-1)} />
      <div className="no-scrollbar flex gap-[10px] overflow-x-auto px-5 pt-[20px]">
        <Chip icon="visibility" tone="#9f9f9f">
          Vorschau
        </Chip>
        {day.kind === 'kraft' && (
          <Chip icon={style.icon} tone={type === 'normal' ? undefined : style.badge} onClick={() => setSheet(true)}>
            {WEEK_TYPE_INFO[type].label}
            {wt.manual ? ' (manuell)' : ''}
          </Chip>
        )}
        <Chip icon="schedule">{estimateMinutes(items.map((x) => ({ sets: x.p.sets, restSec: x.pe.restSec })))} Minuten</Chip>
      </div>
      <p className="mx-5 mt-4 text-[15px] text-fg-2">
        {formatLong(date)} · Woche {(wt.index % plan.cycleWeeks) + 1} von {plan.cycleWeeks}
      </p>
      <div className="mx-5 mt-3 flex gap-3 rounded-lg border border-elevated bg-surface px-4 py-3 text-[14px] leading-snug text-fg-2">
        <Icon name="info" size={20} className="mt-[1px] shrink-0" />
        Voraussichtliche Werte nach der aktuellen Progressionslogik, berechnet aus Deinem bisherigen Verlauf. Sie ändern sich durch kommende Trainings und den Check-in am Trainingstag.
      </div>
      <div className="mt-4 flex flex-col gap-3 px-5">
        {items.map(({ pe, p }) => {
          const ex = getExercise(pe.exerciseId)
          if (!ex) return null
          const bw = ex.gewichtsart === 'koerpergewicht' || ex.gewichtsschritt === 0
          const unit = ex.einheit === 'sekunden' ? 's' : 'Wdh'
          return (
            <div key={pe.id} className="flex items-center gap-[14px] rounded-xl border border-elevated bg-surface px-4 py-[14px]">
              <ExerciseGlyph exercise={ex} size={48} />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] text-fg-2">{muscleLabel(ex.primaer)}</p>
                <p className="text-[17.5px] font-semibold leading-tight">{ex.name}</p>
                <p className="mt-1 text-[15px]">
                  {p.sets} × {p.repMin}–{p.repMax} {unit}
                  {!bw && (p.weight ? ` · ${fmt(p.weight)} kg` : ' · Gewicht offen')}
                  {ex.art === 'kraft' ? <span className="text-fg-2"> · RIR {p.targetRir}</span> : null}
                  {p.isEstimate && <span className="text-fg-2"> (Schätzung)</span>}
                </p>
                {p.notes
                  .filter((n) => n.kind !== 'wochentyp' || n.field === 'sets')
                  .slice(0, 2)
                  .map((n, i) => (
                    <p key={i} className="mt-1 flex items-start gap-1 text-[13px] text-amber">
                      <Icon name="wand" size={14} gradient={['#f3af3d', '#ed774d']} className="mt-[2px] shrink-0" />
                      {n.reason}
                    </p>
                  ))}
              </div>
            </div>
          )
        })}
      </div>
      <WeekTypeSheet
        open={sheet}
        onClose={() => setSheet(false)}
        scope="woche"
        value={wt.type}
        manual={wt.manual}
        autoType={autoWeekType(wt.index, plan.cycleWeeks)}
        onReset={() => setWeekOverride(plan, wt.index, null)}
        onSave={(t) => setWeekOverride(plan, wt.index, t)}
      />
    </div>
  )
}
