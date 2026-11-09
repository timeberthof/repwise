import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { SubHeader } from '../../components/layout/PageHeader'
import { IconTile } from '../../components/ui/IconTile'
import { Icon } from '../../components/icons/Icon'
import { historyList, type HistoryItem } from '../../db/repo/journal'
import { monthLabel, parseISO, WEEKDAYS_SHORT, weekdayIndex } from '../../logic/dates'
import { fmt } from '../../logic/format'
import { CARDIO_ACTIVITIES } from '../cardio/activities'

/** „Gespeicherte Trainings“: alle abgeschlossenen Trainings und Cardio-Einheiten. */
export default function VerlaufPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-dvh bg-bg pb-16">
      <SubHeader title="Verlauf" onBack={() => navigate(-1)} />
      <TrainingList />
    </div>
  )
}

function TrainingList() {
  const navigate = useNavigate()
  const items = useLiveQuery(historyList, [])
  const groups = useMemo(() => {
    const m = new Map<string, HistoryItem[]>()
    for (const it of items ?? []) {
      const k = monthLabel(it.date)
      m.set(k, [...(m.get(k) ?? []), it])
    }
    return [...m.entries()]
  }, [items])
  if (items && !items.length) return <p className="px-6 pt-10 text-center text-body text-fg-2">Noch keine Trainings abgeschlossen.</p>
  return (
    <div className="px-4 pt-4">
      {groups.map(([month, list]) => {
        const trainings = list.filter((x) => x.type === 'training').length
        return (
          <section key={month} className="mb-5">
            <p className="mb-2 px-1 text-section font-semibold uppercase tracking-[0.06em] text-fg-2">
              {month} · {trainings} {trainings === 1 ? 'Training' : 'Trainings'}
            </p>
            <div className="flex flex-col gap-2">
              {list.map((it) => {
                const d = parseISO(it.date)
                const dayLabel = `${WEEKDAYS_SHORT[weekdayIndex(it.date)]} ${d.getDate()}.`
                if (it.type === 'cardio') {
                  const a = CARDIO_ACTIVITIES.find((x) => x.id === it.entry.activity)!
                  return (
                    <button key={`c${it.entry.id}`} type="button" onClick={() => navigate(`/cardio/${it.entry.id}`)} className="flex items-center gap-3 rounded-xl border border-elevated bg-surface px-4 py-3 text-left active:opacity-80">
                      <span className="w-[46px] shrink-0 text-[14px] text-fg-2">{dayLabel}</span>
                      <IconTile icon={a.icon} color="#673ab7" bg="#1a0f2e" size={28} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[16.5px] font-semibold">{it.entry.activityText || a.label}</span>
                        <span className="block text-[13.5px] text-fg-2">
                          {it.entry.durationMin} Min{it.entry.distanceKm ? ` · ${fmt(it.entry.distanceKm, 2)} km` : ''}
                          {it.entry.avgHr ? ` · Ø ${it.entry.avgHr} bpm` : ''}
                        </span>
                      </span>
                      <Icon name="chevronRight" size={20} className="text-fg-2" />
                    </button>
                  )
                }
                const s = it.session
                return (
                  <button key={`s${s.id}`} type="button" onClick={() => navigate(`/verlauf/${s.id}`)} className="flex items-center gap-3 rounded-xl border border-elevated bg-surface px-4 py-3 text-left active:opacity-80">
                    <span className="w-[46px] shrink-0 text-[14px] text-fg-2">{dayLabel}</span>
                    <IconTile icon={s.kind === 'mobility' ? 'mobility' : 'dumbbell'} color={s.kind === 'mobility' ? '#2020f5' : '#ed774d'} bg={s.kind === 'mobility' ? '#08083d' : '#3b1d12'} size={28} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16.5px] font-semibold">{s.name}</span>
                      <span className="block truncate text-[13.5px] text-fg-2">
                        {s.imported
                          ? 'aus bisheriger App übernommen'
                          : `${it.minutes ? `${it.minutes} Min · ` : ''}${it.exercises} Übungen · ${it.sets} Sätze${it.volume ? ` · ${fmt(it.volume)} kg` : ''}`}
                      </span>
                    </span>
                    <Icon name="chevronRight" size={20} className="text-fg-2" />
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
