import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { SubHeader } from '../../components/layout/PageHeader'
import { Segmented } from '../../components/ui/Segmented'
import { IconTile } from '../../components/ui/IconTile'
import { Icon } from '../../components/icons/Icon'
import { ActionSheet } from '../../components/ui/ActionSheet'
import { ADJUSTMENT_KINDS, adjustmentLog, historyList, type HistoryItem } from '../../db/repo/journal'
import { exerciseName } from '../../data/exercises'
import { formatLong, monthLabel, parseISO, WEEKDAYS_SHORT, weekdayIndex } from '../../logic/dates'
import { fmt } from '../../logic/format'
import { CARDIO_ACTIVITIES } from '../cardio/activities'
import type { AdjustmentKind } from '../../db/types'

/** „Gespeicherte Trainings“: Trainingsverlauf und Anpassungsprotokoll. */
export default function VerlaufPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as 'trainings' | 'anpassungen') ?? 'trainings'
  return (
    <div className="min-h-dvh bg-bg pb-16">
      <SubHeader title="Verlauf" onBack={() => navigate(-1)}>
        <div className="px-4 pb-3">
          <Segmented
            value={tab}
            onChange={(v) => setParams({ tab: v }, { replace: true })}
            options={[
              { id: 'trainings', label: 'Trainings' },
              { id: 'anpassungen', label: 'Anpassungen' },
            ]}
          />
        </div>
      </SubHeader>
      {tab === 'trainings' ? <TrainingList /> : <AdjustmentList />}
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

function AdjustmentList() {
  const navigate = useNavigate()
  const log = useLiveQuery(adjustmentLog, [])
  const [kind, setKind] = useState<AdjustmentKind | 'alle'>('alle')
  const [exercise, setExercise] = useState<string | null>(null)
  const [pick, setPick] = useState(false)
  const exercises = useMemo(() => [...new Set((log ?? []).map((a) => a.exerciseId).filter((x): x is string => !!x))].sort((a, b) => exerciseName(a).localeCompare(exerciseName(b))), [log])
  const kinds = ADJUSTMENT_KINDS.filter((k) => (log ?? []).some((a) => a.kind === k.id))
  const list = (log ?? []).filter((a) => (kind === 'alle' || a.kind === kind) && (!exercise || a.exerciseId === exercise))

  return (
    <div className="pt-3">
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
        <button type="button" onClick={() => setPick(true)} className={`flex h-[36px] shrink-0 items-center gap-2 rounded-md px-3 text-[14.5px] ${exercise ? 'border-2 border-fg bg-surface' : 'bg-surface-3'}`}>
          <Icon name="dumbbell" size={18} />
          {exercise ? exerciseName(exercise) : 'Alle Übungen'}
        </button>
        {[{ id: 'alle' as const, label: 'Alle' }, ...kinds].map((k) => (
          <button key={k.id} type="button" onClick={() => setKind(k.id)} className={`h-[36px] shrink-0 rounded-md px-3 text-[14.5px] ${kind === k.id ? 'bg-fg font-semibold text-fg-inverse' : 'bg-surface-3 text-fg'}`}>
            {k.label}
          </button>
        ))}
      </div>
      <p className="mx-5 mt-3 text-[13px] text-fg-2">
        Jede automatische und manuelle Anpassung mit Datum und Grund · {list.length} {list.length === 1 ? 'Eintrag' : 'Einträge'}
      </p>
      <div className="mt-2 flex flex-col gap-2 px-4">
        {list.map((a) => {
          const k = ADJUSTMENT_KINDS.find((x) => x.id === a.kind)
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => a.sessionId && navigate(`/verlauf/${a.sessionId}`)}
              className="rounded-lg border border-elevated bg-surface px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-fg-2">{formatLong(a.date)}</span>
                <span className="rounded-xs px-[6px] text-[11px] font-semibold uppercase tracking-[0.04em]" style={{ background: k?.auto ? '#3b1d12' : '#2a2a2a', color: k?.auto ? '#f3af3d' : '#cfcfcf' }}>
                  {k?.label ?? a.kind} · {k?.auto ? 'automatisch' : 'manuell'}
                </span>
              </div>
              <p className="mt-1 text-[16px] font-semibold">
                {a.exerciseId && a.field !== 'uebung' ? `${exerciseName(a.exerciseId)}: ` : ''}
                {a.title}
              </p>
              <p className="mt-[2px] text-[14.5px] leading-snug text-fg-2">{a.reason}</p>
            </button>
          )
        })}
        {log && !list.length && <p className="py-8 text-center text-body text-fg-2">Keine Einträge für diesen Filter.</p>}
      </div>
      <ActionSheet
        open={pick}
        onClose={() => setPick(false)}
        title="Übung"
        items={[{ label: 'Alle Übungen', icon: 'list' as const, onClick: () => setExercise(null) }, ...exercises.map((id) => ({ label: exerciseName(id), icon: 'dumbbell' as const, onClick: () => setExercise(id) }))]}
      />
    </div>
  )
}
