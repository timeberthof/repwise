import { useEffect, useState } from 'react'
import type { WeekType } from '../../../db/types'
import type { PlanDayWithExercises } from '../../../db/repo/plan'
import { exerciseName, getExercise } from '../../../data/exercises'
import { WEEKDAYS_LONG } from '../../../logic/dates'
import { estimateMinutes } from '../../../logic/planGenerator'
import { PROGRESSION_CONFIG, WEEK_TYPE_INFO } from '../../../logic/progression'
import { WEEK_TYPE_STYLE } from '../../training/weekTypeStyle'
import { IconTile } from '../../../components/ui/IconTile'

/** Drei nacheinander volllaufende Balken wie „Dein Trainingsplan wird optimiert…“ (S26). */
export function PlanProgress({ labels, onDone }: { labels: string[]; onDone: () => void }) {
  const [p, setP] = useState(labels.map(() => 0))
  useEffect(() => {
    let i = 0
    let v = 0
    const t = setInterval(() => {
      v += 4 + Math.random() * 7
      if (v >= 100) {
        setP((old) => old.map((x, j) => (j === i ? 100 : x)))
        i++
        v = 0
        if (i >= labels.length) {
          clearInterval(t)
          setTimeout(onDone, 250)
        }
        return
      }
      setP((old) => old.map((x, j) => (j === i ? Math.round(v) : x)))
    }, 60)
    return () => clearInterval(t)
  }, [labels, onDone])
  return (
    <div className="mt-[160px] flex flex-col gap-[22px]">
      {labels.map((l, i) => (
        <div key={l}>
          <div className="flex justify-between text-[17px]">
            <span>{l}</span>
            <span>{p[i]}%</span>
          </div>
          {p[i] > 0 && <div className="mt-[10px] h-[5px] rounded-full" style={{ width: `${p[i]}%`, background: 'linear-gradient(90deg,#f19a3c,#ef8a3d)' }} />}
        </div>
      ))}
    </div>
  )
}

export function CycleStrip({ overrides = {} }: { overrides?: Record<number, WeekType> }) {
  return (
    <div className="mt-[18px] grid grid-cols-6 gap-[6px]">
      {PROGRESSION_CONFIG.cycle.map((auto, i) => {
        const t = overrides[i] ?? auto
        const s = WEEK_TYPE_STYLE[t]
        return (
          <div key={i} className="flex flex-col items-center gap-[6px] rounded-md bg-surface py-[10px]">
            <IconTile icon={s.icon} color={s.color} bg={s.bg} size={28} />
            <span className="text-[11px] font-semibold">W{i + 1}</span>
            <span className="max-w-full truncate px-0.5 text-[10px] text-fg-2">{t === 'overreaching' ? 'Overr.' : t === 'peak' ? 'Peak' : WEEK_TYPE_INFO[t].label}</span>
          </div>
        )
      })}
    </div>
  )
}

export function PlanSummaryList({ days }: { days: PlanDayWithExercises[] }) {
  const byDay = [0, 1, 2, 3, 4, 5, 6].map((wd) => days.filter((d) => d.weekday === wd))
  return (
    <div className="mt-[22px] flex flex-col gap-[12px]">
      {byDay.map((list, wd) =>
        list.length ? (
          <div key={wd} className="rounded-xl border border-elevated bg-surface px-4 py-[14px]">
            <p className="text-section font-semibold uppercase tracking-[0.06em] text-fg-2">{WEEKDAYS_LONG[wd]}</p>
            {list.map((d) => (
              <div key={d.id} className="mt-2">
                <p className="flex items-baseline justify-between">
                  <span className="text-card font-semibold">{d.name}</span>
                  <span className="text-label text-fg-2">
                    {estimateMinutes(d.exercises)} Min · {d.exercises.length} Übungen
                  </span>
                </p>
                <ul className="mt-1">
                  {d.exercises.map((e) => {
                    const others = (e.variants ?? []).filter((v) => v !== e.exerciseId)
                    return (
                      <li key={e.id} className="py-[3px] text-[14.5px]">
                        <span className="flex justify-between gap-3">
                          <span className="truncate text-fg">
                            {exerciseName(e.exerciseId)}
                            {e.anchor && <span className="ml-1 text-[12px] font-semibold text-amber">ANKER</span>}
                          </span>
                          <span className="shrink-0 text-fg-2">
                            {e.sets} × {e.repMin}–{e.repMax}
                            {getExercise(e.exerciseId)?.einheit === 'sekunden' ? ' s' : d.kind === 'kraft' ? ` · RIR ${e.targetRir}` : ''}
                          </span>
                        </span>
                        {d.kind === 'kraft' && (e.pinned || others.length > 0) && (
                          <span className="block truncate text-[12px] text-fg-3">{e.pinned ? 'fixiert' : `im Wechsel mit ${others.map(exerciseName).join(', ')}`}</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div key={wd} className="flex items-center justify-between rounded-xl bg-surface px-4 py-[12px]">
            <span className="text-section font-semibold uppercase tracking-[0.06em] text-fg-2">{WEEKDAYS_LONG[wd]}</span>
            <span className="text-label text-fg-2">Ruhetag</span>
          </div>
        ),
      )}
    </div>
  )
}
